import { JELLY_VALUES, PAY, SYMBOLS, tierLabel } from '../engine/paytable';
import { ANTE_COST_X, BUY_COST_X, SUPER_COST_X } from '../engine/types';
import { formatMoney, formatPay } from '../game/money';

const SWATCH = ['#7ef6ff', '#b6ff7a', '#d2b0ff', '#ffd27a', '#ff8aa6', '#f3d48a', '#9ad7ff', '#e7fff8', '#ff4fa3', '#fff6d2', '#ffe08a', '#bffcff'];

export class Hud {
  private readonly icons: string[];
  readonly win = must<HTMLElement>('win');
  readonly balance = must<HTMLElement>('balance');
  readonly bet = must<HTMLElement>('bet');
  readonly spin = must<HTMLButtonElement>('spin');
  readonly ante = must<HTMLButtonElement>('ante');
  readonly turbo = must<HTMLButtonElement>('turbo');
  readonly auto = must<HTMLButtonElement>('auto');
  readonly buyOpen = must<HTMLButtonElement>('buy-open');
  readonly refill = must<HTMLButtonElement>('refill');
  readonly mute = must<HTMLButtonElement>('mute');
  private readonly fsbar = must<HTMLElement>('fsbar');
  private readonly fsCount = must<HTMLElement>('fs-count');
  private readonly banner = must<HTMLElement>('banner');
  private readonly ceremonyEl = must<HTMLElement>('ceremony');
  private readonly ceremonyTitle = must<HTMLElement>('ceremony-title');
  private readonly ceremonyAmount = must<HTMLElement>('ceremony-amount');
  private readonly toastEl = must<HTMLElement>('toast');
  private readonly live = must<HTMLElement>('live');
  private readonly rules = must<HTMLDialogElement>('rules');
  private readonly buy = must<HTMLDialogElement>('buy');
  private readonly buyNote = must<HTMLElement>('buy-note');
  private readonly buyPrice = must<HTMLElement>('buy-price');
  private readonly superPrice = must<HTMLElement>('super-price');
  private readonly autoMenu = must<HTMLElement>('auto-menu');
  private readonly featureCard = must<HTMLElement>('feature-card');
  private readonly featureKicker = must<HTMLElement>('feature-kicker');
  private readonly featureTitle = must<HTMLElement>('feature-title');
  private readonly featureSub = must<HTMLElement>('feature-sub');
  private readonly historyEl = must<HTMLElement>('history');
  private readonly historyList = must<HTMLOListElement>('history-list');
  private readonly soundMenu = must<HTMLElement>('sound-menu');
  private readonly burst = must<HTMLElement>('ceremony-burst');
  private readonly betLabel = must<HTMLElement>('bet-label');
  private toastTimer = 0;
  private skipCeremony: (() => void) | null = null;

  constructor(icons: string[] = []) {
    this.icons = icons;
    this.fillPaytable();
    this.fillRules();
    must<HTMLButtonElement>('rules-close').addEventListener('click', () => this.rules.close());
    const info = must<HTMLButtonElement>('info');
    info.addEventListener('click', () => {
      if (!this.rules.open) this.rules.showModal();
    });
    this.rules.addEventListener('close', () => info.setAttribute('aria-expanded', 'false'));
    this.rules.addEventListener('cancel', () => info.setAttribute('aria-expanded', 'false'));
    const syncRules = () => info.setAttribute('aria-expanded', this.rules.open ? 'true' : 'false');
    info.addEventListener('click', () => window.setTimeout(syncRules, 0));
    must<HTMLButtonElement>('buy-close').addEventListener('click', () => this.buy.close());
    this.buy.addEventListener('close', () => this.buyOpen.setAttribute('aria-expanded', 'false'));
    this.ceremonyEl.addEventListener('click', () => this.skipCeremony?.());
    must<HTMLButtonElement>('history-open').addEventListener('click', () => this.toggleHistory());
    must<HTMLButtonElement>('history-close').addEventListener('click', () => this.hideHistory());
    const soundMore = must<HTMLButtonElement>('sound-more');
    soundMore.addEventListener('click', () => {
      this.soundMenu.hidden = !this.soundMenu.hidden;
      soundMore.setAttribute('aria-expanded', this.soundMenu.hidden ? 'false' : 'true');
    });
  }

