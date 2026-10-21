import { AnimatedSprite, Container, Graphics, Sprite, Text } from 'pixi.js';
import type { PixiOpal } from 'opal-sprites/pixi';
import { COLS, ROWS, SYM } from '../engine/types';
import type { ArtSet } from './art';
import type { HeroLibrary } from './heroes';

export interface Pace {
  fall: number;
  stagger: number;
  pop: number;
  anticipate: number;
  hold: number;
}

interface Cell {
  root: Container;
  sprite: Sprite;
  badge: Graphics;
  mult: Text;
  ring: Graphics;
  anim: AnimatedSprite | null;
  clipKey: string;
  col: number;
  row: number;
  symbol: number;
  value: number;
}

/**
 * 6×5 grid. Cells stay index-aligned (column * 5 + row, row 0 at the top)
 * so a tumble can move art without losing track of the engine's mask.
 */
export class Board {
  readonly root = new Container();
  private readonly plate = new Graphics();
  private readonly glow = new Graphics();
  private readonly cellsRoot = new Container();
  private readonly maskG = new Graphics();
  private readonly cells: Cell[] = [];
  private cell = 96;
  private token = 0;
  private jobs: (() => boolean)[] = [];
  private pumping = false;
  filled = false;
  anticipating = false;

  constructor(
    private readonly art: ArtSet,
    private readonly heroes: HeroLibrary,
  ) {
    this.root.addChild(this.plate);
    this.root.addChild(this.maskG);
    this.root.addChild(this.cellsRoot);
    this.cellsRoot.mask = this.maskG;
    this.cellsRoot.addChild(this.glow);
    for (let col = 0; col < COLS; col++) {
      for (let row = 0; row < ROWS; row++) {
        const root = new Container();
        const sprite = new Sprite(art.symbols[0]);
        sprite.anchor.set(0.5);
        const mult = new Text({
          text: '',
          style: {
            fill: '#fff6d2',
            fontFamily: 'Palatino Linotype, Palatino, Georgia, serif',
            fontSize: 28,
            fontWeight: '800',
            stroke: { color: '#04141c', width: 4 },
            align: 'center',
          },
        });
        mult.anchor.set(0.5);
        const badge = new Graphics();
        badge.visible = false;
        const ring = new Graphics();
        ring.alpha = 0;
        root.addChild(sprite);
        root.addChild(ring);
        root.addChild(badge);
        root.addChild(mult);
        this.cellsRoot.addChild(root);
        this.cells.push({
          root,
          sprite,
          badge,
          mult,
          ring,
          anim: null,
          clipKey: '',
          col,
          row,
          symbol: 0,
          value: 0,
        });
      }
    }
  }

  layout(cell: number): void {
    this.cell = cell;
    const w = cell * COLS;
    const h = cell * ROWS;
    const plate = this.plate;
    plate.clear();
    plate.roundRect(-16, -16, w + 32, h + 32, 26).fill({ color: 0x021016, alpha: 0.55 });
    plate.roundRect(-16, -16, w + 32, h + 32, 26).stroke({ color: 0x7ef6ff, width: 2, alpha: 0.9 });
    plate.roundRect(-8, -8, w + 16, h + 16, 18).stroke({ color: 0xff4fa3, width: 1.5, alpha: 0.55 });
    for (let col = 0; col < COLS; col++) {
      for (let row = 0; row < ROWS; row++) {
        const alt = (col + row) % 2 === 0;
        plate
          .roundRect(col * cell + 4, row * cell + 4, cell - 8, cell - 8, 12)
          .fill({ color: alt ? 0x0b3038 : 0x071e26, alpha: 0.92 });
      }
    }
    this.maskG.clear();
    this.maskG.rect(-4, -6, w + 8, h + 10).fill(0xffffff);
    this.glow.clear();
    this.glow.roundRect(-6, -6, w + 12, h + 12, 18).stroke({ width: 7, color: 0xff4fa3, alpha: 1 });
    this.glow.alpha = 0;
    for (const cellView of this.cells) {
      this.fit(cellView);
      cellView.root.position.set(this.x(cellView.col), this.y(cellView.row));
    }
  }

