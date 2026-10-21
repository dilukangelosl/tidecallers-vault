import './styles.css';
import { Application } from 'pixi.js';
import { Game } from './game/controller';
import { buildArt } from './render/art';
import { AudioBus } from './render/audio';
import { loadHeroes, type HeroLibrary } from './render/heroes';
import { Scene } from './render/scene';
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

async function boot(): Promise<void> {
  const canvas = document.getElementById('stage');
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Missing canvas');
  const app = new Application();
  await app.init({
    canvas,
    preference: 'webgl',
    antialias: true,
    background: 0x021014,
    resizeTo: window,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    powerPreference: 'high-performance',
  });
  const art = buildArt();
  const heroes: HeroLibrary = { runtime: null, clips: new Map(), vfx: new Map(), present: new Set() };
  const scene = new Scene(art, heroes);
  scene.mount(app);
  await loadHeroes(app, canvas, scene.camera, heroes);
  scene.layout(app.screen.width, app.screen.height);
  const audio = new AudioBus();
  const hud = new Hud();
  const game = new Game(scene, hud, audio);
  let runtime = heroes.runtime;
  app.ticker.add((ticker) => {
    const dt = ticker.deltaMS / 1000;
    scene.update(dt);
    if (!runtime) return;
    try {
      runtime.render(dt);
    } catch {
      runtime = null;
    }
  });
  const relayout = () => scene.layout(app.screen.width, app.screen.height);
  window.addEventListener('resize', relayout);
  await game.start(new URLSearchParams(location.search));
  window.__TIDECALLER__ = {
    ready: true,
    spin: () => document.getElementById('spin')?.dispatchEvent(new MouseEvent('click', { bubbles: true })),
    state: () => game.state(),
  };
  document.body.dataset.ready = '1';
}

boot().catch(() => {
  if (bootError) {
    bootError.hidden = false;
    bootError.textContent = 'The vault could not open in this browser.';
  }
});
