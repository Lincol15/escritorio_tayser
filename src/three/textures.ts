// Texturas procedurales (CanvasTexture), generadas sin archivos de imagen.
import * as THREE from 'three';
import type { Material } from '../core/materials';

const SIZE = 512;
const cache = new Map<string, THREE.Texture | null>();

function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) || 1;
}

function shade(hex: string, amt: number): string {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + amt)));
  return `#${c.getHexString()}`;
}

function drawWood(ctx: CanvasRenderingContext2D, base: string, dark: string, r: () => number, knots: boolean) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, SIZE, SIZE);
  for (let i = 0; i < 16; i++) {
    const y = r() * SIZE;
    const h = 8 + r() * 46;
    ctx.globalAlpha = 0.06 + r() * 0.12;
    ctx.fillStyle = r() > 0.5 ? dark : shade(base, 0.06);
    for (const off of [0, -SIZE, SIZE]) ctx.fillRect(0, y + off, SIZE, h);
  }
  for (let i = 0; i < 240; i++) {
    const y0 = r() * SIZE;
    const amp = 1.5 + r() * 6;
    const k = 1 + Math.floor(r() * 3);
    const ph = r() * Math.PI * 2;
    ctx.globalAlpha = 0.05 + r() * 0.22;
    ctx.strokeStyle = dark;
    ctx.lineWidth = 0.4 + r() * 1.6;
    for (const off of [0, -SIZE, SIZE]) {
      ctx.beginPath();
      for (let x = 0; x <= SIZE; x += 8) {
        const y = y0 + off + amp * Math.sin((x / SIZE) * Math.PI * 2 * k + ph);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  if (knots) {
    for (let i = 0; i < 3; i++) {
      const cx = r() * SIZE;
      const cy = r() * SIZE;
      const rx = 10 + r() * 16;
      const ry = 5 + r() * 8;
      for (const ox of [0, -SIZE, SIZE]) {
        for (const oy of [0, -SIZE, SIZE]) {
          const g = ctx.createRadialGradient(cx + ox, cy + oy, 1, cx + ox, cy + oy, rx);
          g.addColorStop(0, shade(dark, -0.15));
          g.addColorStop(0.6, dark);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.globalAlpha = 0.85;
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.ellipse(cx + ox, cy + oy, rx, ry, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 0.25;
          ctx.strokeStyle = dark;
          for (let k = 1; k < 4; k++) {
            ctx.beginPath();
            ctx.ellipse(cx + ox, cy + oy, rx + k * 7, ry + k * 3, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }
    }
  }
  ctx.globalAlpha = 1;
}

function drawSpeckle(ctx: CanvasRenderingContext2D, base: string, r: () => number, count: number, alpha: number, colors: string[]) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, SIZE, SIZE);
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = alpha * (0.3 + r());
    ctx.fillStyle = colors[Math.floor(r() * colors.length)];
    const s = 1 + r() * 2.2;
    ctx.fillRect(r() * SIZE, r() * SIZE, s, s);
  }
  ctx.globalAlpha = 1;
}

function drawConcrete(ctx: CanvasRenderingContext2D, base: string, r: () => number) {
  drawSpeckle(ctx, base, r, 14000, 0.16, [shade(base, -0.2), shade(base, 0.15), shade(base, -0.08)]);
  for (let i = 0; i < 14; i++) {
    const x = r() * SIZE;
    const y = r() * SIZE;
    const rad = 30 + r() * 90;
    const g = ctx.createRadialGradient(x, y, 1, x, y, rad);
    g.addColorStop(0, shade(base, r() > 0.5 ? -0.07 : 0.06));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  ctx.globalAlpha = 1;
}

function drawBrick(ctx: CanvasRenderingContext2D, base: string, mortar: string, r: () => number) {
  ctx.fillStyle = mortar;
  ctx.fillRect(0, 0, SIZE, SIZE);
  const rows = 8;
  const rh = SIZE / rows;
  const bw = SIZE / 4;
  for (let row = 0; row < rows; row++) {
    const off = row % 2 ? bw / 2 : 0;
    for (let c = -1; c < 5; c++) {
      ctx.fillStyle = shade(base, (r() - 0.5) * 0.12);
      ctx.fillRect(c * bw + off + 3, row * rh + 3, bw - 6, rh - 6);
    }
  }
}

function drawTiles(ctx: CanvasRenderingContext2D, base: string, grout: string, r: () => number) {
  ctx.fillStyle = grout;
  ctx.fillRect(0, 0, SIZE, SIZE);
  const n = 2;
  const s = SIZE / n;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      ctx.fillStyle = shade(base, (r() - 0.5) * 0.05);
      ctx.fillRect(i * s + 3, j * s + 3, s - 6, s - 6);
    }
  ctx.globalAlpha = 0.05;
  for (let k = 0; k < 4000; k++) {
    ctx.fillStyle = r() > 0.5 ? '#000' : '#fff';
    ctx.fillRect(r() * SIZE, r() * SIZE, 2, 2);
  }
  ctx.globalAlpha = 1;
}

const TILE_MM: Record<string, number> = { wood: 1000, pine: 800, concrete: 2000, paint: 2000, brick: 1000, tiles: 1200, granite: 1000 };

/** Devuelve la textura de un material. variant 'panel' usa UV en mm (repeat = 1/tamaño), 'cyl' usa UV 0..1. */
export function getTexture(mat: Material, variant: 'panel' | 'cyl'): THREE.Texture | null {
  const key = `${mat.id}|${variant}`;
  if (cache.has(key)) return cache.get(key) ?? null;
  if (mat.texture === 'solid' || mat.texture === 'metal' || mat.texture === 'glass') {
    cache.set(key, null);
    return null;
  }
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const r = rng(hash(mat.id));
  const c2 = mat.color2 ?? shade(mat.color, -0.2);
  switch (mat.texture) {
    case 'wood':
      drawWood(ctx, mat.color, c2, r, false);
      break;
    case 'pine':
      drawWood(ctx, mat.color, c2, r, true);
      break;
    case 'concrete':
      drawConcrete(ctx, mat.color, r);
      break;
    case 'paint':
      drawSpeckle(ctx, mat.color, r, 3000, 0.05, [shade(mat.color, -0.1), shade(mat.color, 0.05)]);
      break;
    case 'brick':
      drawBrick(ctx, mat.color, c2, r);
      break;
    case 'tiles':
      drawTiles(ctx, mat.color, c2, r);
      break;
    case 'granite':
      drawSpeckle(ctx, mat.color, r, 16000, 0.5, ['#111', '#666', '#aaa', '#ddd', c2]);
      break;
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  if (variant === 'panel') {
    const t = TILE_MM[mat.texture] ?? 1000;
    tex.repeat.set(1 / t, 1 / t);
  } else {
    tex.center.set(0.5, 0.5);
    tex.rotation = Math.PI / 2;
    tex.repeat.set(0.25, 1);
  }
  tex.needsUpdate = true;
  cache.set(key, tex);
  return tex;
}

/** Miniatura para selectores de acabado */
export function swatchDataUrl(mat: Material): string {
  const tex = getTexture(mat, 'cyl');
  const img = tex?.image as HTMLCanvasElement | undefined;
  if (img && 'toDataURL' in img) return img.toDataURL('image/png');
  return '';
}
