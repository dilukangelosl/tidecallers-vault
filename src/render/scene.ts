import { AnimatedSprite, Container, Graphics, Rectangle, Sprite, Text, type Application, type Filter } from 'pixi.js';
import type { PixiOpal } from 'opal-sprites/pixi';
import { COLS, ROWS, TIDE_THRONE, tideStage } from '../engine/types';
import type { ArtSet } from './art';
import { Board } from './board';
import { attachLayer, spawnLoop, spawnVfx, type HeroLibrary, type LoopedVfx } from './heroes';
import { createWaterFilter, waterUniforms } from './water';

interface Floater {
  sprite: Sprite;
  vx: number;
  vy: number;
  phase: number;
}

interface Flyer {
  node: Container;
  trail: Sprite[];
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  born: number;
  life: number;
}

/**
 * Cathedral, priestess, tide tube, particles, god rays, and the rising-water shader.
 * The board sits in the shaken camera so the drown filter covers the whole vault.
 */
export interface Chrome {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export class Scene {
  readonly world = new Container();
  readonly camera = new Container();
  readonly fx = new Container();
  readonly board: Board;
  private readonly backdrop = new Container();
  private readonly art: ArtSet;
  private readonly heroes: HeroLibrary;
  private readonly bgs: Sprite[];
  private readonly rays: Sprite[] = [];
  private readonly motes: Floater[] = [];
  private readonly bubbles: Floater[] = [];
  private readonly moteLayer = new Container();
  private readonly bubbleLayer = new Container();
  private readonly tideRoot = new Container();
  private readonly tideGlass = new Graphics();
  private readonly tideText: Text;
  private readonly tideLabel: Text;
  private readonly character: Sprite;
  private idleAnim: AnimatedSprite | null = null;
  private castAnim: AnimatedSprite | null = null;
  private water: Filter | null = null;
  private width = 1280;
  private height = 720;
  private time = 0;
  private shakeAmp = 0;
  private boardX = 0;
  private boardY = 0;
  private charX = 0;
  private charY = 0;
  private charH = 480;
  private tideX = 0;
  private tideY = 0;
  private tideH = 280;
  private tideW = 42;
  private level = 0.14;
  private levelTarget = 0.14;
  private stageMix = 0;
  private stageTarget = 0;
  private tideMeter = 0;
  private inFs = false;
  private castUntil = 0;
  private krakenShown = false;
  private portrait = false;
  private flyers: Flyer[] = [];
  private tideLoop: LoopedVfx | null = null;
  private tidePulse = 0;
  private krakenLock = 0;
  private reduced = false;
  private cellSize = 96;
  private characterMounted = false;

