/*
 * Proyecto:    Tayser 1.0.0
 * Archivo:     src/core/calculators.ts
 * Autores:     LWYC, RCO, GDMS, JDAP
 * Descripción: Calculadoras de taller.
 */
// Calculadoras de taller (funciones puras, medidas en mm)
import { toFraction } from './units';

export interface CutPart {
  name: string;
  qty: number;
  length: number;
  width: number;
  thickness: number;
  note?: string;
}

// 1. Gavetas / cajones
export interface DrawerInput {
  openingWidth: number;
  depth: number;
  boxHeight: number;
  sideThickness: number;
  bottomThickness: number;
  /** descuento por lado de la corredera telescópica (típico 12.7 mm) */
  slideClearance: number;
  bottomMode: 'ranura' | 'clavado';
  grooveDepth: number;
  rearClearance: number;
}

export interface DrawerResult {
  slideLength: number;
  outerWidth: number;
  innerWidth: number;
  totalDiscount: number;
  parts: CutPart[];
  notes: string[];
}

export const SLIDE_LENGTHS = [250, 300, 350, 400, 450, 500, 550, 600, 650, 700];

export function calcDrawer(i: DrawerInput): DrawerResult {
  const usable = i.depth - i.rearClearance;
  const fit = SLIDE_LENGTHS.filter((l) => l <= usable);
  const slideLength = fit.length ? fit[fit.length - 1] : Math.max(100, Math.floor(usable / 10) * 10);
  const totalDiscount = 2 * i.slideClearance;
  const outerWidth = i.openingWidth - totalDiscount;
  const innerWidth = outerWidth - 2 * i.sideThickness;
  const parts: CutPart[] = [
    { name: 'Lateral de gaveta', qty: 2, length: slideLength, width: i.boxHeight, thickness: i.sideThickness },
  ];
  const notes: string[] = [
    `Corredera recomendada: ${slideLength} mm (profundidad útil ${usable} mm).`,
    `Descuento total por correderas: ${totalDiscount} mm (${i.slideClearance} mm por lado).`,
    `Ancho exterior de la caja: ${outerWidth.toFixed(1)} mm.`,
  ];
  if (i.bottomMode === 'ranura') {
    const backH = i.boxHeight - 12 - i.bottomThickness;
    parts.push({ name: 'Frente interior', qty: 1, length: innerWidth, width: i.boxHeight, thickness: i.sideThickness });
    parts.push({ name: 'Trasera', qty: 1, length: innerWidth, width: backH, thickness: i.sideThickness, note: 'Apoyada sobre el fondo' });
    parts.push({
      name: 'Fondo (en ranura)',
      qty: 1,
      length: innerWidth + 2 * i.grooveDepth - 2,
      width: slideLength - i.sideThickness + i.grooveDepth - 2,
      thickness: i.bottomThickness,
      note: `Ranura de ${i.grooveDepth} mm a 12 mm del borde inferior`,
    });
    notes.push('Fondo en ranura: se desliza por detrás, la trasera queda sobre el fondo.');
  } else {
    parts.push({ name: 'Frente interior', qty: 1, length: innerWidth, width: i.boxHeight, thickness: i.sideThickness });
    parts.push({ name: 'Trasera', qty: 1, length: innerWidth, width: i.boxHeight, thickness: i.sideThickness });
    parts.push({ name: 'Fondo (clavado)', qty: 1, length: outerWidth, width: slideLength, thickness: i.bottomThickness, note: 'Clavado/atornillado por debajo' });
  }
  if (outerWidth <= 2 * i.sideThickness + 20) notes.push('⚠ El hueco es demasiado angosto para una gaveta.');
  return { slideLength, outerWidth, innerWidth, totalDiscount, parts, notes };
}

// 2. Distribución de repisas
export interface ShelvesInput {
  innerHeight: number;
  spaces: number;
  shelfThickness: number;
  system32: boolean;
  firstHole: number;
}

export interface ShelfPos {
  index: number;
  bottom: number;
  center: number;
  top: number;
  hole?: number;
}

export function calcShelves(i: ShelvesInput): { gap: number; shelves: ShelfPos[]; holes: number[] } {
  const spaces = Math.max(1, Math.round(i.spaces));
  const t = i.shelfThickness;
  const gap = (i.innerHeight - (spaces - 1) * t) / spaces;
  const holes: number[] = [];
  if (i.system32) {
    for (let h = i.firstHole; h <= i.innerHeight - i.firstHole + 0.01; h += 32) holes.push(h);
  }
  const shelves: ShelfPos[] = [];
  for (let k = 1; k < spaces; k++) {
    const bottom = k * gap + (k - 1) * t;
    const s: ShelfPos = { index: k, bottom, center: bottom + t / 2, top: bottom + t };
    if (holes.length) {
      const target = bottom - 5;
      s.hole = holes.reduce((best, h) => (Math.abs(h - target) < Math.abs(best - target) ? h : best), holes[0]);
    }
    shelves.push(s);
  }
  return { gap, shelves, holes };
}

// 3. Frentes de cajones
export interface FrontsInput {
  totalHeight: number;
  totalWidth: number;
  count: number;
  gap: number;
  topGap: number;
  bottomGap: number;
  sideGap: number;
  mode: 'iguales' | 'progresivo';
  ratio: number;
}