  update(time: number): void {
    this.glow.alpha = this.anticipating ? 0.25 + Math.sin(time * 16) * 0.35 : 0;
  }

  show(symbols: number[], mults: number[]): void {
    this.token++;
    this.filled = true;
    this.anticipating = false;
    this.glow.alpha = 0;
    for (let i = 0; i < this.cells.length; i++) {
      const cell = this.cells[i];
      this.paint(cell, symbols[i] ?? 0, mults[i] ?? 0);
      cell.root.position.set(this.x(cell.col), this.y(cell.row));
      cell.root.alpha = 1;
      cell.root.scale.set(1);
      cell.ring.alpha = 0;
    }
  }

  holdWin(mask: number): void {
    for (const cell of this.cells) {
      const on = (mask & (1 << this.index(cell))) !== 0;
      cell.root.scale.set(on ? 1.12 : 1);
      cell.ring.alpha = on ? 0.95 : 0;
    }
  }

  /** Play the seal crack. Returns grid indexes so the scene can add the bubble wave. */
  crackSeals(): number[] {
    const hit: number[] = [];
    const seal = this.heroes.clips.get('vault-seal');
    for (const cell of this.cells) {
      if (cell.symbol !== SYM.SCATTER) continue;
      hit.push(this.index(cell));
      if (seal?.clips.crack) {
        this.setClip(cell, seal, 'crack');
        cell.sprite.visible = false;
        const anim = cell.anim;
        if (anim) {
          anim.loop = false;
          anim.onComplete = () => {
            if (cell.symbol === SYM.SCATTER && seal.clips.idle) this.setClip(cell, seal, 'idle');
          };
        }
      } else {
        cell.sprite.texture = this.art.sealCrack;
        cell.sprite.visible = true;
      }
    }
    return hit;
  }

  skip(): void {
    this.token++;
    this.anticipating = false;
  }

  repaint(): void {
    for (const cell of this.cells) this.paint(cell, cell.symbol, cell.value);
  }

  center(index: number): { x: number; y: number } {
    const cell = this.cells[index];
    return { x: cell.root.x, y: cell.root.y };
  }

  globalCenter(index: number): { x: number; y: number } {
    const point = this.cells[index].root.getGlobalPosition();
    return { x: point.x, y: point.y };
  }

  async dropIn(
    symbols: number[],
    mults: number[],
    pace: Pace,
    onColumn: (column: number, seals: number) => void,
  ): Promise<boolean> {
    const token = this.token;
    if (this.filled) {
      const jobs = this.cells.map((cell) =>
        this.slideY(cell.root, cell.root.y, cell.root.y + this.cell * 7, pace.fall * 0.45, token, false),
      );
      const cleared = await Promise.all(jobs);
      if (!cleared.every(Boolean) || token !== this.token) return false;
    }
    this.filled = true;
    let seals = 0;
    for (let col = 0; col < COLS; col++) {
      if (token !== this.token) return false;
      if (seals >= 2) {
        this.anticipating = true;
        const waited = await this.wait(pace.anticipate, token);
        if (!waited) return false;
      }
      const falls: Promise<boolean>[] = [];
      for (let row = 0; row < ROWS; row++) {
        const cell = this.cells[col * ROWS + row];
        this.paint(cell, symbols[cell.col * ROWS + cell.row] ?? symbols[col * ROWS + row], mults[col * ROWS + row] ?? 0);
        cell.root.alpha = 1;
        cell.root.scale.set(1);
        cell.ring.alpha = 0;
        const target = this.y(row);
        cell.root.position.set(this.x(col), target - this.cell * (ROWS - row + 1));
        falls.push(this.slideY(cell.root, cell.root.y, target, pace.fall + row * 28, token, true));
      }
      const landed = await Promise.all(falls);
      if (!landed.every(Boolean) || token !== this.token) return false;
      for (let row = 0; row < ROWS; row++) {
        if (symbols[col * ROWS + row] === SYM.SCATTER) seals++;
      }
      onColumn(col, seals);
    }
    this.anticipating = false;
    return true;
  }

