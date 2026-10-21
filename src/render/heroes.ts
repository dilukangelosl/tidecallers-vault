import { createPixiOpal, loadOpal, type PixiOpal } from 'opal-sprites/pixi';
import type { Application, Container } from 'pixi.js';
import { HEROES, publicUrl, type HeroSpec } from '../assets/manifest';

export interface HeroLibrary {
  runtime: Awaited<ReturnType<typeof createPixiOpal>> | null;
  /** Texture-backed clips for symbols and the Tidecaller. */
  clips: Map<string, PixiOpal>;
  /** Runtime assets for one-shot VFX and overlays, keyed by hero id. */
  vfx: Map<string, unknown>;
  present: Set<string>;
}

/**
 * Wires both Opal Pixi entry points. Files are loaded only when listed in
 * `opal/index.json`, so a build without video sprites never 404s.
 * Anything missing stays on the procedural art.
 */
export async function loadHeroes(
  app: Application,
  canvas: HTMLCanvasElement,
  stage: Container,
  library: HeroLibrary = { runtime: null, clips: new Map(), vfx: new Map(), present: new Set() },
): Promise<HeroLibrary> {
  try {
    library.runtime = await createPixiOpal(canvas, { app, stage });
  } catch {
    library.runtime = null;
  }

  let listed: string[] = [];
  try {
    const response = await fetch(publicUrl('opal/index.json'));
    if (response.ok) {
      const json = (await response.json()) as { files?: string[] };
      listed = json.files ?? [];
    }
  } catch {
    listed = [];
  }
  library.present = new Set(listed);

  await Promise.all(
    HEROES.map(async (hero) => {
      if (!listed.includes(hero.file)) return;
      await mountHero(library, hero);
    }),
  );
  return library;
}

async function mountHero(library: HeroLibrary, hero: HeroSpec): Promise<void> {
  const url = publicUrl(`opal/${hero.file}`);
  try {
    if (hero.role === 'vfx' || hero.role === 'overlay') {
      if (library.runtime) library.vfx.set(hero.id, await library.runtime.load(url, { scale: 0.5 }));
      return;
    }
    const asset = await loadOpal(url, { scale: 0.5 });
    library.clips.set(hero.id, asset);
  } catch {
    library.clips.delete(hero.id);
  }
}

export function heroSpec(id: string): HeroSpec | undefined {
  return HEROES.find((hero) => hero.id === id);
}

/** Spawn a loaded VFX clip. Missing files are a no-op so procedural art stays in charge. */
export function spawnVfx(library: HeroLibrary, id: string, clip: string, x: number, y: number, scale = 0.45): void {
  const asset = library.vfx.get(id);
  const runtime = library.runtime;
  if (!asset || !runtime) return;
  try {
    const handle = runtime.spawn(asset as never, clip, x, y, scale);
    window.setTimeout(() => {
      try {
        runtime.kill(handle);
      } catch {
        /* already gone */
      }
    }, 1600);
  } catch {
    /* clip name not in the file */
  }
}
