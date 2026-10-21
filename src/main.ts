import './styles.css';
import { Application } from 'pixi.js';
import { Game } from './game/controller';
import { buildArt } from './render/art';
import { AudioBus } from './render/audio';
import type { HeroLibrary } from './render/heroes';
import { Scene, type Chrome } from './render/scene';
import { Hud } from './ui/hud';

declare global {
  interface Window {
    __TIDECALLER__?: {
      ready: boolean;
      spin: () => void;
      state: () => ReturnType<Game['state']>;
    };
  }
}

const bootError = document.getElementById('boot-error');

function measureChrome(appEl: HTMLElement): Chrome {
  const appRect = appEl.getBoundingClientRect();
  const header = document.querySelector('header.top');
  const dock = document.querySelector('footer.dock');
  const ui = document.getElementById('ui');
  const headerRect = header?.getBoundingClientRect();
  const dockRect = dock?.getBoundingClientRect();
  const uiRect = ui?.getBoundingClientRect();
  return {
    top: headerRect ? Math.max(0, headerRect.bottom - appRect.top) : 72,
    bottom: dockRect ? Math.max(0, appRect.bottom - dockRect.top) : 128,
    left: uiRect ? Math.max(8, uiRect.left - appRect.left + 6) : 16,
    right: uiRect ? Math.max(8, appRect.right - uiRect.right + 6) : 16,
  };
}

async function boot(): Promise<void> {
  const canvas = document.getElementById('stage');
  const appEl = document.getElementById('app');
  const loading = document.getElementById('loading');
  if (!(canvas instanceof HTMLCanvasElement) || !appEl) throw new Error('Missing canvas');
  const app = new Application();
  const width = Math.max(1, appEl.clientWidth);
  const height = Math.max(1, appEl.clientHeight);
  await app.init({
    canvas,
    preference: 'webgl',
    antialias: true,
    background: 0x021014,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    width,
    height,
    powerPreference: 'high-performance',
  });
  const art = buildArt();
  const heroes: HeroLibrary = { runtime: null, clips: new Map(), vfx: new Map(), present: new Set() };
  const scene = new Scene(art, heroes);
  scene.mount(app);
  const audio = new AudioBus();
  const hud = new Hud(art.icons);
  const game = new Game(scene, hud, audio);
  const fit = () => {
    const nextW = Math.max(1, appEl.clientWidth);
    const nextH = Math.max(1, appEl.clientHeight);
    app.renderer.resize(nextW, nextH);
    canvas.style.width = `${nextW}px`;
    canvas.style.height = `${nextH}px`;
    scene.layout(nextW, nextH, measureChrome(appEl));
  };
  fit();
  const observer = new ResizeObserver(() => fit());
  observer.observe(appEl);
  window.addEventListener('resize', fit);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) app.ticker.stop();
    else app.ticker.start();
  });
  app.ticker.add((ticker) => {
    const dt = ticker.deltaMS / 1000;
    scene.update(dt);
    const runtime = heroes.runtime;
    if (!runtime) return;
    try {
      runtime.render(dt);
    } catch {
      heroes.runtime = null;
    }
  });
  try {
    const { loadHeroes } = await import('./render/load-heroes');
    await loadHeroes(app, canvas, scene.camera, heroes);
    scene.adoptHeroes();
    fit();
  } catch {
    /* procedural art stays on screen */
  }
  await game.start(new URLSearchParams(location.search));
  window.__TIDECALLER__ = {
    ready: true,
    spin: () => document.getElementById('spin')?.dispatchEvent(new MouseEvent('click', { bubbles: true })),
    state: () => game.state(),
  };
  document.body.dataset.ready = '1';
  if (loading) loading.hidden = true;
}

boot().catch((error) => {
  const loading = document.getElementById('loading');
  if (loading) loading.hidden = true;
  const detail = error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : String(error);
  console.error(detail);
  if (bootError) {
    bootError.hidden = false;
    bootError.textContent = 'The vault could not open in this browser.';
  }
});
