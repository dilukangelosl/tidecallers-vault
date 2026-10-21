import { Texture } from 'pixi.js';

export interface ArtSet {
  symbols: Texture[];
  /** PNG data URLs, index-aligned with `symbols`, for the paytable. */
  icons: string[];
  sealCrack: Texture;
  backgrounds: Texture[];
  character: Texture[];
  ray: Texture;
  bubble: Texture;
  mote: Texture;
}

function canvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');
  return [c, ctx];
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha = 1): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function gem(color: string, deep: string, ink: string): Texture {
  const [c, ctx] = canvas(256);
  glow(ctx, 128, 128, 120, color, 0.55);
  const g = ctx.createLinearGradient(70, 40, 190, 220);
  g.addColorStop(0, '#f7feff');
  g.addColorStop(0.18, color);
  g.addColorStop(0.55, deep);
  g.addColorStop(1, ink);
  ctx.beginPath();
  ctx.moveTo(128, 28);
  ctx.lineTo(196, 78);
  ctx.lineTo(188, 168);
  ctx.lineTo(128, 226);
  ctx.lineTo(68, 168);
  ctx.lineTo(60, 78);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(128, 28);
  ctx.lineTo(128, 226);
  ctx.moveTo(60, 78);
  ctx.lineTo(196, 78);
  ctx.moveTo(68, 168);
  ctx.lineTo(188, 168);
  ctx.moveTo(60, 78);
  ctx.lineTo(128, 130);
  ctx.lineTo(196, 78);
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(104, 74, 18, 8, -0.6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fill();
  return Texture.from(c);
}

function plate(ctx: CanvasRenderingContext2D, rim: string, core: string, shape: 'shell' | 'arch' | 'tablet' | 'crest'): void {
  glow(ctx, 128, 132, 122, core, 0.5);
  ctx.save();
  ctx.translate(128, 132);
  ctx.beginPath();
  if (shape === 'shell') {
    ctx.moveTo(-78, 18);
    ctx.bezierCurveTo(-96, -78, 96, -78, 78, 18);
    ctx.bezierCurveTo(44, 86, -44, 86, -78, 18);
  } else if (shape === 'arch') {
    ctx.moveTo(-80, 70);
    ctx.lineTo(-80, -8);
    ctx.bezierCurveTo(-80, -96, 80, -96, 80, -8);
    ctx.lineTo(80, 70);
    ctx.closePath();
  } else if (shape === 'tablet') {
    ctx.roundRect(-58, -102, 116, 196, 22);
  } else {
    ctx.moveTo(0, -104);
    ctx.bezierCurveTo(92, -72, 84, 36, 0, 100);
    ctx.bezierCurveTo(-84, 36, -92, -72, 0, -104);
  }
  const g = ctx.createLinearGradient(-50, -90, 46, 96);
  g.addColorStop(0, '#245860');
  g.addColorStop(0.42, '#0d2830');
  g.addColorStop(1, '#040c10');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = rim;
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.stroke();
  ctx.restore();
}

function chalice(): Texture {
  const [c, ctx] = canvas(256);
  plate(ctx, '#f0c56a', '#3ef0ff', 'shell');
  ctx.save();
  ctx.translate(128, 132);
  ctx.strokeStyle = '#f3e2b0';
  ctx.fillStyle = '#f7e7c0';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-34, -28);
  ctx.quadraticCurveTo(-40, 10, -16, 18);
  ctx.lineTo(16, 18);
  ctx.quadraticCurveTo(40, 10, 34, -28);
  ctx.quadraticCurveTo(0, -8, -34, -28);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 18);
  ctx.lineTo(0, 48);
  ctx.moveTo(-22, 52);
  ctx.lineTo(22, 52);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-28, -6);
  ctx.bezierCurveTo(-52, -20, -48, 24, -18, 8);
  ctx.strokeStyle = '#7ef6ff';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-46, -8, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#7ef6ff';
  ctx.fill();
  ctx.restore();
  return Texture.from(c);
}

