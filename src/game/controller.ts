import { playRound } from '../engine/play';
import { makeRng } from '../engine/rng';
import { stakeX, type Mode, type RoundResult, type SpinView } from '../engine/types';
import type { AudioBus } from '../render/audio';
import type { Pace } from '../render/board';
import type { Scene } from '../render/scene';
import type { Hud } from '../ui/hud';
import { BETS_CENTS, START_BALANCE_CENTS, formatMoney, formatPay, winTier } from './money';
import { SHOWCASE_MULTS, SHOWCASE_SYMBOLS } from './showcase';

const KEYS = {
  balance: 'tv-balance',
  bet: 'tv-bet',
  mute: 'tv-mute',
  turbo: 'tv-turbo',
  ante: 'tv-ante',
  music: 'tv-music',
  sfx: 'tv-sfx',
};

export class Game {
  balanceCents = START_BALANCE_CENTS;
  betCents = 100;
  ante = false;
  turbo = false;
  autoLeft = 0;
  busy = false;
  private snap = false;
  private instant = false;
  private rootSeed = (Date.now() ^ 0x9e3779b9) >>> 0;
  private spinIndex = 0;
  private roundOrigin = 0;
  private roundBet = 100;
  private runningX = 0;
  private autoLossX = 0;
  private autoWinX = 0;
  private autoStopFeature = false;
  private autoStartBalance = 0;

  constructor(
    private readonly scene: Scene,
    private readonly hud: Hud,
    private readonly audio: AudioBus,
  ) {}

  async start(params: URLSearchParams): Promise<void> {
    this.restore();
    const dev = import.meta.env.DEV;
    if (dev) {
      const credits = Number(params.get('credits'));
      if (Number.isFinite(credits) && credits > 0) this.balanceCents = Math.round(credits);
      const seed = Number(params.get('seed'));
      if (Number.isFinite(seed) && seed > 0) this.rootSeed = seed >>> 0;
    }
    const bet = Number(params.get('bet'));
    if (Number.isFinite(bet) && bet > 0) this.betCents = Math.round(bet);
    if (!BETS_CENTS.includes(this.betCents)) this.betCents = nearestBet(this.betCents);
    if (params.get('turbo') === '1') this.turbo = true;
    if (params.get('mute') === '1') this.audio.muted = true;
    this.scene.setTide(0, false, true);
    this.scene.board.show(SHOWCASE_SYMBOLS, SHOWCASE_MULTS);
    this.refresh();
    this.bind();
    const hold = params.get('hold');
    if (hold) {
      this.instant = true;
      await this.presentHold(hold, params.get('mode'));
      this.instant = false;
    }
  }

  private bind(): void {
    const arm = () => this.audio.unlock();
    window.addEventListener('pointerdown', arm, { once: true });
    this.hud.spin.addEventListener('click', () => {
      this.audio.unlock();
      if (this.busy) {
        this.snap = true;
        this.turbo = true;
        this.hud.setTurbo(true);
        this.hud.hurry();
        this.scene.board.skip();
        return;
      }
      void this.spin();
    });
    this.hud.ante.addEventListener('click', () => {
      if (this.busy) return;
      this.audio.click();
      this.ante = !this.ante;
      this.persist();
      this.refresh();
    });
    this.hud.turbo.addEventListener('click', () => {
      this.audio.click();
      this.turbo = !this.turbo;
      this.hud.setTurbo(this.turbo);
      this.persist();
    });
    this.hud.mute.addEventListener('click', () => {
      const muted = this.audio.toggleMute();
      this.hud.setMute(muted);
      this.persist();
    });
    must('bet-down').addEventListener('click', () => this.stepBet(-1));
    must('bet-up').addEventListener('click', () => this.stepBet(1));
    this.hud.auto.addEventListener('click', () => {
      this.audio.click();
      if (this.autoLeft > 0) {
        this.autoLeft = 0;
        this.hud.setAuto(0);
        return;
      }
      this.hud.toggleAutoMenu();
    });
    must('auto-menu').addEventListener('click', (event) => {
      const target = event.target instanceof HTMLElement ? event.target.closest('button') : null;
      if (!(target instanceof HTMLButtonElement)) return;
      if (target.dataset.loss !== undefined || target.dataset.win !== undefined) {
        this.hud.markAutoChoice(target);
        return;
      }
      const spins = Number(target.dataset.spins);
      if (!spins || this.busy) return;
      this.autoLossX = this.hud.autoChoice('loss');
      this.autoWinX = this.hud.autoChoice('win');
      this.autoStopFeature = this.hud.stopOnFeature();
      this.autoStartBalance = this.balanceCents;
      this.autoLeft = spins;
      this.hud.setAuto(this.autoLeft);
      void this.spin();
    });
    this.hud.onVolumes(
      (value) => {
        this.audio.setMusic(value);
        this.persist();
      },
      (value) => {
        this.audio.setSfx(value);
        this.persist();
      },
    );
    this.hud.buyOpen.addEventListener('click', () => {
      if (this.busy || this.ante || this.hud.buyOpen.hidden) return;
      this.audio.click();
      this.hud.openBuy();
    });
    must('buy-feature').addEventListener('click', () => void this.spin('buy'));
    must('super-feature').addEventListener('click', () => void this.spin('super'));
    this.hud.refill.addEventListener('click', () => {
      this.balanceCents = START_BALANCE_CENTS;
      this.persist();
      this.refresh();
      this.hud.toast('Demo credits refilled');
    });
    window.addEventListener('keydown', (event) => {
      if (event.code === 'Space') {
        if (event.repeat) return;
        if (document.querySelector('dialog[open]')) return;
        if (this.hud.autoOpen() || this.hud.historyOpen() || this.hud.soundOpen()) return;
        event.preventDefault();
        this.hud.spin.click();
      } else if (event.key === 'm' || event.key === 'M') {
        if (document.querySelector('dialog[open]')) return;
        this.hud.mute.click();
      }
    });
  }

