import type { PixiOpal } from 'opal-sprites/pixi';
import type { Container } from 'pixi.js';

export interface OpalRuntime {
  load(url: string, opts?: { scale?: number }): Promise<unknown>;
  render(dt: number): void;
  spawn(asset: unknown, clip: string, x: number, y: number, scale?: number): number;
  set(id: number, x: number, y: number, scale?: number, opacity?: number): void;
  kill(id: number): void;
}

export interface HeroLibrary {
  runtime: OpalRuntime | null;
  /** Texture-backed clips for symbols and the Tidecaller. */
  clips: Map<string, PixiOpal>;
  /** Runtime assets for one-shot VFX and overlays, keyed by hero id. */
  vfx: Map<string, unknown>;
  present: Set<string>;
}

function runtimeOf(library: HeroLibrary): OpalRuntime | null {
  return library.runtime;
}

/** Spawn a one-shot clip. Missing files are a no-op so procedural art stays in charge. */
export function spawnVfx(library: HeroLibrary, id: string, clip: string, x: number, y: number, scale = 0.45): void {
  const asset = library.vfx.get(id);
  const runtime = runtimeOf(library);
  if (!asset || !runtime) return;
  try {
    const handle = runtime.spawn(asset, clip, x, y, scale);
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

export interface LoopedVfx {
  set: (x: number, y: number, scale: number, opacity: number) => void;
  kill: () => void;
}

/** A clip that stays up until `kill`. Used for the free-spin tide overlay. */
export function spawnLoop(
  library: HeroLibrary,
  id: string,
  clip: string,
  x: number,
  y: number,
  scale: number,
  opacity = 1,
): LoopedVfx | null {
  const asset = library.vfx.get(id);
  const runtime = runtimeOf(library);
  if (!asset || !runtime) return null;
  try {
    const handle = runtime.spawn(asset, clip, x, y, scale);
    runtime.set(handle, x, y, scale, opacity);
    return {
      set: (nx, ny, nscale, nopacity) => {
        try {
          runtime.set(handle, nx, ny, nscale, nopacity);
        } catch {
          /* sprite already gone */
        }
      },
      kill: () => {
        try {
          runtime.kill(handle);
        } catch {
          /* already gone */
        }
      },
    };
  } catch {
    return null;
  }
}

/** Move a runtime layer under a scene container so overlays sit behind the reels. */
export function attachLayer(library: HeroLibrary, id: string, parent: Container): void {
  const asset = library.vfx.get(id) as { layer?: Container } | undefined;
  const layer = asset?.layer;
  if (!layer || layer.parent === parent) return;
  try {
    parent.addChild(layer);
  } catch {
    /* layer already destroyed */
  }
}