export interface FrontPiece {
  index: number;
  height: number;
  width: number;
  /** borde inferior medido desde la base del hueco */
  y: number;
}

export function calcDrawerFronts(i: FrontsInput): { fronts: FrontPiece[]; available: number } {
  const count = Math.max(1, Math.round(i.count));
  const available = i.totalHeight - i.topGap - i.bottomGap - i.gap * (count - 1);
  const weights = Array.from({ length: count }, (_, k) => (i.mode === 'progresivo' ? Math.pow(Math.max(1, i.ratio), count - 1 - k) : 1));
  const sum = weights.reduce((a, b) => a + b, 0);
  let y = i.bottomGap;
  const fronts = weights.map((w, k) => {
    const h = (available * w) / sum;
    const f: FrontPiece = { index: k + 1, height: h, width: i.totalWidth - 2 * i.sideGap, y };
    y += h + i.gap;
    return f;
  });
  return { fronts, available };
}

// 4. Posición de manijas / tiradores
export type HandlePosition = 'centro' | 'superior' | 'inferior' | 'izquierda' | 'derecha' | 'sup-izq' | 'sup-der' | 'inf-izq' | 'inf-der';

export interface HandleInput {
  frontWidth: number;
  frontHeight: number;
  /** distancia entre centros (0 = pomo de un solo agujero) */
  centers: number;
  position: HandlePosition;
  orientation: 'horizontal' | 'vertical';
  edgeOffset: number;
}

export function calcHandle(i: HandleInput): { holes: { x: number; y: number }[]; warnings: string[] } {
  const c = Math.max(0, i.centers);
  const W = i.frontWidth;
  const H = i.frontHeight;
  const e = i.edgeOffset;
  const horiz = i.orientation === 'horizontal';
  const hx = horiz ? c / 2 : 0;
  const hy = horiz ? 0 : c / 2;
  const p = i.position;
  const left = p === 'izquierda' || p.endsWith('izq');
  const right = p === 'derecha' || p.endsWith('der');
  const top = p === 'superior' || p.startsWith('sup');
  const bottom = p === 'inferior' || p.startsWith('inf');
  const x = left ? e + hx : right ? W - e - hx : W / 2;
  const y = top ? H - e - hy : bottom ? e + hy : H / 2;
  const holes = c > 0 ? [{ x: x - hx, y: y - hy }, { x: x + hx, y: y + hy }] : [{ x, y }];
  const warnings: string[] = [];
  holes.forEach((h) => {
    if (h.x < 10 || h.x > W - 10 || h.y < 10 || h.y > H - 10) warnings.push('⚠ Una perforación queda a menos de 10 mm del borde.');
  });
  if (c > (horiz ? W : H)) warnings.push('⚠ La distancia entre centros es mayor que el frente.');
  return { holes, warnings: Array.from(new Set(warnings)) };
}

// 5. Perforación de bisagras
export interface HingeInput {
  doorHeight: number;
  doorWidth: number;
  weight: number;
  edgeDistance: number;
  cupDiameter: number;
  /** distancia K: del canto de la puerta al borde de la cazoleta (3-6 mm) */
  cupK: number;
  cupDepth: number;
}

export interface HingeResult {
  count: number;
  positions: number[];
  cupCenterX: number;
  reasons: string[];
}

export function calcHinges(i: HingeInput): HingeResult {
  const H = i.doorHeight;
  const byHeight = H <= 900 ? 2 : H <= 1600 ? 3 : H <= 2000 ? 4 : H <= 2400 ? 5 : 6;
  const w = i.weight;
  const byWeight = w <= 6 ? 2 : w <= 12 ? 3 : w <= 17 ? 4 : w <= 22 ? 5 : 6;
  let count = Math.max(byHeight, byWeight);
  const reasons = [`Por altura (${H} mm): ${byHeight} bisagras.`, `Por peso (${w} kg): ${byWeight} bisagras.`];
  if (i.doorWidth > 600) {
    count += 1;
    reasons.push('Puerta de más de 600 mm de ancho: +1 bisagra.');
  }
  const positions: number[] = [];
  if (count === 1) positions.push(H / 2);
  else {
    const step = (H - 2 * i.edgeDistance) / (count - 1);
    for (let k = 0; k < count; k++) positions.push(i.edgeDistance + k * step);
  }
  const cupCenterX = i.cupK + i.cupDiameter / 2;
  reasons.push(`Centro de cazoleta Ø${i.cupDiameter} a ${cupCenterX} mm del canto, profundidad ${i.cupDepth} mm.`);
  reasons.push('Base (placa) a 37 mm del frente del lateral, agujeros a 32 mm.');
  return { count, positions, cupCenterX, reasons };
}

// 6. Conversor de unidades
export function convertLength(value: number, from: 'mm' | 'cm' | 'in') {
  const mm = from === 'mm' ? value : from === 'cm' ? value * 10 : value * 25.4;
  const inches = mm / 25.4;
  return {
    mm,
    cm: mm / 10,
    m: mm / 1000,
    in: inches,
    ft: inches / 12,
    frac16: toFraction(inches, 16),
    frac32: toFraction(inches, 32),
    frac64: toFraction(inches, 64),
  };
}
