import { createPixiOpal, loadOpal } from 'opal-sprites/pixi';
import type { Application, Container } from 'pixi.js';
import { HEROES, publicUrl, type HeroSpec } from '../assets/manifest';
import type { HeroLibrary } from './heroes';

/**
 * Wires both Opal Pixi entry points. Files are loaded only when listed in
 * `opal/index.json`, so a build without video sprites never 404s.
 * Anything missing stays on the procedural art.
 * This module is dynamically imported so the decoder stays out of the first paint.
 */
export async function loadHeroes(
  app: Application,
  canvas: HTMLCanvasElement,
  stage: Container,
  library: HeroLibrary,
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

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function mountHero(library: HeroLibrary, hero: HeroSpec): Promise<void> {
  const url = publicUrl(`opal/${hero.file}`);
  try {
    if (hero.role === 'vfx' || hero.role === 'overlay') {
      if (library.runtime) library.vfx.set(hero.id, await withTimeout(library.runtime.load(url, { scale: 0.5 }), 40000));
      return;
    }
    const asset = await withTimeout(loadOpal(url, { scale: 0.5 }), 40000);
    library.clips.set(hero.id, asset);
  } catch {
    library.clips.delete(hero.id);
  }
}
