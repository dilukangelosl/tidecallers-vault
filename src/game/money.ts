export const BETS_CENTS = [20, 40, 60, 100, 150, 200, 300, 500, 800, 1000, 2000, 4000, 6000, 10000];
export const START_BALANCE_CENTS = 500_000;

export function formatMoney(cents: number): string {
  const neg = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const whole = Math.floor(abs / 100).toLocaleString('en-US');
  const frac = (abs % 100).toString().padStart(2, '0');
  return `${neg ? '-' : ''}${whole}.${frac}`;
}

export function formatPay(n: number): string {
  if (Number.isInteger(n)) return `${n}`;
  return n.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}

export function winTier(multiple: number): string | null {
  if (multiple >= 250) return 'LEGENDARY';
  if (multiple >= 100) return 'EPIC WIN';
  if (multiple >= 40) return 'MEGA WIN';
  if (multiple >= 15) return 'BIG WIN';
  return null;
}
