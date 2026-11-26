/*
 * Proyecto:    Tayser 1.0.0
 * Archivo:     src/three/textures.ts
 * Autores:     LWYC, RCO, GDMS, JDAP
 * Descripción: Texturas generadas por código.
 */
// Texturas procedurales (CanvasTexture), generadas sin archivos de imagen.
import * as THREE from 'three';
import type { WRGJMaterial } from '../core/materials';

const WRGJ_TEX_SIZE = 512;
const wrgjTexCache = new Map<string, THREE.Texture | null>();

function wrgjRng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
function wrgjHash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) || 1;
}

function wrgjShade(hex: string, amt: number): string {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + amt)));
  return `#${c.getHexString()}`;
}

function wrgjDrawWood(ctx: CanvasRenderingContext2D, base: string, dark: string, r: () => number, knots: boolean) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, WRGJ_TEX_SIZE, WRGJ_TEX_SIZE);
  for (let i = 0; i < 16; i++) {
    const y = r() * WRGJ_TEX_SIZE;
    const h = 8 + r() * 46;
    ctx.globalAlpha = 0.06 + r() * 0.12;
    ctx.fillStyle = r() > 0.5 ? dark : wrgjShade(base, 0.06);
    for (const off of [0, -WRGJ_TEX_SIZE, WRGJ_TEX_SIZE]) ctx.fillRect(0, y + off, WRGJ_TEX_SIZE, h);
  }
  for (let i = 0; i < 240; i++) {
    const y0 = r() * WRGJ_TEX_SIZE;
    const amp = 1.5 + r() * 6;
    const k = 1 + Math.floor(r() * 3);
    const ph = r() * Math.PI * 2;
    ctx.globalAlpha = 0.05 + r() * 0.22;
    ctx.strokeStyle = dark;
    ctx.lineWidth = 0.4 + r() * 1.6;
    for (const off of [0, -WRGJ_TEX_SIZE, WRGJ_TEX_SIZE]) {
      ctx.beginPath();
      for (let x = 0; x <= WRGJ_TEX_SIZE; x += 8) {
        const y = y0 + off + amp * Math.sin((x / WRGJ_TEX_SIZE) * Math.PI * 2 * k + ph);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  if (knots) {
    for (let i = 0; i < 3; i++) {
      const cx = r() * WRGJ_TEX_SIZE;
      const cy = r() * WRGJ_TEX_SIZE;
      const rx = 10 + r() * 16;
      const ry = 5 + r() * 8;
      for (const ox of [0, -WRGJ_TEX_SIZE, WRGJ_TEX_SIZE]) {
        for (const oy of [0, -WRGJ_TEX_SIZE, WRGJ_TEX_SIZE]) {
          const g = ctx.createRadialGradient(cx + ox, cy + oy, 1, cx + ox, cy + oy, rx);
          g.addColorStop(0, wrgjShade(dark, -0.15));
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

function wrgjDrawSpeckle(ctx: CanvasRenderingContext2D, base: string, r: () => number, count: number, alpha: number, colors: string[]) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, WRGJ_TEX_SIZE, WRGJ_TEX_SIZE);
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = alpha * (0.3 + r());
    ctx.fillStyle = colors[Math.floor(r() * colors.length)];
    const s = 1 + r() * 2.2;
    ctx.fillRect(r() * WRGJ_TEX_SIZE, r() * WRGJ_TEX_SIZE, s, s);
  }
  ctx.globalAlpha = 1;
}

function wrgjDrawConcrete(ctx: CanvasRenderingContext2D, base: string, r: () => number) {
  wrgjDrawSpeckle(ctx, base, r, 14000, 0.16, [wrgjShade(base, -0.2), wrgjShade(base, 0.15), wrgjShade(base, -0.08)]);
  for (let i = 0; i < 14; i++) {
    const x = r() * WRGJ_TEX_SIZE;
    const y = r() * WRGJ_TEX_SIZE;
    const rad = 30 + r() * 90;
    const g = ctx.createRadialGradient(x, y, 1, x, y, rad);
    g.addColorStop(0, wrgjShade(base, r() > 0.5 ? -0.07 : 0.06));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  ctx.globalAlpha = 1;
}

function wrgjDrawBrick(ctx: CanvasRenderingContext2D, base: string, mortar: string, r: () => number) {
  ctx.fillStyle = mortar;
  ctx.fillRect(0, 0, WRGJ_TEX_SIZE, WRGJ_TEX_SIZE);
  const rows = 8;
  const rh = WRGJ_TEX_SIZE / rows;
  const bw = WRGJ_TEX_SIZE / 4;
  for (let row = 0; row < rows; row++) {
    const off = row % 2 ? bw / 2 : 0;
    for (let c = -1; c < 5; c++) {
      ctx.fillStyle = wrgjShade(base, (r() - 0.5) * 0.12);
      ctx.fillRect(c * bw + off + 3, row * rh + 3, bw - 6, rh - 6);
    }
  }
}

function wrgjDrawTiles(ctx: CanvasRenderingContext2D, base: string, grout: string, r: () => number) {
  ctx.fillStyle = grout;
  ctx.fillRect(0, 0, WRGJ_TEX_SIZE, WRGJ_TEX_SIZE);
  const n = 2;
  const s = WRGJ_TEX_SIZE / n;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      ctx.fillStyle = wrgjShade(base, (r() - 0.5) * 0.05);
      ctx.fillRect(i * s + 3, j * s + 3, s - 6, s - 6);
    }
  ctx.globalAlpha = 0.05;
  for (let k = 0; k < 4000; k++) {
    ctx.fillStyle = r() > 0.5 ? '#000' : '#fff';
    ctx.fillRect(r() * WRGJ_TEX_SIZE, r() * WRGJ_TEX_SIZE, 2, 2);
  }
  ctx.globalAlpha = 1;
}

const WRGJ_TILE_MM: Record<string, number> = { wood: 1000, pine: 800, concrete: 2000, paint: 2000, brick: 1000, tiles: 1200, granite: 1000 };

/** Devuelve la textura de un material. variant 'panel' usa UV en mm (repeat = 1/tamaño), 'cyl' usa UV 0..1. */
export function wrgjGetTexture(mat: WRGJMaterial, variant: 'panel' | 'cyl'): THREE.Texture | null {
  const key = `${mat.id}|${variant}`;
  if (wrgjTexCache.has(key)) return wrgjTexCache.get(key) ?? null;
  if (mat.texture === 'solid' || mat.texture === 'metal' || mat.texture === 'glass') {
    wrgjTexCache.set(key, null);
    return null;
  }
  const canvas = document.createElement('canvas');
  canvas.width = WRGJ_TEX_SIZE;
  canvas.height = WRGJ_TEX_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const r = wrgjRng(wrgjHash(mat.id));
  const c2 = mat.color2 ?? wrgjShade(mat.color, -0.2);
  switch (mat.texture) {
    case 'wood':
      wrgjDrawWood(ctx, mat.color, c2, r, false);
      break;
    case 'pine':
      wrgjDrawWood(ctx, mat.color, c2, r, true);
      break;
    case 'concrete':
      wrgjDrawConcrete(ctx, mat.color, r);
      break;
    case 'paint':
      wrgjDrawSpeckle(ctx, mat.color, r, 3000, 0.05, [wrgjShade(mat.color, -0.1), wrgjShade(mat.color, 0.05)]);
      break;
    case 'brick':
      wrgjDrawBrick(ctx, mat.color, c2, r);
      break;
    case 'tiles':
      wrgjDrawTiles(ctx, mat.color, c2, r);
      break;
    case 'granite':
      wrgjDrawSpeckle(ctx, mat.color, r, 16000, 0.5, ['#111', '#666', '#aaa', '#ddd', c2]);
      break;
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  if (variant === 'panel') {
    const t = WRGJ_TILE_MM[mat.texture] ?? 1000;
    tex.repeat.set(1 / t, 1 / t);
  } else {
    tex.center.set(0.5, 0.5);
    tex.rotation = Math.PI / 2;
    tex.repeat.set(0.25, 1);
  }
  tex.needsUpdate = true;
  wrgjTexCache.set(key, tex);
  return tex;
}

/** Miniatura para selectores de acabado */
export function wrgjSwatchDataUrl(mat: WRGJMaterial): string {
  const tex = wrgjGetTexture(mat, 'cyl');
  const img = tex?.image as HTMLCanvasElement | undefined;
  if (img && 'toDataURL' in img) return img.toDataURL('image/png');
  return '';
}