function crown(): Texture {
  const [c, ctx] = canvas(256);
  plate(ctx, '#ffe08a', '#ffd27a', 'arch');
  ctx.save();
  ctx.translate(128, 136);
  ctx.strokeStyle = '#ffe7a8';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  for (let i = 0; i < 18; i++) {
    const t = i / 18;
    const a = t * Math.PI * 3.2 - 0.4;
    const r = 18 + t * 28;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r * 0.15, Math.sin(a) * r * 0.72 - 10, Math.max(2, 7 - t * 3), 0, Math.PI * 2);
    ctx.fillStyle = i % 2 ? '#fff6d8' : '#f0c15b';
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(-46, 8);
  ctx.lineTo(-28, -36);
  ctx.lineTo(-8, -4);
  ctx.lineTo(0, -48);
  ctx.lineTo(10, -4);
  ctx.lineTo(30, -32);
  ctx.lineTo(46, 10);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -48, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#7ef6ff';
  ctx.fill();
  ctx.restore();
  return Texture.from(c);
}

function trident(): Texture {
  const [c, ctx] = canvas(256);
  plate(ctx, '#bffcff', '#3ef0ff', 'tablet');
  ctx.save();
  ctx.translate(128, 128);
  ctx.strokeStyle = '#e9fbff';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 58);
  ctx.lineTo(0, -20);
  ctx.moveTo(-34, -36);
  ctx.quadraticCurveTo(-34, -8, 0, -8);
  ctx.quadraticCurveTo(34, -8, 34, -36);
  ctx.moveTo(0, -8);
  ctx.lineTo(0, -52);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 8, 16, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(-4, 2, 2, 0, 8, 16);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.4, '#d8fff4');
  g.addColorStop(1, '#7eb8c4');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  return Texture.from(c);
}

function ring(): Texture {
  const [c, ctx] = canvas(256);
  glow(ctx, 128, 128, 118, '#ff4ad8', 0.45);
  const g = ctx.createLinearGradient(70, 40, 190, 220);
  g.addColorStop(0, '#fff6fb');
  g.addColorStop(0.2, '#ffd0ec');
  g.addColorStop(0.55, '#d23b7a');
  g.addColorStop(1, '#3a1024');
  ctx.beginPath();
  ctx.moveTo(128, 36);
  ctx.lineTo(196, 84);
  ctx.lineTo(184, 176);
  ctx.lineTo(128, 220);
  ctx.lineTo(72, 176);
  ctx.lineTo(60, 84);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(128, 128, 46, 0, Math.PI * 2);
  ctx.lineWidth = 16;
  ctx.strokeStyle = '#f0c15b';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(128, 128, 46, 0, Math.PI * 2);
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#fff6d2';
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(128, 36);
  ctx.lineTo(128, 220);
  ctx.moveTo(60, 84);
  ctx.lineTo(196, 84);
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(108, 78, 16, 7, -0.6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(128, 128, 12, 8, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#041016';
  ctx.fill();
  return Texture.from(c);
}

function mask(): Texture {
  const [c, ctx] = canvas(256);
  plate(ctx, '#7ef6ff', '#ff4ad8', 'crest');
  ctx.save();
  ctx.translate(128, 132);
  const face = ctx.createLinearGradient(0, -50, 0, 50);
  face.addColorStop(0, '#d7fff4');
  face.addColorStop(0.45, '#8fd0c8');
  face.addColorStop(1, '#245e68');
  ctx.beginPath();
  ctx.moveTo(0, -58);
  ctx.bezierCurveTo(46, -50, 42, 20, 18, 48);
  ctx.quadraticCurveTo(0, 62, -18, 48);
  ctx.bezierCurveTo(-42, 20, -46, -50, 0, -58);
  ctx.fillStyle = face;
  ctx.fill();
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * 16, -4, 12, 7, side * -0.2, 0, Math.PI * 2);
    ctx.fillStyle = '#04141c';
    ctx.fill();
    glow(ctx, side * 16 + 128 - 128, -4, 16, '#7ef6ff', 0.9);
  }
  ctx.strokeStyle = '#ff4ad8';
  ctx.lineWidth = 3;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 8, -58);
    ctx.quadraticCurveTo(i * 14, -78, i * 18, -96);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(-8, 28);
  ctx.quadraticCurveTo(0, 36, 8, 28);
  ctx.strokeStyle = '#245e68';
  ctx.stroke();
  ctx.restore();
  return Texture.from(c);
}