  private stepBet(dir: number): void {
    if (this.busy) return;
    this.audio.click();
    const index = Math.max(0, BETS_CENTS.indexOf(this.betCents));
    this.betCents = BETS_CENTS[Math.min(BETS_CENTS.length - 1, Math.max(0, index + dir))] ?? this.betCents;
    this.persist();
    this.refresh();
  }

  private async spin(forced?: Mode): Promise<void> {
    if (this.busy) return;
    const mode: Mode = forced ?? (this.ante ? 'ante' : 'base');
    if ((mode === 'buy' || mode === 'super') && this.ante) return;
    const cost = Math.round(stakeX(mode) * this.betCents);
    if (this.balanceCents < cost) {
      this.autoLeft = 0;
      this.hud.setAuto(0);
      this.hud.toast('Not enough demo credits');
      this.refresh();
      return;
    }
    this.busy = true;
    this.snap = false;
    this.hud.hideAutoMenu();
    this.hud.closeBuy();
    this.hud.hideCeremony();
    this.hud.hideBanner();
    this.hud.hideFs();
    this.hud.setBusy(true);
    this.balanceCents -= cost;
    this.roundOrigin = this.balanceCents;
    this.roundBet = this.betCents;
    this.runningX = 0;
    this.hud.setWin(0);
    this.hud.setBalance(this.balanceCents);
    this.audio.spin();
    const rng = makeRng((this.rootSeed + this.spinIndex * 9973 + (mode.charCodeAt(0) << 16)) >>> 0);
    this.spinIndex++;
    let result: RoundResult;
    try {
      result = playRound(rng, mode, true);
    } catch {
      this.balanceCents += cost;
      this.stopAuto();
      this.busy = false;
      this.hud.setBusy(false);
      this.hud.toast('Spin interrupted');
      this.persist();
      this.refresh();
      return;
    }
    try {
      await this.present(result);
    } catch {
      this.stopAuto();
      this.hud.toast('Spin interrupted');
    } finally {
      const owed = Math.round(result.totalWinX * this.roundBet);
      this.runningX = result.totalWinX;
      this.balanceCents = this.roundOrigin + owed;
      this.hud.setWin(owed);
      this.hud.setBalance(this.balanceCents);
      this.hud.pushHistory(result.mode, cost, owed);
      if (owed > 0) this.hud.announce(`Win ${formatMoney(owed)}`);
      this.applyAutoStops(result);
      this.busy = false;
      this.snap = false;
      this.hud.setBusy(false);
      this.hud.hideFs();
      this.scene.setTide(0, false);
      this.persist();
      this.refresh();
    }
    if (this.autoLeft > 0) {
      this.autoLeft--;
      this.hud.setAuto(this.autoLeft);
      if (this.autoLeft > 0) void this.spin();
    }
  }