  async punch(mask: number, pace: Pace): Promise<boolean> {
    const token = this.token;
    const started = performance.now();
    return new Promise((resolve) => {
      const step = () => {
        if (token !== this.token) {
          resolve(false);
          return;
        }
        const t = Math.min(1, (performance.now() - started) / pace.pop);
        const scale = 1 + Math.sin(t * Math.PI) * 0.28;
        for (const cell of this.cells) {
          const on = (mask & (1 << this.index(cell))) !== 0;
          cell.root.scale.set(on ? scale : 1);
          cell.ring.alpha = on ? Math.sin(t * Math.PI) : 0;
        }
        if (t >= 1) resolve(true);
        else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  async dissolve(mask: number, pace: Pace, burst: (x: number, y: number) => void): Promise<boolean> {
    const token = this.token;
    for (const cell of this.cells) {
      if ((mask & (1 << this.index(cell))) !== 0) burst(cell.root.x, cell.root.y);
    }
    const started = performance.now();
    return new Promise((resolve) => {
      const step = () => {
        if (token !== this.token) {
          resolve(false);
          return;
        }
        const t = Math.min(1, (performance.now() - started) / (pace.pop * 1.15));
        for (const cell of this.cells) {
          if ((mask & (1 << this.index(cell))) === 0) continue;
          const fade = 1 - t;
          cell.root.alpha = fade;
          cell.root.scale.set(1 - t * 0.45);
        }
        if (t >= 1) resolve(true);
        else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  /**
   * Survivors pack to the bottom of each column, matching the engine.
   * New symbols drop into the holes from above.
   */
  async collapse(nextSymbols: number[], nextMults: number[], mask: number, pace: Pace): Promise<boolean> {
    const token = this.token;
    const fromY = this.cells.map((cell) => cell.root.y);
    const fromSymbol = this.cells.map((cell) => cell.symbol);
    const fromValue = this.cells.map((cell) => cell.value);
    const plans: { index: number; symbol: number; value: number; from: number; to: number }[] = [];
    for (let col = 0; col < COLS; col++) {
      const survivors: number[] = [];
      for (let row = ROWS - 1; row >= 0; row--) {
        if ((mask & (1 << (col * ROWS + row))) === 0) survivors.push(row);
      }
      survivors.forEach((oldRow, i) => {
        const newRow = ROWS - 1 - i;
        const src = col * ROWS + oldRow;
        const dst = col * ROWS + newRow;
        plans.push({
          index: dst,
          symbol: fromSymbol[src],
          value: fromValue[src],
          from: fromY[src],
          to: this.y(newRow),
        });
      });
      const holes = ROWS - survivors.length;
      for (let row = 0; row < holes; row++) {
        const dst = col * ROWS + row;
        plans.push({
          index: dst,
          symbol: nextSymbols[dst] ?? 0,
          value: nextMults[dst] ?? 0,
          from: this.y(0) - (holes - row) * this.cell,
          to: this.y(row),
        });
      }
    }
    for (const plan of plans) {
      const cell = this.cells[plan.index];
      this.paint(cell, plan.symbol, plan.value);
      cell.root.alpha = 1;
      cell.root.scale.set(1);
      cell.ring.alpha = 0;
      cell.root.position.set(this.x(cell.col), plan.from);
    }
    const moved = await Promise.all(
      plans.map((plan) => this.slideY(this.cells[plan.index].root, plan.from, plan.to, pace.fall * 0.85, token, true)),
    );
    return moved.every(Boolean) && token === this.token;
  }

  private index(cell: Cell): number {
    return cell.col * ROWS + cell.row;
  }

  private x(col: number): number {
    return col * this.cell + this.cell / 2;
  }

  private y(row: number): number {
    return row * this.cell + this.cell / 2;
  }

  private paint(cell: Cell, symbol: number, value: number): void {
    cell.symbol = symbol;
    cell.value = value;
    const jelly = this.heroes.clips.get('jellyfish');
    const seal = this.heroes.clips.get('vault-seal');
    const jellyClip = value >= 10 && jelly?.clips.pulse ? 'pulse' : 'float';
    const clip = symbol === SYM.JELLY ? jelly : symbol === SYM.SCATTER ? seal : null;
    const clipName = symbol === SYM.JELLY ? jellyClip : 'idle';
    this.setClip(cell, clip && clip.clips[clipName] ? clip : null, clipName);
    cell.sprite.texture = this.art.symbols[symbol] ?? this.art.symbols[0];
    cell.sprite.visible = !cell.anim;
    cell.mult.visible = symbol === SYM.JELLY && value > 0;
    cell.mult.text = value > 0 ? `${value}×` : '';
    this.fit(cell);
  }

  private setClip(cell: Cell, asset: PixiOpal | null, name: string): void {
    const key = asset ? `${cell.symbol}:${name}` : '';
    if (cell.anim && cell.clipKey === key && key) return;
    if (cell.anim) {
      cell.anim.destroy();
      cell.anim = null;
      cell.clipKey = '';
    }
    if (!asset || !key) return;
    const anchor = name === 'float' || name === 'pulse' || name === 'burst' ? { x: 0.5, y: 0.42 } : { x: 0.5, y: 0.5 };
    const anim = asset.sprite(name, { anchor });
    cell.root.addChildAt(anim, 1);
    cell.anim = anim;
    cell.clipKey = key;
    this.fit(cell);
  }

  private fit(cell: Cell): void {
    const size = this.cell * 0.78;
    cell.sprite.width = size;
    cell.sprite.height = size;
    if (cell.anim) {
      cell.anim.width = size;
      cell.anim.scale.y = Math.abs(cell.anim.scale.x);
    }
    const font = Math.max(13, Math.round(this.cell * 0.22));
    cell.mult.style.fontSize = font;
    cell.mult.y = this.cell * 0.3;
    const bw = Math.max(28, this.cell * 0.46);
    const bh = Math.max(16, this.cell * 0.22);
    cell.badge.clear();
    cell.badge.roundRect(-bw / 2, -bh / 2, bw, bh, bh / 2).fill({ color: 0x04141c, alpha: 0.88 });
    cell.badge.roundRect(-bw / 2, -bh / 2, bw, bh, bh / 2).stroke({ width: 2, color: 0xff4fa3, alpha: 0.95 });
    cell.badge.position.set(0, cell.mult.y);
    cell.badge.visible = cell.mult.visible;
    cell.ring.clear();
    cell.ring.circle(0, 0, this.cell * 0.4).stroke({ width: Math.max(2, this.cell * 0.035), color: 0xb8fff4, alpha: 1 });
  }

  private wait(ms: number, token: number): Promise<boolean> {
    return new Promise((resolve) => {
      const started = performance.now();
      this.jobs.push(() => {
        if (token !== this.token) {
          resolve(false);
          return false;
        }
        if (performance.now() - started >= ms) {
          resolve(true);
          return false;
        }
        return true;
      });
      this.pump();
    });
  }

  private slideY(node: Container, from: number, to: number, ms: number, token: number, bounce: boolean): Promise<boolean> {
    node.y = from;
    const started = performance.now();
    return new Promise((resolve) => {
      this.jobs.push(() => {
        if (token !== this.token) {
          resolve(false);
          return false;
        }
        const t = Math.min(1, (performance.now() - started) / Math.max(40, ms));
        const eased = bounce ? fallEase(t) : t * t;
        node.y = from + (to - from) * eased;
        if (t >= 1) {
          node.y = to;
          resolve(true);
          return false;
        }
        return true;
      });
      this.pump();
    });
  }

  /** One frame callback drives every drop, so a tumble does not schedule dozens of loops. */
  private pump(): void {
    if (this.pumping) return;
    this.pumping = true;
    const step = () => {
      this.jobs = this.jobs.filter((job) => job());
      if (this.jobs.length > 0) requestAnimationFrame(step);
      else this.pumping = false;
    };
    requestAnimationFrame(step);
  }
}

function fallEase(t: number): number {
  if (t < 0.82) {
    const u = t / 0.82;
    return u * u;
  }
  const u = (t - 0.82) / 0.18;
  return 1 + Math.sin(u * Math.PI) * 0.045 * (1 - u);
}