  constructor(art: ArtSet, heroes: HeroLibrary) {
    this.art = art;
    this.heroes = heroes;
    this.board = new Board(art, heroes);
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.world.addChild(this.camera);
    this.camera.addChild(this.backdrop);
    this.bgs = art.backgrounds.map((texture) => {
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      this.backdrop.addChild(sprite);
      return sprite;
    });
    this.bgs[1].alpha = 0;
    this.bgs[2].alpha = 0;
    const rayLayer = new Container();
    this.backdrop.addChild(rayLayer);
    for (let i = 0; i < 7; i++) {
      const ray = new Sprite(art.ray);
      ray.anchor.set(0.5, 0);
      ray.blendMode = 'add';
      ray.tint = i % 5 === 0 ? 0xff4fa3 : 0xbffcff;
      this.rays.push(ray);
      rayLayer.addChild(ray);
    }
    this.backdrop.addChild(this.moteLayer);
    this.character = new Sprite(art.character[0]);
    this.character.anchor.set(0.5, 0.92);
    this.camera.addChild(this.character);
    this.mountCharacter(heroes.clips.get('tidecaller') ?? null);
    this.camera.addChild(this.board.root);
    this.tideLabel = new Text({
      text: 'TIDE',
      style: {
        fill: '#9bfff6',
        fontFamily: 'Palatino Linotype, Palatino, Georgia, serif',
        fontSize: 13,
        letterSpacing: 3,
      },
    });
    this.tideLabel.anchor.set(0.5, 1);
    this.tideText = new Text({
      text: '—',
      style: {
        fill: '#fff6d2',
        fontFamily: 'Palatino Linotype, Palatino, Georgia, serif',
        fontSize: 20,
        fontWeight: '700',
        stroke: { color: '#04141c', width: 4 },
      },
    });
    this.tideText.anchor.set(0.5, 0);
    this.tideRoot.addChild(this.tideGlass);
    this.tideRoot.addChild(this.tideLabel);
    this.tideRoot.addChild(this.tideText);
    this.camera.addChild(this.tideRoot);
    this.camera.addChild(this.bubbleLayer);
    for (let i = 0; i < 40; i++) {
      const sprite = new Sprite(art.mote);
      sprite.anchor.set(0.5);
      sprite.blendMode = 'add';
      const size = 6 + Math.random() * 16;
      sprite.width = size;
      sprite.height = size;
      this.moteLayer.addChild(sprite);
      this.motes.push({ sprite, vx: -12 + Math.random() * 24, vy: -10 + Math.random() * 16, phase: Math.random() * 6 });
    }
    for (let i = 0; i < 16; i++) this.addBubble();
    try {
      this.water = createWaterFilter();
      this.backdrop.filters = [this.water];
    } catch {
      this.water = null;
    }
  }

  mount(app: Application): void {
    app.stage.addChild(this.world);
    app.stage.addChild(this.fx);
  }