  setBalance(cents: number): void {
    this.balance.textContent = formatMoney(cents);
  }

  setWin(cents: number): void {
    this.win.textContent = formatMoney(cents);
  }

  setBet(cents: number, ante = false): void {
    const stake = ante ? Math.round(cents * ANTE_COST_X) : cents;
    this.betLabel.textContent = ante ? 'Ante bet' : 'Bet';
    this.bet.textContent = formatMoney(stake);
    this.buyPrice.textContent = formatMoney(Math.round(cents * BUY_COST_X));
    this.superPrice.textContent = formatMoney(Math.round(cents * SUPER_COST_X));
  }

  setAnte(on: boolean): void {
    this.ante.classList.toggle('on', on);
    this.ante.setAttribute('aria-pressed', on ? 'true' : 'false');
    this.buyOpen.hidden = on;
    this.buyNote.hidden = !on;
  }

  setTurbo(on: boolean): void {
    this.turbo.classList.toggle('on', on);
    this.turbo.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  setMute(on: boolean): void {
    this.mute.classList.toggle('on', !on);
    this.mute.textContent = on ? 'Muted' : 'Sound';
    this.mute.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  setBusy(busy: boolean): void {
    this.spin.textContent = busy ? 'Stop' : 'Spin';
    this.spin.classList.toggle('stop', busy);
    this.ante.disabled = busy;
    this.buyOpen.disabled = busy;
  }

  setAuto(left: number): void {
    this.auto.classList.toggle('on', left > 0);
    this.auto.textContent = left > 0 ? `Auto ${left}` : 'Auto';
    if (left > 0) this.autoMenu.hidden = true;
  }

  toggleAutoMenu(): void {
    this.autoMenu.hidden = !this.autoMenu.hidden;
    this.auto.setAttribute('aria-expanded', this.autoMenu.hidden ? 'false' : 'true');
  }

  hideAutoMenu(): void {
    this.autoMenu.hidden = true;
    this.auto.setAttribute('aria-expanded', 'false');
  }

  autoChoice(kind: 'loss' | 'win'): number {
    const selected = this.autoMenu.querySelector<HTMLButtonElement>(`button.on[data-${kind}]`);
    return Number(selected?.dataset[kind] ?? 0) || 0;
  }

  stopOnFeature(): boolean {
    return must<HTMLInputElement>('stop-feature').checked;
  }

  markAutoChoice(button: HTMLButtonElement): void {
    const key = button.dataset.loss !== undefined ? 'loss' : button.dataset.win !== undefined ? 'win' : '';
    if (!key) return;
    for (const peer of this.autoMenu.querySelectorAll<HTMLButtonElement>(`button[data-${key}]`)) peer.classList.remove('on');
    button.classList.add('on');
  }

  showFs(index: number, awarded: number): void {
    this.fsbar.hidden = false;
    this.fsCount.textContent = `${index} / ${awarded}`;
  }

  hideFs(): void {
    this.fsbar.hidden = true;
  }

  async featureIntro(kicker: string, title: string, sub: string, holdMs: number, cancelled?: () => boolean, superVault = false): Promise<void> {
    this.featureCard.hidden = false;
    this.featureCard.classList.toggle('super', superVault);
    this.featureKicker.textContent = kicker;
    this.featureTitle.textContent = title;
    this.featureSub.textContent = sub;
    const started = performance.now();
    while (performance.now() - started < holdMs) {
      if (cancelled?.()) break;
      await wait(16);
    }
    this.featureCard.hidden = true;
  }

  async bannerText(text: string, holdMs: number, cancelled?: () => boolean): Promise<void> {
    this.banner.hidden = false;
    this.banner.textContent = text;
    const started = performance.now();
    while (performance.now() - started < holdMs) {
      if (cancelled?.()) break;
      await wait(16);
    }
    this.banner.hidden = true;
  }

  hurry(): void {
    this.skipCeremony?.();
  }

  hideBanner(): void {
    this.banner.hidden = true;
  }

  ceremony(title: string, cents: number, instant: boolean): Promise<void> {
    this.ceremonyEl.hidden = false;
    this.ceremonyEl.classList.toggle('hold', instant);
    this.ceremonyEl.classList.toggle('epic', title === 'EPIC WIN' || title === 'MEGA WIN');
    this.ceremonyEl.classList.toggle('legendary', title === 'LEGENDARY');
    this.ceremonyTitle.textContent = title;
    fillCoins(this.burst, instant);
    this.announce(`${title} ${formatMoney(cents)}`);
    if (instant) {
      this.ceremonyAmount.textContent = formatMoney(cents);
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const started = performance.now();
      const duration = title === 'LEGENDARY' ? 4600 : title === 'EPIC WIN' ? 3400 : title === 'MEGA WIN' ? 2600 : 1800;
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        this.skipCeremony = null;
        this.ceremonyAmount.textContent = formatMoney(cents);
        window.setTimeout(() => {
          this.ceremonyEl.hidden = true;
          resolve();
        }, 700);
      };
      this.skipCeremony = finish;
      const step = () => {
        if (settled) return;
        const t = Math.min(1, (performance.now() - started) / duration);
        const eased = 1 - (1 - t) * (1 - t);
        this.ceremonyAmount.textContent = formatMoney(Math.round(cents * eased));
        if (t >= 1) finish();
        else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  hideCeremony(): void {
    this.ceremonyEl.hidden = true;
  }

  toast(message: string): void {
    this.toastEl.hidden = false;
    this.toastEl.textContent = message;
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.toastEl.hidden = true;
    }, 2200);
  }

  announce(text: string): void {
    this.live.textContent = text;
  }

  pushHistory(mode: string, stake: number, win: number): void {
    const item = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = mode;
    const money = document.createElement('span');
    money.textContent = `${formatMoney(stake)} → ${formatMoney(win)}`;
    item.append(name, money);
    this.historyList.prepend(item);
    while (this.historyList.children.length > 20) this.historyList.lastElementChild?.remove();
  }

  toggleHistory(): void {
    this.historyEl.hidden = !this.historyEl.hidden;
    must<HTMLButtonElement>('history-open').setAttribute('aria-expanded', this.historyEl.hidden ? 'false' : 'true');
  }

  hideHistory(): void {
    this.historyEl.hidden = true;
    must<HTMLButtonElement>('history-open').setAttribute('aria-expanded', 'false');
  }

  historyOpen(): boolean {
    return !this.historyEl.hidden;
  }

  soundOpen(): boolean {
    return !this.soundMenu.hidden;
  }

  autoOpen(): boolean {
    return !this.autoMenu.hidden;
  }

  onVolumes(music: (value: number) => void, sfx: (value: number) => void): void {
    must<HTMLInputElement>('music').addEventListener('input', (event) => {
      music(Number((event.target as HTMLInputElement).value) / 100);
    });
    must<HTMLInputElement>('sfx').addEventListener('input', (event) => {
      sfx(Number((event.target as HTMLInputElement).value) / 100);
    });
  }

  openBuy(): void {
    if (!this.buy.open) this.buy.showModal();
    this.buyOpen.setAttribute('aria-expanded', 'true');
  }

  closeBuy(): void {
    this.buy.close();
  }

  setRefillVisible(show: boolean): void {
    this.refill.hidden = !show;
  }

  private fillPaytable(): void {
    const root = must<HTMLElement>('paytable');
    const head = document.createElement('div');
    head.className = 'pay-row pay-head';
    head.innerHTML = '<span></span><span>Symbol</span><span>8–9</span><span>10–11</span><span>12+</span>';
    root.appendChild(head);
    SYMBOLS.forEach((symbol, index) => {
      const row = document.createElement('div');
      row.className = 'pay-row';
      const icon = document.createElement('img');
      icon.className = 'pay-icon';
      icon.alt = '';
      const url = this.icons[index];
      if (url) icon.src = url;
      else {
        icon.className = 'swatch';
        icon.style.background = SWATCH[index] ?? '#fff';
      }
      const name = document.createElement('span');
      name.textContent = symbol.name;
      row.append(icon, name);
      if (symbol.tier === 'scatter') {
        const note = document.createElement('span');
        note.textContent = '4 / 5 / 6+ → 3× / 5× / 100×';
        note.style.gridColumn = '3 / span 3';
        row.append(note);
      } else if (symbol.tier === 'multiplier') {
        const note = document.createElement('span');
        note.textContent = `${JELLY_VALUES[0]}× – ${JELLY_VALUES[JELLY_VALUES.length - 1]}×`;
        note.style.gridColumn = '3 / span 3';
        row.append(note);
      } else {
        for (const tier of [0, 1, 2] as const) {
          const cell = document.createElement('span');
          cell.textContent = `${formatPay(PAY[index][tier])}×`;
          row.append(cell);
        }
      }
      root.appendChild(row);
    });
    const tiers = document.createElement('p');
    tiers.className = 'lede';
    tiers.textContent = `Pays are bet multiples for ${tierLabel(0)}, ${tierLabel(1)} and ${tierLabel(2)} anywhere on the grid.`;
    root.appendChild(tiers);
  }

  private fillRules(): void {
    const root = must<HTMLElement>('rules-copy');
    root.className = 'rules';
    const blocks = [
      ['Grid', '6 columns by 5 rows. Eight or more matching symbols anywhere pay as a scatter. Winning symbols leave, the rest fall, and new symbols drop until nothing pays.'],
      ['Jellyfish', 'Multiplier jellyfish show 2× up to 1,000×. At the end of a tumble sequence their values are added together. In the base game that sum multiplies the sequence win. They do nothing on a spin with no symbol win.'],
      ['Vault Seal', '4, 5, or 6+ seals pay 3×, 5×, or 100× and award 15 free spins. Seven or more seals still pay the 6-seal prize. Seal pays are not multiplied. During free spins, 3 or more seals add 5 spins.'],
      ['Tide Meter', 'In free spins, jellyfish that land on a winning sequence are added to the Tide Meter before that spin is paid. The meter then multiplies that win and every later free spin. The water rises with it: the cathedral gives way to the open abyss, then the Kraken’s throne.'],
      ['Ante Bet', `Costs ${ANTE_COST_X}× the bet and uses a strip with more Vault Seals than the base game. Bonus buys are hidden while Ante is on.`],
      ['Bonus Buy', `Bonus Buy costs ${BUY_COST_X}× and starts 15 free spins. Super Buy costs ${SUPER_COST_X}× and starts the Tide Meter at 10×.`],
      ['Cap', 'A round ends at 15,000× the base bet. Demo credits only. The math targets about 96.30% RTP on every mode at very high volatility and is not a certified game.'],
    ];
    for (const [title, copy] of blocks) {
      const h = document.createElement('h3');
      h.textContent = title;
      const p = document.createElement('p');
      p.textContent = copy;
      root.append(h, p);
    }
  }
}

function must<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as T;
}

function fillCoins(root: HTMLElement, hold: boolean): void {
  root.replaceChildren();
  for (let i = 0; i < 22; i++) {
    const coin = document.createElement('span');
    coin.className = 'coin';
    const angle = (i / 22) * Math.PI * 2;
    const dist = 90 + (i % 5) * 28;
    coin.style.left = '50%';
    coin.style.top = '46%';
    coin.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    coin.style.setProperty('--dy', `${Math.sin(angle) * dist - 20}px`);
    if (hold) {
      coin.style.transform = `translate(calc(-50% + var(--dx)), calc(-50% + var(--dy)))`;
    }
    root.append(coin);
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