  private async present(result: RoundResult): Promise<void> {
    if (result.base) await this.playSpin(result.base, false);
    if (result.triggered && result.freeSpins.length > 0) {
      this.audio.feature();
      this.scene.shake(10);
      this.scene.setTide(result.tideStart, true);
      const superVault = result.mode === 'super';
      await this.hud.featureIntro(
        superVault ? 'Super buy' : 'Free spins',
        superVault ? 'Super vault' : 'The vault opens',
        superVault ? 'Tide meter starts at ×10' : '15 free spins',
        this.instant ? 0 : this.turbo ? 520 : 1200,
        () => this.snap,
        superVault,
      );
      let awarded = 15;
      for (let i = 0; i < result.freeSpins.length; i++) {
        const spin = result.freeSpins[i];
        this.hud.showFs(i + 1, awarded);
        await this.playSpin(spin, true);
        if (spin.extraSpins) {
          awarded += spin.extraSpins;
          this.hud.showFs(i + 1, awarded);
          this.audio.scatter();
          await this.hud.bannerText(`+${spin.extraSpins} free spins`, this.instant ? 0 : this.turbo ? 280 : 800, () => this.snap);
          this.hud.hideBanner();
        }
      }
      if (!winTier(result.totalWinX) && result.totalWinX > 0) {
        await this.hud.featureIntro(
          'Feature complete',
          'Total win',
          formatMoney(Math.round(result.totalWinX * this.roundBet)),
          this.instant ? 0 : this.turbo ? 420 : 1100,
          () => this.snap,
          false,
        );
      }
    }
    const tier = winTier(result.totalWinX);
    if (tier) {
      this.audio.bigWin();
      this.scene.shake(18);
      await this.hud.ceremony(tier, Math.round(result.totalWinX * this.roundBet), this.instant);
    }
  }