  layout(width: number, height: number, chrome?: Chrome): void {
    this.width = width;
    this.height = height;
    const inset = chrome ?? { top: 72, bottom: 128, left: 14, right: 14 };
    this.portrait = height > width * 1.02 || width < 860;
    const cover = Math.max(width / 1600, height / 900) * 1.08;
    for (const bg of this.bgs) {
      bg.width = 1600 * cover;
      bg.height = 900 * cover;
      bg.position.set(width / 2, height / 2);
    }
    const top = inset.top + 4;
    const bottomLimit = height - inset.bottom - 6;
    const leftEdge = inset.left;
    const availW = Math.max(160, width - inset.left - inset.right);
    const availH = Math.max(160, bottomLimit - top);
    this.tideW = this.portrait ? 26 : 46;
    const gap = 8;
    let cell = 48;
    if (!this.portrait) {
      const charW = Math.min(availW * 0.2, availH * 0.55, 260);
      cell = Math.floor(Math.min((availW - charW - this.tideW - gap * 3) / COLS, availH / ROWS));
      cell = Math.max(32, cell);
      let boardH = cell * ROWS;
      if (top + boardH > bottomLimit) {
        cell = Math.max(32, Math.floor((bottomLimit - top) / ROWS));
        boardH = cell * ROWS;
      }
      const boardW = cell * COLS;
      const cluster = this.tideW + gap + boardW + gap + charW;
      const start = leftEdge + Math.max(0, (availW - cluster) / 2);
      this.tideX = start;
      this.boardX = start + this.tideW + gap;
      this.boardY = top + Math.max(0, (availH - boardH) / 2);
      if (this.boardY + boardH > bottomLimit) this.boardY = Math.max(top, bottomLimit - boardH);
      this.charH = Math.min(boardH * 1.02, bottomLimit - top);
      const charPixelW = this.charH * 0.7;
      const rightLimit = width - inset.right - 4;
      this.charX = this.boardX + boardW + 10 + charPixelW / 2;
      if (this.charX + charPixelW / 2 > rightLimit) {
        const room = rightLimit - (this.boardX + boardW + 10);
        this.charH = room > 70 ? room / 0.7 : 0;
        this.charX = this.boardX + boardW + 10 + (this.charH * 0.7) / 2;
      }
      this.charY = this.boardY + boardH - 2;
    } else {
      cell = Math.floor(Math.min((availW - this.tideW - gap) / COLS, availH / ROWS));
      cell = Math.max(22, cell);
      let boardW = cell * COLS;
      let boardH = cell * ROWS;
      const extra = availH - boardH;
      const cluster = this.tideW + gap + boardW;
      const start = leftEdge + Math.max(0, (availW - cluster) / 2);
      this.tideX = start;
      this.boardX = start + this.tideW + gap;
      if (extra >= 64) {
        this.charH = Math.min(extra - 8, cell * 2.3, 200);
        this.boardY = top + this.charH + 2;
        if (this.boardY + boardH > bottomLimit) {
          this.charH = Math.max(0, bottomLimit - boardH - top - 2);
          this.boardY = top + this.charH + 2;
        }
        this.charX = this.boardX + boardW / 2;
        this.charY = this.boardY - Math.max(4, this.charH * 0.1);
      } else {
        this.charH = 0;
        this.charX = leftEdge;
        this.charY = top;
        this.boardY = top + Math.max(0, (availH - boardH) / 2);
      }
      if (this.boardY + boardH > bottomLimit) {
        cell = Math.max(22, Math.floor((bottomLimit - this.boardY) / ROWS));
        boardW = cell * COLS;
        boardH = cell * ROWS;
        const cluster2 = this.tideW + gap + boardW;
        const start2 = leftEdge + Math.max(0, (availW - cluster2) / 2);
        this.tideX = start2;
        this.boardX = start2 + this.tideW + gap;
        this.charX = this.boardX + boardW / 2;
      }
    }
    this.cellSize = cell;
    const boardH = cell * ROWS;
    const boardW = cell * COLS;
    this.board.layout(cell);
    this.board.root.position.set(this.boardX, this.boardY);
    this.tideH = Math.max(72, boardH * 0.78);
    this.tideY = this.boardY + (boardH - this.tideH) / 2;
    if (this.charH > 0 && !this.portrait && this.charX - this.charH * 0.35 < this.boardX + boardW) {
      this.charX = this.boardX + boardW + 10 + this.charH * 0.35;
    }
    this.placeCharacter();
    this.drawTide();
    this.syncTideOverlay();
    this.rays.forEach((ray, i) => {
      ray.height = height * 1.2;
      ray.width = 64 + (i % 3) * 40;
      ray.position.set(width * (0.08 + i * 0.13), -10);
      ray.rotation = -0.38 + i * 0.11;
    });
    this.backdrop.filterArea = new Rectangle(0, 0, width, height);
  }

  update(dt: number): void {
    this.time += dt;
    this.board.update(this.time);
    this.shakeAmp *= Math.exp(-dt * 5.5);
    const sway = this.reduced ? 0 : 1;
    this.camera.position.set((Math.random() - 0.5) * this.shakeAmp * sway, (Math.random() - 0.5) * this.shakeAmp * sway);
    this.board.root.position.set(
      this.boardX + Math.sin(this.time * 0.45) * 1.6 * sway,
      this.boardY + Math.cos(this.time * 0.33) * 1.1 * sway,
    );
    this.tidePulse *= Math.exp(-dt * 2.4);
    if (this.inFs || this.tidePulse > 0.03) this.drawTide();
    this.level += (this.levelTarget - this.level) * Math.min(1, dt * 2.2);
    this.stageMix += (this.stageTarget - this.stageMix) * Math.min(1, dt * 1.6);
    this.bgs[1].alpha = clamp(this.stageMix, 0, 1);
    this.bgs[2].alpha = clamp(this.stageMix - 1, 0, 1);
    this.writeWater();
    if (this.time > this.castUntil) this.idlePose();
    this.placeCharacter();
    const bob = this.reduced ? 0 : Math.sin(this.time * 1.25) * 5;
    this.character.y = this.charY + bob;
    if (this.idleAnim) this.idleAnim.y = this.charY + bob;
    if (this.castAnim) this.castAnim.y = this.charY + bob;
    for (const ray of this.rays) {
      ray.alpha = 0.07 + Math.sin(this.time * 0.7 + ray.position.x * 0.01) * 0.04;
    }
    this.drift(dt);
    this.stepFlyers();
  }

