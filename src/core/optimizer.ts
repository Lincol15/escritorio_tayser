// ===================== Optimizador de corte 2D (MaxRects + Guillotina) =====================
// Convención: el LARGO del tablero (sheet.length) es el eje X y la veta del tablero corre a lo largo de X.
// Una pieza con veta activa coloca su largo sobre X y NO se rota 90°.
import type { PackAlgorithm, SheetConfig } from './types';
import type { CutList, MaterialGroup } from './cutlist';

export interface PackItem {
  uid: string;
  code: string;
  name: string;
  w: number;
  h: number;
  canRotate: boolean;
  grain: boolean;
}

export interface Placement {
  uid: string;
  code: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotated: boolean;
  grain: boolean;
}

export interface PackedSheet {
  placements: Placement[];
  usedArea: number;
  utilization: number;
}

export interface GroupOptimization {
  key: string;
  letter: string;
  materialId: string;
  materialName: string;
  thickness: number;
  sheets: PackedSheet[];
  unplaced: PackItem[];
  utilization: number;
  usedArea: number;
  sheetArea: number;
  wasteArea: number;
  algorithm: string;
  sheetLength: number;
  sheetWidth: number;
  trim: number;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Candidate {
  x: number;
  y: number;
  w: number;
  h: number;
  rot: boolean;
  s1: number;
  s2: number;
  free: number;
}

type Heuristic = 'bssf' | 'baf' | 'bl';

interface Bin {
  find(w: number, h: number, canRotate: boolean): Candidate | null;
  commit(c: Candidate): void;
}

const EPS = 1e-6;
const contains = (a: Rect, b: Rect) => b.x >= a.x - EPS && b.y >= a.y - EPS && b.x + b.w <= a.x + a.w + EPS && b.y + b.h <= a.y + a.h + EPS;

function score(f: Rect, rw: number, rh: number, heur: Heuristic): [number, number] {
  const lh = f.w - rw;
  const lv = f.h - rh;
  if (heur === 'bssf') return [Math.min(lh, lv), Math.max(lh, lv)];
  if (heur === 'baf') return [f.w * f.h - rw * rh, Math.min(lh, lv)];
  return [f.y + rh, f.x];
}

class MaxRectsBin implements Bin {
  free: Rect[];
  constructor(W: number, H: number, private heur: Heuristic) {
    this.free = [{ x: 0, y: 0, w: W, h: H }];
  }
  find(w: number, h: number, canRotate: boolean): Candidate | null {
    let best: Candidate | null = null;
    this.free.forEach((f, idx) => {
      for (const rot of canRotate ? [false, true] : [false]) {
        const rw = rot ? h : w;
        const rh = rot ? w : h;
        if (rw <= f.w + EPS && rh <= f.h + EPS) {
          const [s1, s2] = score(f, rw, rh, this.heur);
          if (!best || s1 < best.s1 - EPS || (Math.abs(s1 - best.s1) <= EPS && s2 < best.s2)) best = { x: f.x, y: f.y, w: rw, h: rh, rot, s1, s2, free: idx };
        }
      }
    });
    return best;
  }
  commit(r: Candidate) {
    const next: Rect[] = [];
    for (const f of this.free) {
      if (r.x >= f.x + f.w - EPS || r.x + r.w <= f.x + EPS || r.y >= f.y + f.h - EPS || r.y + r.h <= f.y + EPS) {
        next.push(f);
        continue;
      }
      if (r.x > f.x + EPS) next.push({ x: f.x, y: f.y, w: r.x - f.x, h: f.h });
      if (r.x + r.w < f.x + f.w - EPS) next.push({ x: r.x + r.w, y: f.y, w: f.x + f.w - (r.x + r.w), h: f.h });
      if (r.y > f.y + EPS) next.push({ x: f.x, y: f.y, w: f.w, h: r.y - f.y });
      if (r.y + r.h < f.y + f.h - EPS) next.push({ x: f.x, y: r.y + r.h, w: f.w, h: f.y + f.h - (r.y + r.h) });
    }
    this.free = next.filter((a, i) => !next.some((b, j) => j !== i && contains(b, a) && (!contains(a, b) || j < i)));
  }
}

class GuillotineBin implements Bin {
  free: Rect[];
  constructor(W: number, H: number, private heur: Heuristic) {
    this.free = [{ x: 0, y: 0, w: W, h: H }];
  }
  find(w: number, h: number, canRotate: boolean): Candidate | null {
    let best: Candidate | null = null;
    this.free.forEach((f, idx) => {
      for (const rot of canRotate ? [false, true] : [false]) {
        const rw = rot ? h : w;
        const rh = rot ? w : h;
        if (rw <= f.w + EPS && rh <= f.h + EPS) {
          const [s1, s2] = score(f, rw, rh, this.heur === 'bl' ? 'baf' : this.heur);
          if (!best || s1 < best.s1 - EPS || (Math.abs(s1 - best.s1) <= EPS && s2 < best.s2)) best = { x: f.x, y: f.y, w: rw, h: rh, rot, s1, s2, free: idx };
        }
      }
    });
    return best;
  }
  commit(c: Candidate) {
    const f = this.free[c.free];
    this.free.splice(c.free, 1);
    const lw = f.w - c.w;
    const lh = f.h - c.h;
    let a: Rect;
    let b: Rect;
    // Regla del eje sobrante más corto (cortes de sierra continuos)
    if (lw < lh) {
      a = { x: f.x + c.w, y: f.y, w: lw, h: c.h };
      b = { x: f.x, y: f.y + c.h, w: f.w, h: lh };
    } else {
      a = { x: f.x + c.w, y: f.y, w: lw, h: f.h };
      b = { x: f.x, y: f.y + c.h, w: c.w, h: lh };
    }
    if (a.w > EPS && a.h > EPS) this.free.push(a);
    if (b.w > EPS && b.h > EPS) this.free.push(b);
  }
}

interface PackResult {
  sheets: PackedSheet[];
  unplaced: PackItem[];
  label: string;
}

function pack(items: PackItem[], cfg: SheetConfig, algo: 'maxrects' | 'guillotine', heur: Heuristic, mode: 'global' | 'sorted'): PackResult {
  const k = cfg.kerf;
  const BW = cfg.length - 2 * cfg.trim + k;
  const BH = cfg.width - 2 * cfg.trim + k;
  const sheetArea = cfg.length * cfg.width;
  const fits = (it: PackItem) => (it.w + k <= BW + EPS && it.h + k <= BH + EPS) || (it.canRotate && it.h + k <= BW + EPS && it.w + k <= BH + EPS);
  const unplaced = items.filter((it) => !fits(it));
  let remaining = items.filter(fits);
  if (mode === 'sorted') remaining = [...remaining].sort((a, b) => b.w * b.h - a.w * a.h || Math.max(b.w, b.h) - Math.max(a.w, a.h));
  const sheets: PackedSheet[] = [];
  while (remaining.length) {
    const bin: Bin = algo === 'maxrects' ? new MaxRectsBin(BW, BH, heur) : new GuillotineBin(BW, BH, heur);
    const placements: Placement[] = [];
    let used = 0;
    for (;;) {
      let bestIdx = -1;
      let best: Candidate | null = null;
      for (let i = 0; i < remaining.length; i++) {
        const it = remaining[i];
        const c = bin.find(it.w + k, it.h + k, it.canRotate);
        if (!c) continue;
        if (mode === 'sorted') {
          bestIdx = i;
          best = c;
          break;
        }
        if (!best || c.s1 < best.s1 - EPS || (Math.abs(c.s1 - best.s1) <= EPS && c.s2 < best.s2)) {
          best = c;
          bestIdx = i;
        }
      }
      if (!best || bestIdx < 0) break;
      const it = remaining[bestIdx];
      bin.commit(best);
      const w = best.rot ? it.h : it.w;
      const h = best.rot ? it.w : it.h;
      placements.push({ uid: it.uid, code: it.code, name: it.name, x: cfg.trim + best.x, y: cfg.trim + best.y, w, h, rotated: best.rot, grain: it.grain });
      used += w * h;
      remaining.splice(bestIdx, 1);
    }
    if (!placements.length) {
      unplaced.push(...remaining);
      break;
    }
    sheets.push({ placements, usedArea: used, utilization: used / sheetArea });
  }
  return { sheets, unplaced, label: `${algo === 'maxrects' ? 'MaxRects' : 'Guillotina'} ${heur.toUpperCase()} ${mode === 'global' ? 'global' : 'ordenado'}` };
}

function better(a: PackResult, b: PackResult): boolean {
  if (a.unplaced.length !== b.unplaced.length) return a.unplaced.length < b.unplaced.length;
  if (a.sheets.length !== b.sheets.length) return a.sheets.length < b.sheets.length;
  const la = a.sheets[a.sheets.length - 1]?.usedArea ?? 0;
  const lb = b.sheets[b.sheets.length - 1]?.usedArea ?? 0;
  return la < lb;
}

export function packItems(items: PackItem[], cfg: SheetConfig): PackResult {
  const algos: ('maxrects' | 'guillotine')[] = cfg.algorithm === 'auto' ? ['guillotine', 'maxrects'] : [cfg.algorithm as Exclude<PackAlgorithm, 'auto'>];
  let best: PackResult | null = null;
  for (const algo of algos) {
    const heurs: Heuristic[] = algo === 'maxrects' ? ['bssf', 'baf', 'bl'] : ['baf', 'bssf'];
    for (const heur of heurs) {
      for (const mode of ['global', 'sorted'] as const) {
        const r = pack(items, cfg, algo, heur, mode);
        if (!best || better(r, best)) best = r;
      }
    }
  }
  return best ?? { sheets: [], unplaced: [], label: '' };
}

export function optimizeGroup(g: MaterialGroup, cfg: SheetConfig): GroupOptimization {
  const items: PackItem[] = [];
  for (const r of g.rows) {
    for (let q = 0; q < r.qty; q++) {
      items.push({ uid: `${r.code}-${q + 1}`, code: r.code, name: r.name, w: r.cutLength, h: r.cutWidth, canRotate: !r.grain, grain: r.grain });
    }
  }
  const res = packItems(items, cfg);
  const sheetArea = cfg.length * cfg.width;
  const usedArea = res.sheets.reduce((a, s) => a + s.usedArea, 0);
  const total = sheetArea * res.sheets.length;
  return {
    key: g.key, letter: g.letter, materialId: g.materialId, materialName: g.materialName, thickness: g.thickness,
    sheets: res.sheets, unplaced: res.unplaced, utilization: total ? usedArea / total : 0, usedArea,
    sheetArea: total, wasteArea: total - usedArea, algorithm: res.label, sheetLength: cfg.length, sheetWidth: cfg.width, trim: cfg.trim,
  };
}

export function optimizeAll(cut: CutList, cfg: SheetConfig): GroupOptimization[] {
  return cut.groups.filter((g) => g.optimize).map((g) => optimizeGroup(g, cfg));
}
