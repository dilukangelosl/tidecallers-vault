/** Hero clips that can be swapped for Opal video sprites. See ASSETS.md. */
export interface HeroSpec {
  id: string;
  file: string;
  /** Clips the game will ask for, in order. The first is the idle / loop. */
  clips: string[];
  /** Normalized anchor. Feet anchors are reapplied per clip for the Tidecaller. */
  anchor: { x: number; y: number };
  /** How the sprite is used once a file is listed in public/opal/index.json. */
  role: 'character' | 'symbol' | 'vfx' | 'overlay';
}

export const HEROES: readonly HeroSpec[] = [
  {
    id: 'tidecaller',
    file: 'tidecaller.opal',
    clips: ['idle', 'cast'],
    anchor: { x: 0.5, y: 0.92 },
    role: 'character',
  },
  {
    id: 'jellyfish',
    file: 'jellyfish.opal',
    clips: ['float', 'pulse', 'burst'],
    anchor: { x: 0.5, y: 0.42 },
    role: 'symbol',
  },
  {
    id: 'vault-seal',
    file: 'vault-seal.opal',
    clips: ['idle', 'crack'],
    anchor: { x: 0.5, y: 0.5 },
    role: 'symbol',
  },
  {
    id: 'kraken',
    file: 'kraken.opal',
    clips: ['sweep'],
    anchor: { x: 0.15, y: 0.55 },
    role: 'vfx',
  },
  {
    id: 'bubbles',
    file: 'bubbles.opal',
    clips: ['pop'],
    anchor: { x: 0.5, y: 0.5 },
    role: 'vfx',
  },
  {
    id: 'tide',
    file: 'tide.opal',
    clips: ['overlay'],
    anchor: { x: 0.5, y: 0 },
    role: 'overlay',
  },
];

export function publicUrl(path: string): string {
  const base = import.meta.env.BASE_URL || './';
  return `${base}${path.replace(/^\//, '')}`;
}