  shake(power: number): void {
    if (this.reduced) return;
    this.shakeAmp = Math.max(this.shakeAmp, power);
  }

  cast(): void {
    this.castUntil = this.time + 0.8;
    this.character.texture = this.art.character[1];
    if (this.castAnim && this.idleAnim) {
      this.character.visible = false;
      this.idleAnim.visible = false;
      this.castAnim.visible = true;
      this.castAnim.gotoAndPlay(0);
    }
  }

  setTide(meter: number, inFs: boolean, immediate = false): void {
    const nextStage = inFs ? tideStage(meter) : 0;
    if (nextStage >= 2 && this.stageTarget < 2 && !this.krakenShown) {
      this.krakenShown = true;
      this.krakenSweep();
    }
    if (nextStage < 2) this.krakenShown = false;
    const previousMeter = this.tideMeter;
    this.tideMeter = meter;
    this.inFs = inFs;
    this.stageTarget = nextStage;
    this.levelTarget = inFs ? Math.min(0.9, 0.22 + Math.min(meter, 80) / 95) : 0.14;
    if (immediate) {
      this.level = this.levelTarget;
      this.stageMix = this.stageTarget;
      this.bgs[1].alpha = clamp(this.stageMix, 0, 1);
      this.bgs[2].alpha = clamp(this.stageMix - 1, 0, 1);
      this.writeWater();
    }
    if (inFs && meter > previousMeter) this.tidePulse = 1;
    this.tideRoot.alpha = inFs ? 1 : 0.72;
    this.tideText.text = inFs ? `×${meter}` : '—';
    this.drawTide();
    this.syncTideOverlay();
  }

  pulseTide(): void {
    this.tidePulse = 1;
    this.drawTide();
  }

  /** Kraken crosses the vault on a long tumble chain or when the throne wakes. */
  krakenSweep(): void {
    const now = performance.now();
    if (now < this.krakenLock) return;
    this.krakenLock = now + 1500;
    attachLayer(this.heroes, 'kraken', this.fx);
    const boardW = this.cellSize * COLS;
    const scale = Math.max(0.35, boardW / 364);
    spawnVfx(this.heroes, 'kraken', 'sweep', this.boardX + boardW * 0.42, this.boardY + this.cellSize * ROWS * 0.55, scale);
  }