  private async playSpin(view: SpinView, inFs: boolean): Promise<void> {
    const frames = view.frames;
    if (frames.length === 0) return;
    const snapToEnd = async () => {
      const last = frames[frames.length - 1];
      this.scene.board.show(last.symbols, last.mults);
      await this.finishSpin(view, inFs, true);
      this.snap = false;
    };
    if (this.snap || this.instant) {
      await snapToEnd();
      return;
    }
    const pace = this.pace();
    const dropped = await this.scene.board.dropIn(frames[0].symbols, frames[0].mults, pace, (column, seals) => {
      this.audio.land(column, seals >= 2);
      if (seals >= 2 && column > 0) this.audio.scatter();
    });
    if (!dropped || this.snap) {
      await snapToEnd();
      return;
    }
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      if (frame.win <= 0) break;
      if (this.snap) {
        await snapToEnd();
        return;
      }
      this.audio.win(frame.win);
      this.scene.shake(Math.min(14, 3 + frame.win * 1.4));
      if (i >= 2 || frame.win >= 10) this.scene.krakenSweep();
      const at = this.scene.board.globalCenter(12);
      this.scene.popup(`+${formatPay(frame.win)}×`, at.x, at.y - 20);
      const punched = await this.scene.board.punch(frame.removeMask, pace);
      if (!punched || this.snap) {
        await snapToEnd();
        return;
      }
      const gone = await this.scene.board.dissolve(frame.removeMask, pace, (x, y) => this.scene.burst(x, y));
      if (!gone || this.snap) {
        await snapToEnd();
        return;
      }
      const next = frames[i + 1];
      if (!next) break;
      this.audio.tumble();
      const fell = await this.scene.board.collapse(next.symbols, next.mults, frame.removeMask, pace);
      if (!fell || this.snap) {
        await snapToEnd();
        return;
      }
    }
    await this.finishSpin(view, inFs, false);
  }

  private async finishSpin(view: SpinView, inFs: boolean, instant: boolean): Promise<void> {
    const multiplied = view.rawWin > 0 && (view.jellySum > 0 || (inFs && view.appliedMult > 1));
    if (multiplied && !instant) {
      this.scene.cast();
      const points = view.jellyCells.map((cell) => ({ ...this.scene.board.globalCenter(cell.index), value: cell.value }));
      const target = inFs ? this.scene.tideGlobal() : winAnchor();
      if (points.length > 0) await this.scene.fly(points, target, this.turbo ? 520 : 980);
      if (inFs) this.scene.pulseTide();
      this.audio.multiplier(view.appliedMult);
    }
    if (inFs) this.scene.setTide(view.tideAfter, true, instant);
    if (view.scatters >= 4 || view.extraSpins > 0) {
      const cracked = this.scene.board.crackSeals();
      if (!instant) {
        this.audio.scatter();
        this.scene.sealWave(cracked.map((index) => this.scene.board.globalCenter(index)));
      }
    }
    this.runningX += view.spinWin;
    const cents = Math.round(this.runningX * this.roundBet);
    this.balanceCents = this.roundOrigin + cents;
    this.hud.setWin(cents);
    this.hud.setBalance(this.balanceCents);
  }

  private async presentHold(hold: string, modeName: string | null): Promise<void> {
    const mode = resolveMode(hold, modeName);
    const found = findRound(hold, mode, this.rootSeed);
    if (!found) {
      this.hud.toast('No sample round in range');
      return;
    }
    this.rootSeed = found.seed;
    const result = found.result;
    const cost = Math.round(stakeX(result.mode) * this.betCents);
    if (result.mode === 'ante') this.ante = true;
    if (hold === 'fs' || hold === 'abyss' || hold === 'throne') {
      const spins = result.freeSpins;
      let index = spins.findIndex((spin) => {
        if (hold === 'throne') return spin.tideAfter >= 50;
        if (hold === 'abyss') return spin.tideAfter >= 15;
        return false;
      });
      if (hold === 'fs') {
        let bestWin = -1;
        spins.forEach((spin, i) => {
          const top = spin.frames.reduce((max, frame) => Math.max(max, frame.win), 0);
          if (top > bestWin) {
            bestWin = top;
            index = i;
          }
        });
      }
      if (index < 0) index = Math.max(0, spins.length - 1);
      const spin = spins[index];
      const frame = spin?.frames.find((item) => item.win > 0) ?? spin?.frames[spin.frames.length - 1];
      if (frame) {
        this.scene.board.show(frame.symbols, frame.mults);
        if (frame.win > 0) this.scene.board.holdWin(frame.removeMask);
      }
      let x = 0;
      for (let i = 0; i <= index; i++) x += spins[i]?.spinWin ?? 0;
      const awarded = 15 + spins.slice(0, index + 1).reduce((sum, item) => sum + item.extraSpins, 0);
      this.hud.showFs(index + 1, awarded);
      this.scene.setTide(spin?.tideAfter ?? result.tideEnd, true, true);
      this.applyHoldMoney(cost, x);
      return;
    }
    const frames = result.base?.frames ?? [];
    const frame =
      hold === 'big'
        ? frames[frames.length - 1]
        : [...frames].reverse().find((item) => item.win > 0) ?? frames[frames.length - 1];
    if (frame) {
      this.scene.board.show(frame.symbols, frame.mults);
      if (hold !== 'big' && frame.win > 0) this.scene.board.holdWin(frame.removeMask);
    }
    this.applyHoldMoney(cost, result.totalWinX);
    if (hold === 'big') {
      const tier = winTier(result.totalWinX) ?? 'BIG WIN';
      await this.hud.ceremony(tier, Math.round(result.totalWinX * this.betCents), true);
    }
  }

  private applyHoldMoney(cost: number, winX: number): void {
    const winCents = Math.round(winX * this.betCents);
    this.balanceCents = Math.max(0, this.balanceCents - cost) + winCents;
    this.hud.setWin(winCents);
    this.hud.setBalance(this.balanceCents);
  }

  private pace(): Pace {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scale = reduced ? 0.22 : this.turbo ? 0.38 : 1;
    return {
      fall: 460 * scale,
      stagger: 80 * scale,
      pop: 380 * scale,
      anticipate: 560 * scale,
      hold: 240 * scale,
    };
  }

  private refresh(): void {
    this.hud.setBalance(this.balanceCents);
    this.hud.setBet(this.betCents, this.ante);
    this.hud.setAnte(this.ante);
    this.hud.setTurbo(this.turbo);
    this.hud.setMute(this.audio.muted);
    this.hud.setRefillVisible(this.balanceCents < BETS_CENTS[0]);
  }

  private stopAuto(): void {
    this.autoLeft = 0;
    this.hud.setAuto(0);
  }

  private applyAutoStops(result: RoundResult): void {
    if (this.autoLeft <= 0) return;
    if (this.autoStopFeature && result.triggered) {
      this.stopAuto();
      return;
    }
    if (this.autoWinX > 0 && result.totalWinX >= this.autoWinX) {
      this.stopAuto();
      return;
    }
    if (this.autoLossX > 0) {
      const loss = this.autoStartBalance - this.balanceCents;
      if (loss >= Math.round(this.autoLossX * this.betCents)) this.stopAuto();
    }
  }

  private restore(): void {
    try {
      this.balanceCents = readInt(KEYS.balance, START_BALANCE_CENTS);
      this.betCents = readInt(KEYS.bet, 100);
      this.turbo = localStorage.getItem(KEYS.turbo) === '1';
      this.ante = localStorage.getItem(KEYS.ante) === '1';
      this.audio.muted = localStorage.getItem(KEYS.mute) === '1';
      const music = localStorage.getItem(KEYS.music);
      const sfx = localStorage.getItem(KEYS.sfx);
      if (music !== null) this.audio.setMusic(Number(music));
      if (sfx !== null) this.audio.setSfx(Number(sfx));
    } catch {
      this.balanceCents = START_BALANCE_CENTS;
      this.betCents = 100;
      this.turbo = false;
      this.ante = false;
      this.audio.muted = false;
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(KEYS.balance, String(this.balanceCents));
      localStorage.setItem(KEYS.bet, String(this.betCents));
      localStorage.setItem(KEYS.turbo, this.turbo ? '1' : '0');
      localStorage.setItem(KEYS.ante, this.ante ? '1' : '0');
      localStorage.setItem(KEYS.mute, this.audio.muted ? '1' : '0');
      localStorage.setItem(KEYS.music, String(this.audio.music));
      localStorage.setItem(KEYS.sfx, String(this.audio.sfx));
    } catch {
      /* private mode */
    }
  }

  state(): { balance: number; win: number; busy: boolean; ante: boolean; turbo: boolean } {
    return {
      balance: this.balanceCents,
      win: Math.round(this.runningX * this.roundBet),
      busy: this.busy,
      ante: this.ante,
      turbo: this.turbo,
    };
  }
}