function seal(cracked: boolean): Texture {
  const [c, ctx] = canvas(256);
  glow(ctx, 128, 128, 150, cracked ? '#ffd0f2' : '#f4fffe', 0.95);
  glow(ctx, 128, 128, 108, cracked ? '#ff4ad8' : '#3ef0ff', 0.9);
  ctx.beginPath();
  ctx.arc(128, 128, 100, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(110, 100, 10, 128, 128, 100);
  g.addColorStop(0, '#3c4e56');
  g.addColorStop(0.5, '#1b2c34');
  g.addColorStop(1, '#070d12');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 12;
  ctx.strokeStyle = cracked ? '#ffe6f7' : '#f3fffd';
  ctx.stroke();
  ctx.save();
  ctx.translate(128, 128);
  ctx.strokeStyle = '#7ef6ff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let i = 0; i < 40; i++) {
    const t = i / 40;
    const a = t * Math.PI * 4;
    const r = 18 + t * 42;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r * 0.92;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fillStyle = cracked ? '#ff4ad8' : '#e8fff8';
  ctx.fill();
  if (cracked) {
    ctx.strokeStyle = '#ffe6f7';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-8, -70);
    ctx.lineTo(6, -20);
    ctx.lineTo(-10, 8);
    ctx.lineTo(12, 74);
    ctx.moveTo(6, -20);
    ctx.lineTo(36, -8);
    ctx.stroke();
  }
  ctx.restore();
  return Texture.from(c);
}

