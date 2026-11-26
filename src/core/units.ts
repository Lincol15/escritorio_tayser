/*
 * Proyecto:    Tayser 1.0.0
 * Archivo:     src/core/units.ts
 * Autores:     LWYC, RCO, GDMS, JDAP
 * Descripción: Conversión entre mm, cm y pulgadas, fracciones y evaluador de expresiones.
 */
import type { WRGJUnit } from './types';

export const WRGJ_MM_PER: Record<WRGJUnit, number> = { mm: 1, cm: 10, in: 25.4 };
export const WRGJ_UNIT_DECIMALS: Record<WRGJUnit, number> = { mm: 1, cm: 2, in: 3 };
export const WRGJ_UNITS: WRGJUnit[] = ['mm', 'cm', 'in'];

export const wrgjToUnit = (mm: number, u: WRGJUnit): number => mm / WRGJ_MM_PER[u];
export const wrgjFromUnit = (v: number, u: WRGJUnit): number => v * WRGJ_MM_PER[u];

export function wrgjTrimNum(v: number, decimals = 1): string {
  if (!Number.isFinite(v)) return '—';
  const s = v.toFixed(decimals);
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}

export function wrgjFmtLen(mm: number, u: WRGJUnit, suffix = true): string {
  const s = wrgjTrimNum(wrgjToUnit(mm, u), WRGJ_UNIT_DECIMALS[u]);
  return suffix ? `${s} ${u}` : s;
}

/** Pulgadas a fracción (1/16, 1/32 ...) simplificada. */
export function wrgjToFraction(inches: number, denom = 16): string {
  const sign = inches < 0 ? '-' : '';
  const v = Math.abs(inches);
  let whole = Math.floor(v);
  let num = Math.round((v - whole) * denom);
  if (num === denom) {
    whole += 1;
    num = 0;
  }
  if (num === 0) return `${sign}${whole}"`;
  let d = denom;
  while (num % 2 === 0 && d % 2 === 0) {
    num /= 2;
    d /= 2;
  }
  return `${sign}${whole > 0 ? whole + ' ' : ''}${num}/${d}"`;
}

/**
 * Evaluador seguro (sin eval) de expresiones: "1220/2-18", "23 1/2", "3/4", "600,5".
 * Devuelve null si la entrada no es válida.
 */
export function wrgjParseExpression(raw: string): number | null {
  const s = raw.trim().replace(/,/g, '.').replace(/["”″]/g, '').replace(/(mm|cm|in)\s*$/i, '').trim();
  if (!s) return null;
  const mixed = s.match(/^(-?\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const w = Number(mixed[1]);
    const n = Number(mixed[2]);
    const d = Number(mixed[3]);
    if (!d) return null;
    return w < 0 ? w - n / d : w + n / d;
  }
  let i = 0;
  const skip = () => {
    while (s[i] === ' ') i++;
  };
  const num = (): number => {
    skip();
    const m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(s.slice(i));
    if (!m) throw new Error('número');
    i += m[0].length;
    return parseFloat(m[0]);
  };
  const factor = (): number => {
    skip();
    if (s[i] === '-') {
      i++;
      return -factor();
    }
    if (s[i] === '+') {
      i++;
      return factor();
    }
    if (s[i] === '(') {
      i++;
      const v = expr();
      skip();
      if (s[i] !== ')') throw new Error(')');
      i++;
      return v;
    }
    return num();
  };
  const term = (): number => {
    let v = factor();
    for (;;) {
      skip();
      const c = s[i];
      if (c === '*' || c === '×') {
        i++;
        v *= factor();
      } else if (c === '/') {
        i++;
        v /= factor();
      } else return v;
    }
  };
  const expr = (): number => {
    let v = term();
    for (;;) {
      skip();
      const c = s[i];
      if (c === '+') {
        i++;
        v += term();
      } else if (c === '-') {
        i++;
        v -= term();
      } else return v;
    }
  };
  try {
    const v = expr();
    skip();
    if (i !== s.length) return null;
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

export const WRGJ_DEG = Math.PI / 180;
export const wrgjRound = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;
export const wrgjNormDeg = (deg: number) => {
  let d = deg % 360;
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return wrgjRound(d, 2);
};
