/*
 * ==================================================
 * Proyecto desarrollado por: 4BYTES
 * Equipo de desarrollo de software
 * Proyecto: Tayser - Diseño paramétrico 3D y optimización de cortes
 * Archivo: src/core/units.ts
 * Descripción: Unidades de medida, fracciones y evaluador de expresiones.
 * ==================================================
 */
import type { Unit } from './types';

export const MM_PER: Record<Unit, number> = { mm: 1, cm: 10, in: 25.4 };
export const UNIT_DECIMALS: Record<Unit, number> = { mm: 1, cm: 2, in: 3 };
export const UNITS: Unit[] = ['mm', 'cm', 'in'];

// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Convertir milímetros a la unidad indicada
// ==================================================
export const toUnit = (mm: number, u: Unit): number => mm / MM_PER[u];
// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Convertir un valor de la unidad indicada a milímetros
// ==================================================
export const fromUnit = (v: number, u: Unit): number => v * MM_PER[u];

// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Formatear un número quitando ceros decimales sobrantes
// ==================================================
export function trimNum(v: number, decimals = 1): string {
  if (!Number.isFinite(v)) return '—';
  const s = v.toFixed(decimals);
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}

// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Formatear una longitud en la unidad de trabajo
// ==================================================
export function fmtLen(mm: number, u: Unit, suffix = true): string {
  const s = trimNum(toUnit(mm, u), UNIT_DECIMALS[u]);
  return suffix ? `${s} ${u}` : s;
}

// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Expresar pulgadas como fracción (ej. 23 1/2")
// ==================================================
/**
 * Pulgadas a fracción (1/16, 1/32 ...) simplificada.
 * @author 4BYTES - Equipo de desarrollo
 */
export function toFraction(inches: number, denom = 16): string {
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

// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Evaluar expresiones numéricas escritas por el usuario (2440/3-4, 23 1/2)
// ==================================================
/**
 * Evaluador seguro (sin eval) de expresiones: "1220/2-18", "23 1/2", "3/4", "600,5".
 * Devuelve null si la entrada no es válida.
 * @author 4BYTES - Equipo de desarrollo
 */
export function parseExpression(raw: string): number | null {
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

export const DEG = Math.PI / 180;
// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Redondear a un número de decimales
// ==================================================
export const round = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;
// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Normalizar un ángulo al rango -180..180 grados
// ==================================================
export const normDeg = (deg: number) => {
  let d = deg % 360;
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return round(d, 2);
};