function jelly(): Texture {
  const [c, ctx] = canvas(256);
  glow(ctx, 128, 110, 110, '#7ef6ff', 0.65);
  const bell = ctx.createRadialGradient(110, 90, 10, 128, 110, 80);
  bell.addColorStop(0, 'rgba(255,255,255,0.95)');
  bell.addColorStop(0.35, 'rgba(126,246,255,0.75)');
  bell.addColorStop(1, 'rgba(255,74,216,0.15)');
  ctx.beginPath();
  ctx.ellipse(128, 108, 70, 52, 0, Math.PI, 0);
  ctx.quadraticCurveTo(128, 150, 58, 108);
  ctx.fillStyle = bell;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 3;
  ctx.stroke();
  for (const [x, w] of [
    [78, 5],
    [104, 4],
    [128, 6],
    [154, 4],
    [176, 5],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(x, 108);
    ctx.bezierCurveTo(x - 10, 150, x + 16, 180, x - 4, 214);
    ctx.strokeStyle = 'rgba(126,246,255,0.8)';
    ctx.lineWidth = w;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(108, 96, 14, 8, -0.4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fill();
  return Texture.from(c);
}

function background(stage: 0 | 1 | 2): Texture {
  const c = document.createElement('canvas');
  c.width = 1600;
  c.height = 900;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');
  const sky = ctx.createLinearGradient(0, 0, 0, 900);
  if (stage === 0) {
    sky.addColorStop(0, '#07141c');
    sky.addColorStop(0.45, '#0a2c36');
    sky.addColorStop(1, '#03080c');
  } else if (stage === 1) {
    sky.addColorStop(0, '#02060c');
    sky.addColorStop(0.4, '#062033');
    sky.addColorStop(1, '#010308');
  } else {
    sky.addColorStop(0, '#14010e');
    sky.addColorStop(0.42, '#2a0630');
    sky.addColorStop(1, '#07010a');
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 1600, 900);

  if (stage === 0) {
    for (const x of [280, 800, 1320]) {
      ctx.beginPath();
      ctx.moveTo(x - 180, 860);
      ctx.bezierCurveTo(x - 170, 420, x - 80, 180, x, 70);
      ctx.bezierCurveTo(x + 80, 180, x + 170, 420, x + 180, 860);
      ctx.fillStyle = 'rgba(4, 16, 22, 0.55)';
      ctx.fill();
      ctx.save();
      ctx.clip();
      const glass = ctx.createLinearGradient(x, 80, x, 700);
      glass.addColorStop(0, 'rgba(126,246,255,0.18)');
      glass.addColorStop(0.5, 'rgba(255,74,216,0.14)');
      glass.addColorStop(1, 'rgba(240,193,91,0.08)');
      ctx.fillStyle = glass;
      ctx.fillRect(x - 180, 70, 360, 800);
      ctx.restore();
      ctx.strokeStyle = 'rgba(126,246,255,0.35)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    for (const x of [120, 1480]) {
      ctx.fillStyle = '#06141a';
      ctx.fillRect(x - 34, 180, 68, 640);
      ctx.strokeStyle = 'rgba(126,246,255,0.3)';
      ctx.strokeRect(x - 34, 180, 68, 640);
      for (let y = 220; y < 780; y += 70) {
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(126,246,255,0.35)';
        ctx.fill();
      }
    }
  } else if (stage === 1) {
    for (let i = 0; i < 7; i++) {
      const x = 140 + i * 220;
      const beam = ctx.createLinearGradient(x, 0, x + 80, 900);
      beam.addColorStop(0, 'rgba(180,230,255,0.16)');
      beam.addColorStop(1, 'rgba(180,230,255,0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 70, 0);
      ctx.lineTo(x + 180, 900);
      ctx.lineTo(x - 40, 900);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(126,246,255,0.15)';
    ctx.lineWidth = 2;
    for (const x of [200, 1400]) {
      ctx.beginPath();
      ctx.moveTo(x, 900);
      ctx.quadraticCurveTo(x + 40, 500, x - 20, 260);
      ctx.stroke();
    }
  } else {
    glow(ctx, 800, 390, 280, '#ff4ad8', 0.55);
    ctx.beginPath();
    ctx.ellipse(800, 400, 150, 90, 0, 0, Math.PI * 2);
    const eye = ctx.createRadialGradient(760, 380, 10, 800, 400, 150);
    eye.addColorStop(0, '#ffe6f6');
    eye.addColorStop(0.25, '#ff4ad8');
    eye.addColorStop(1, '#3a0628');
    ctx.fillStyle = eye;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(800, 400, 18, 70, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#14010c';
    ctx.fill();
    ctx.strokeStyle = '#ff8ad2';
    ctx.lineWidth = 16;
    ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(800 + side * 120, 430 + i * 30);
        ctx.bezierCurveTo(800 + side * 360, 300 + i * 80, 800 + side * 520, 520, 800 + side * 700, 760 - i * 40);
        ctx.stroke();
      }
    }
  }

  // Floor and vignette, shared.
  const floor = ctx.createLinearGradient(0, 620, 0, 900);
  floor.addColorStop(0, 'rgba(0,0,0,0)');
  floor.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = floor;
  ctx.fillRect(0, 620, 1600, 280);
  const vignette = ctx.createRadialGradient(800, 420, 200, 800, 450, 860);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.62)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, 1600, 900);

  ctx.globalAlpha = 0.55;
  for (let i = 0; i < 80; i++) {
    const x = (i * 97) % 1600;
    const y = (i * 53) % 900;
    ctx.fillStyle = i % 4 === 0 ? '#ff4ad8' : '#7ef6ff';
    ctx.beginPath();
    ctx.arc(x, y, i % 5 === 0 ? 2.4 : 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  return Texture.from(c);
}

function character(pose: 'idle' | 'cast'): Texture {
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 960;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');
  glow(ctx, 320, 430, 280, '#3ef0ff', 0.35);
  glow(ctx, 320, 520, 220, '#ff4ad8', 0.18);

  // Hair.
  for (let i = -8; i <= 8; i++) {
    ctx.beginPath();
    ctx.moveTo(320 + i * 8, 250);
    ctx.bezierCurveTo(320 + i * 28, 380, 250 + i * 36, 560, 210 + i * 22, 820);
    const hair = ctx.createLinearGradient(0, 240, 0, 820);
    hair.addColorStop(0, i % 2 ? '#7ef6ff' : '#d7fff8');
    hair.addColorStop(0.6, '#2f8f9a');
    hair.addColorStop(1, '#ff4ad8');
    ctx.strokeStyle = hair;
    ctx.lineWidth = 7;
    ctx.stroke();
  }

  // Gown.
  const gown = ctx.createLinearGradient(320, 360, 320, 920);
  gown.addColorStop(0, '#12343c');
  gown.addColorStop(0.5, '#0b242c');
  gown.addColorStop(1, '#061016');
  ctx.beginPath();
  ctx.moveTo(250, 430);
  ctx.quadraticCurveTo(180, 620, 120, 920);
  ctx.lineTo(520, 920);
  ctx.quadraticCurveTo(460, 620, 390, 430);
  ctx.closePath();
  ctx.fillStyle = gown;
  ctx.fill();
  ctx.strokeStyle = 'rgba(126,246,255,0.7)';
  ctx.lineWidth = 3;
  ctx.stroke();
  for (let y = 500; y < 900; y += 36) {
    ctx.beginPath();
    ctx.ellipse(320, y, 70 + (y - 500) * 0.35, 10, 0, 0, Math.PI);
    ctx.strokeStyle = 'rgba(255,74,216,0.35)';
    ctx.stroke();
  }

  // Face and crown.
  const skin = ctx.createLinearGradient(320, 250, 320, 420);
  skin.addColorStop(0, '#e7fff8');
  skin.addColorStop(1, '#8fbfc0');
  ctx.beginPath();
  ctx.ellipse(320, 330, 62, 78, 0, 0, Math.PI * 2);
  ctx.fillStyle = skin;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(292, 328, 16, 8, -0.2, 0, Math.PI * 2);
  ctx.ellipse(348, 328, 16, 8, 0.2, 0, Math.PI * 2);
  ctx.fillStyle = '#062026';
  ctx.fill();
  glow(ctx, 292, 328, 18, '#7ef6ff', 1);
  glow(ctx, 348, 328, 18, '#7ef6ff', 1);
  ctx.strokeStyle = '#ff4ad8';
  ctx.lineWidth = 4;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(320 + i * 14, 250);
    ctx.lineTo(320 + i * 22, 150);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(320 + i * 22, 146, 6, 0, Math.PI * 2);
    ctx.fillStyle = i === 0 ? '#ff4ad8' : '#f0c15b';
    ctx.fill();
  }

  // Arms and orb.
  ctx.strokeStyle = '#d7fff4';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(250, 470);
  ctx.quadraticCurveTo(180, 560, 160, 700);
  ctx.moveTo(390, 470);
  if (pose === 'cast') ctx.quadraticCurveTo(470, 360, 500, 250);
  else ctx.quadraticCurveTo(460, 400, 470, 300);
  ctx.stroke();
  const orbX = pose === 'cast' ? 500 : 470;
  const orbY = pose === 'cast' ? 230 : 280;
  glow(ctx, orbX, orbY, 70, '#ff4ad8', 0.8);
  ctx.beginPath();
  ctx.arc(orbX, orbY, 22, 0, Math.PI * 2);
  ctx.fillStyle = '#f7fbff';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#7ef6ff';
  ctx.stroke();
  return Texture.from(c);
}

function ray(): Texture {
  const c = document.createElement('canvas');
  c.width = 180;
  c.height = 720;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');
  const g = ctx.createLinearGradient(90, 0, 90, 720);
  g.addColorStop(0, 'rgba(232,255,252,0.0)');
  g.addColorStop(0.15, 'rgba(232,255,252,0.55)');
  g.addColorStop(1, 'rgba(232,255,252,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(70, 0);
  ctx.lineTo(110, 0);
  ctx.lineTo(180, 720);
  ctx.lineTo(0, 720);
  ctx.fill();
  return Texture.from(c);
}

function bubble(): Texture {
  const [c, ctx] = canvas(64);
  ctx.beginPath();
  ctx.arc(32, 32, 18, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(200,255,255,0.85)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(26, 26, 5, 3, -0.6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fill();
  return Texture.from(c);
}

function mote(): Texture {
  const [c, ctx] = canvas(32);
  glow(ctx, 16, 16, 16, '#7ef6ff', 1);
  return Texture.from(c);
}

function iconOf(texture: Texture): string {
  const source = texture.source as { resource?: CanvasImageSource };
  return source.resource instanceof HTMLCanvasElement ? source.resource.toDataURL('image/png') : '';
}

export function buildArt(): ArtSet {
  const symbols = [
    gem('#7ef6ff', '#147c8c', '#042026'),
    gem('#b6ff7a', '#3c9a40', '#10240c'),
    gem('#d2b0ff', '#7a46c4', '#1a1030'),
    gem('#ffd27a', '#d4922a', '#2a1806'),
    gem('#ff8aa6', '#d23b5c', '#2a0a12'),
    chalice(),
    crown(),
    trident(),
    ring(),
    mask(),
    seal(false),
    jelly(),
  ];
  return {
    symbols,
    icons: symbols.map(iconOf),
    sealCrack: seal(true),
    backgrounds: [background(0), background(1), background(2)],
    character: [character('idle'), character('cast')],
    ray: ray(),
    bubble: bubble(),
    mote: mote(),
  };
}