  /**
   * The seal clip's bubble ring is faint, so the trigger draws its own
   * expanding rings and a spray of bubbles on top of the crack.
   */
  sealWave(points: { x: number; y: number }[]): void {
    for (const point of points) {
      for (let ring = 0; ring < 3; ring++) {
        const graphic = new Graphics();
        graphic.circle(0, 0, 16).stroke({ width: 4, color: ring === 1 ? 0xff4fa3 : 0xe8fffb, alpha: 1 });
        graphic.circle(0, 0, 28).stroke({ width: 2, color: 0x7ef6ff, alpha: 0.8 });
        graphic.position.set(point.x, point.y);
        this.fx.addChild(graphic);
        const born = performance.now() + ring * 110;
        const life = 780;
        const step = () => {
          const t = (performance.now() - born) / life;
          if (t < 0) {
            requestAnimationFrame(step);
            return;
          }
          if (t >= 1 || graphic.destroyed) {
            if (!graphic.destroyed) graphic.destroy();
            return;
          }
          graphic.scale.set(1 + t * 5.5);
          graphic.alpha = (1 - t) * 0.9;
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
      for (let i = 0; i < 12; i++) {
        const sprite = new Sprite(this.art.bubble);
        sprite.anchor.set(0.5);
        sprite.blendMode = 'add';
        const size = 12 + (i % 4) * 8;
        sprite.width = size;
        sprite.height = size;
        sprite.position.set(point.x, point.y);
        this.fx.addChild(sprite);
        const angle = (i / 12) * Math.PI * 2;
        const speed = 70 + (i % 5) * 28;
        const born = performance.now();
        const life = 620 + (i % 3) * 80;
        const step = () => {
          const t = (performance.now() - born) / life;
          if (t >= 1 || sprite.destroyed) {
            if (!sprite.destroyed) sprite.destroy();
            return;
          }
          const wave = Math.sin(t * Math.PI);
          sprite.position.set(point.x + Math.cos(angle) * speed * t, point.y + Math.sin(angle) * speed * t * 0.72 - t * 36);
          sprite.alpha = wave;
          sprite.scale.set(1 + t);
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    }
  }

  tideGlobal(): { x: number; y: number } {
    const point = this.tideRoot.getGlobalPosition();
    return { x: point.x + this.tideW / 2, y: point.y + this.tideH * 0.4 };
  }

  burst(localX: number, localY: number): void {
    const global = this.board.root.toGlobal({ x: localX, y: localY });
    for (let i = 0; i < 7; i++) {
      const sprite = new Sprite(this.art.bubble);
      sprite.anchor.set(0.5);
      sprite.blendMode = 'add';
      const size = 10 + Math.random() * 20;
      sprite.width = size;
      sprite.height = size;
      sprite.position.set(global.x, global.y);
      this.fx.addChild(sprite);
      const angle = Math.random() * Math.PI * 2;
      const speed = 28 + Math.random() * 80;
      const life = 380 + Math.random() * 260;
      const born = performance.now();
      const step = () => {
        const t = (performance.now() - born) / life;
        if (t >= 1 || sprite.destroyed) {
          if (!sprite.destroyed) sprite.destroy();
          return;
        }
        sprite.position.set(global.x + Math.cos(angle) * speed * t, global.y + Math.sin(angle) * speed * t - t * 28);
        sprite.alpha = 1 - t;
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
    attachLayer(this.heroes, 'bubbles', this.fx);
    spawnVfx(this.heroes, 'bubbles', 'pop', global.x, global.y, 0.42);
  }

  popup(text: string, x: number, y: number): void {
    const label = new Text({
      text,
      style: {
        fill: '#fff6d2',
        fontFamily: 'Palatino Linotype, Palatino, Georgia, serif',
        fontSize: 42,
        fontWeight: '700',
        stroke: { color: '#04141c', width: 4 },
      },
    });
    label.anchor.set(0.5);
    label.position.set(x, y);
    this.fx.addChild(label);
    const born = performance.now();
    const step = () => {
      const t = (performance.now() - born) / 1100;
      if (t >= 1) {
        label.destroy();
        return;
      }
      label.y = y - t * 72;
      label.scale.set(1 + Math.sin(Math.min(1, t) * Math.PI) * 0.18);
      label.alpha = t < 0.65 ? 1 : 1 - (t - 0.65) / 0.35;
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  fly(points: { x: number; y: number; value: number }[], target: { x: number; y: number }, duration: number): Promise<void> {
    if (points.length === 0) return Promise.resolve();
    const born = performance.now();
    for (const point of points) {
      const node = new Container();
      const text = new Text({
        text: `${point.value}×`,
        style: {
          fill: '#f3fdff',
          fontFamily: 'Palatino Linotype, Palatino, Georgia, serif',
          fontSize: 26,
          fontWeight: '700',
          stroke: { color: '#ff4fa3', width: 4 },
        },
      });
      text.anchor.set(0.5);
      node.addChild(text);
      node.position.set(point.x, point.y);
      this.fx.addChild(node);
      const trail: Sprite[] = [];
      for (let i = 0; i < 5; i++) {
        const sprite = new Sprite(this.art.mote);
        sprite.anchor.set(0.5);
        sprite.blendMode = 'add';
        sprite.tint = i % 2 ? 0xff4fa3 : 0x9af8ff;
        sprite.width = 16;
        sprite.height = 16;
        this.fx.addChild(sprite);
        trail.push(sprite);
      }
      this.flyers.push({ node, trail, x0: point.x, y0: point.y, x1: target.x, y1: target.y, born, life: duration });
    }
    return new Promise((resolve) => {
      const step = () => {
        if (performance.now() - born >= duration + 30) resolve();
        else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  private writeWater(): void {
    if (!this.water) return;
    try {
      const uniforms = waterUniforms(this.water);
      uniforms.uTime = this.time;
      uniforms.uLevel = this.level;
      uniforms.uStage = this.stageMix;
    } catch {
      this.backdrop.filters = [];
      this.water = null;
    }
  }

  private idlePose(): void {
    if (this.character.texture === this.art.character[0] && !this.castAnim?.visible) return;
    this.character.texture = this.art.character[0];
    if (this.idleAnim && this.castAnim) {
      this.castAnim.visible = false;
      this.idleAnim.visible = true;
      this.character.visible = false;
    }
  }

  private stepFlyers(): void {
    const now = performance.now();
    this.flyers = this.flyers.filter((flyer) => {
      const t = Math.min(1, (now - flyer.born) / flyer.life);
      const e = 1 - (1 - t) * (1 - t);
      const arc = Math.sin(t * Math.PI) * -70;
      flyer.node.position.set(flyer.x0 + (flyer.x1 - flyer.x0) * e, flyer.y0 + (flyer.y1 - flyer.y0) * e + arc);
      flyer.node.scale.set(1 + Math.sin(t * Math.PI) * 0.2);
      flyer.trail.forEach((sprite, i) => {
        const lag = Math.max(0, t - i * 0.05);
        const le = 1 - (1 - lag) * (1 - lag);
        sprite.position.set(
          flyer.x0 + (flyer.x1 - flyer.x0) * le,
          flyer.y0 + (flyer.y1 - flyer.y0) * le + Math.sin(lag * Math.PI) * -70,
        );
        sprite.alpha = (1 - t) * 0.75;
      });
      if (t < 1) return true;
      flyer.node.destroy({ children: true });
      for (const sprite of flyer.trail) sprite.destroy();
      return false;
    });
  }

  private drift(dt: number): void {
    for (const mote of this.motes) {
      mote.sprite.x += mote.vx * dt;
      mote.sprite.y += mote.vy * dt + Math.sin(this.time + mote.phase) * 10 * dt;
      if (mote.sprite.x < -30) mote.sprite.x = this.width + 20;
      if (mote.sprite.x > this.width + 30) mote.sprite.x = -20;
      if (mote.sprite.y < -30) mote.sprite.y = this.height + 20;
      if (mote.sprite.y > this.height + 30) mote.sprite.y = -20;
      mote.sprite.alpha = 0.2 + Math.sin(this.time * 1.4 + mote.phase) * 0.15;
    }
    for (const bubble of this.bubbles) {
      bubble.sprite.y -= bubble.vy * dt;
      bubble.sprite.x += Math.sin(this.time * 1.3 + bubble.phase) * 18 * dt;
      if (bubble.sprite.y < -24) {
        bubble.sprite.y = this.height + 16;
        bubble.sprite.x = Math.random() * this.width;
      }
    }
  }

  adoptHeroes(): void {
    this.mountCharacter(this.heroes.clips.get('tidecaller') ?? null);
    attachLayer(this.heroes, 'tide', this.backdrop);
    attachLayer(this.heroes, 'kraken', this.fx);
    attachLayer(this.heroes, 'bubbles', this.fx);
    this.placeCharacter();
    this.board.repaint();
    this.syncTideOverlay();
  }

  private syncTideOverlay(): void {
    if (!this.inFs) {
      this.tideLoop?.kill();
      this.tideLoop = null;
      return;
    }
    attachLayer(this.heroes, 'tide', this.backdrop);
    const scale = Math.max(0.45, this.width / 720);
    const x = this.width / 2;
    const y = this.height * 0.86;
    if (!this.tideLoop) this.tideLoop = spawnLoop(this.heroes, 'tide', 'overlay', x, y, scale, 0.78);
    this.tideLoop?.set(x, y, scale, 0.78);
  }

  private mountCharacter(asset: PixiOpal | null): void {
    if (this.characterMounted || !asset?.clips.idle) return;
    this.characterMounted = true;
    this.idleAnim = asset.sprite('idle', { anchor: asset.feetAnchor('idle') });
    this.camera.addChild(this.idleAnim);
    this.character.visible = false;
    if (asset.clips.cast) {
      this.castAnim = asset.sprite('cast', { play: false, anchor: asset.feetAnchor('cast') });
      this.castAnim.loop = false;
      this.castAnim.visible = false;
      this.camera.addChild(this.castAnim);
    }
  }

  private placeCharacter(): void {
    const show = this.charH >= 48;
    if (!show) {
      this.character.visible = false;
      if (this.idleAnim) this.idleAnim.visible = false;
      if (this.castAnim) this.castAnim.visible = false;
      return;
    }
    const aspect = this.character.texture.width / Math.max(1, this.character.texture.height);
    this.character.height = this.charH;
    this.character.width = this.charH * aspect;
    this.character.position.set(this.charX, this.charY);
    for (const anim of [this.idleAnim, this.castAnim]) {
      if (!anim) continue;
      anim.height = this.charH;
      anim.scale.x = Math.abs(anim.scale.y);
      anim.position.set(this.charX, this.character.y || this.charY);
    }
    if (this.idleAnim) {
      this.character.visible = false;
      if (!this.castAnim?.visible) this.idleAnim.visible = true;
    } else {
      this.character.visible = true;
    }
  }

  private drawTide(): void {
    const w = this.tideW;
    const h = this.tideH;
    this.tideRoot.position.set(this.tideX, this.tideY);
    const fill = this.inFs ? Math.max(0.06, Math.min(1, this.tideMeter / TIDE_THRONE)) : 0.08;
    const fh = (h - 18) * fill;
    const color = this.stageTarget >= 2 ? 0xff4fa3 : this.stageTarget >= 1 ? 0x6aa6ff : 0x3ef6ea;
    const pulse = 0.35 + this.tidePulse * 0.65 + (this.inFs ? Math.sin(this.time * 4) * 0.08 : 0);
    this.tideGlass.clear();
    this.tideGlass.roundRect(-3, -3, w + 6, h + 6, 20).stroke({ width: 3, color: 0xf3d48a, alpha: 0.95 });
    this.tideGlass.roundRect(0, 0, w, h, 16).fill({ color: 0x02141c, alpha: 0.88 });
    this.tideGlass.roundRect(6, h - 9 - fh, w - 12, fh, 10).fill({ color, alpha: 0.95 });
    this.tideGlass.roundRect(6, h - 9 - fh, w - 12, Math.min(fh, 10), 8).fill({ color: 0xffffff, alpha: 0.28 * pulse });
    for (const mark of [15, 50]) {
      const y = h - 9 - (h - 18) * Math.min(1, mark / TIDE_THRONE);
      this.tideGlass.moveTo(4, y).lineTo(w - 4, y).stroke({ width: 1, color: 0xfff6d2, alpha: 0.45 });
    }
    this.tideGlass.roundRect(0, 0, w, h, 16).stroke({ width: 2, color: 0x7ef6ff, alpha: 0.55 + pulse * 0.4 });
    this.tideLabel.position.set(w / 2, -8);
    this.tideText.position.set(w / 2, h + 6);
  }

  private addBubble(): void {
    const sprite = new Sprite(this.art.bubble);
    sprite.anchor.set(0.5);
    sprite.blendMode = 'add';
    const size = 8 + Math.random() * 16;
    sprite.width = size;
    sprite.height = size;
    sprite.alpha = 0.35;
    sprite.position.set(Math.random() * this.width, Math.random() * this.height);
    this.bubbleLayer.addChild(sprite);
    this.bubbles.push({ sprite, vx: 0, vy: 16 + Math.random() * 30, phase: Math.random() * 6 });
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