function findRound(hold: string, mode: Mode, start: number): { seed: number; result: RoundResult } | null {
  const limit = hold === 'throne' ? 60_000 : hold === 'abyss' ? 20_000 : 8_000;
  let bestSeed = start >>> 0;
  let bestScore = -1;
  for (let i = 0; i < limit; i++) {
    const seed = (start + i * 9973) >>> 0;
    const result = playRound(makeRng(seed), mode, false);
    const score = scoreRound(hold, result);
    if (score > bestScore) {
      bestScore = score;
      bestSeed = seed;
    }
    if (score >= 100) break;
  }
  if (bestScore <= 0) return null;
  return { seed: bestSeed, result: playRound(makeRng(bestSeed), mode, true) };
}

function scoreRound(hold: string, result: RoundResult): number {
  if (hold === 'win') {
    if (!result.triggered && result.totalWinX >= 1 && result.totalWinX < 8) return 100;
    if (!result.triggered && result.totalWinX > 0) return 20;
    return 0;
  }
  if (hold === 'big') {
    if (!result.triggered && result.totalWinX >= 18 && result.totalWinX <= 120) return 100;
    if (result.totalWinX >= 15) return 40;
    return 0;
  }
  if (hold === 'throne') return result.tideEnd >= 50 ? 100 : result.tideEnd;
  if (hold === 'abyss') return result.tideEnd >= 15 ? 100 : result.tideEnd;
  if (result.triggered && result.fsPlayed > 0) return result.fsWinX > 0 ? 100 : 50;
  return 0;
}

function resolveMode(hold: string, modeName: string | null): Mode {
  if (modeName === 'base' || modeName === 'ante' || modeName === 'buy' || modeName === 'super') return modeName;
  if (hold === 'fs' || hold === 'abyss' || hold === 'throne') return 'buy';
  return 'base';
}

function nearestBet(cents: number): number {
  return BETS_CENTS.reduce((best, bet) => (Math.abs(bet - cents) < Math.abs(best - cents) ? bet : best), BETS_CENTS[3]);
}

function readInt(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw.trim() === '') return fallback;
    const value = Number(raw);
    return Number.isFinite(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function winAnchor(): { x: number; y: number } {
  const el = document.getElementById('win');
  if (!el) return { x: window.innerWidth / 2, y: 48 };
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function must(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el;
}
