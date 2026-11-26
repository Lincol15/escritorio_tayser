/*
 * Proyecto:    Tayser 1.0.0
 * Archivo:     src/core/roomPlanner.ts
 * Autores:     LWYC, RCO, GDMS, JDAP
 * Descripción: Propuesta de distribución de muebles en una habitación.
 */
// Planificador de ambientes basado en reglas de ergonomía
// Planta: x = ancho de la habitación (pared del fondo, izquierda→derecha), z = profundidad (fondo→frente).
// "along" en paredes laterales se mide desde la esquina con la pared del fondo.
import type { WRGJSceneItem } from './types';
import { wrgjCreateItem } from './items';
import { wrgjUid } from './ids';

export type WRGJWallId = 'fondo' | 'izquierda' | 'derecha' | 'frente';
export const WRGJ_WALLS: WRGJWallId[] = ['fondo', 'izquierda', 'derecha', 'frente'];
export const WRGJ_WALL_LABEL: Record<WRGJWallId, string> = {
  fondo: 'Pared del fondo (foto)',
  izquierda: 'Pared izquierda',
  derecha: 'Pared derecha',
  frente: 'Pared frontal (detrás de la cámara)',
};

export type WRGJObstacleType = 'puerta' | 'ventana' | 'otro';
export interface WRGJObstacle {
  id: string;
  type: WRGJObstacleType;
  wall: WRGJWallId;
  /** inicio a lo largo de la pared (mm) */
  x: number;
  /** altura desde el piso (alféizar en ventanas) */
  y: number;
  w: number;
  h: number;
}

export interface WRGJRoomSpec {
  width: number;
  depth: number;
  height: number;
  obstacles: WRGJObstacle[];
}

export type WRGJFurnitureKind = 'ropero' | 'cama' | 'escritorio' | 'comoda' | 'estante' | 'velador';
export interface WRGJFurnitureReq {
  kind: WRGJFurnitureKind;
  enabled: boolean;
  qty: number;
  w: number;
  d: number;
  h: number;
  minW: number;
}

export const WRGJ_FURNITURE_INFO: Record<WRGJFurnitureKind, { label: string; clearance: number; defaults: Omit<WRGJFurnitureReq, 'kind' | 'enabled'> }> = {
  ropero: { label: 'Ropero / clóset', clearance: 700, defaults: { qty: 1, w: 1800, d: 600, h: 2100, minW: 900 } },
  cama: { label: 'Cama', clearance: 600, defaults: { qty: 1, w: 1400, d: 1900, h: 500, minW: 1400 } },
  escritorio: { label: 'Escritorio / mesa', clearance: 800, defaults: { qty: 1, w: 1200, d: 600, h: 750, minW: 800 } },
  comoda: { label: 'Cómoda / cajonera', clearance: 700, defaults: { qty: 1, w: 900, d: 450, h: 900, minW: 600 } },
  estante: { label: 'Estante / librero', clearance: 600, defaults: { qty: 1, w: 800, d: 300, h: 1800, minW: 600 } },
  velador: { label: 'Velador', clearance: 400, defaults: { qty: 2, w: 450, d: 400, h: 550, minW: 400 } },
};

export const WRGJ_FURNITURE_ORDER: WRGJFurnitureKind[] = ['ropero', 'cama', 'escritorio', 'comoda', 'estante', 'velador'];

export function wrgjDefaultFurniture(): WRGJFurnitureReq[] {
  return WRGJ_FURNITURE_ORDER.map((kind) => ({ kind, enabled: kind === 'ropero' || kind === 'escritorio' || kind === 'cama', ...WRGJ_FURNITURE_INFO[kind].defaults }));
}

export interface WRGJFloorRect {
  x: number;
  z: number;
  w: number;
  d: number;
}

export interface WRGJRoomPlacement {
  id: string;
  kind: WRGJFurnitureKind;
  label: string;
  wall: WRGJWallId;
  along: number;
  w: number;
  d: number;
  h: number;
  rect: WRGJFloorRect;
  clear: WRGJFloorRect;
  score: number;
  notes: string[];
}

export interface WRGJPlanResult {
  placements: WRGJRoomPlacement[];
  failed: { kind: WRGJFurnitureKind; label: string; reason: string }[];
  warnings: string[];
}

export const wrgjWallLength = (room: WRGJRoomSpec, wall: WRGJWallId) => (wall === 'fondo' || wall === 'frente' ? room.width : room.depth);
const WRGJ_OPPOSITE: Record<WRGJWallId, WRGJWallId> = { fondo: 'frente', frente: 'fondo', izquierda: 'derecha', derecha: 'izquierda' };

export function wrgjFloorRect(room: WRGJRoomSpec, wall: WRGJWallId, along: number, w: number, d: number): WRGJFloorRect {
  switch (wall) {
    case 'fondo':
      return { x: along, z: 0, w, d };
    case 'frente':
      return { x: along, z: room.depth - d, w, d };
    case 'izquierda':
      return { x: 0, z: along, w: d, d: w };
    case 'derecha':
      return { x: room.width - d, z: along, w: d, d: w };
  }
}

export function wrgjClearRect(room: WRGJRoomSpec, wall: WRGJWallId, along: number, w: number, d: number, c: number): WRGJFloorRect {
  switch (wall) {
    case 'fondo':
      return { x: along, z: d, w, d: c };
    case 'frente':
      return { x: along, z: room.depth - d - c, w, d: c };
    case 'izquierda':
      return { x: d, z: along, w: c, d: w };
    case 'derecha':
      return { x: room.width - d - c, z: along, w: c, d: w };
  }
}

export function wrgjDoorSwing(room: WRGJRoomSpec, o: WRGJObstacle): WRGJFloorRect {
  return wrgjFloorRect(room, o.wall, o.x, o.w, Math.min(o.w, 950));
}

const wrgjOverlap = (a: WRGJFloorRect, b: WRGJFloorRect, eps = 1) =>
  a.x < b.x + b.w - eps && a.x + a.w > b.x + eps && a.z < b.z + b.d - eps && a.z + a.d > b.z + eps;
const wrgjInside = (room: WRGJRoomSpec, r: WRGJFloorRect) => r.x >= -0.5 && r.z >= -0.5 && r.x + r.w <= room.width + 0.5 && r.z + r.d <= room.depth + 0.5;
const wrgjSpan = (a0: number, a1: number, b0: number, b1: number) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
const wrgjCenter = (r: WRGJFloorRect) => ({ x: r.x + r.w / 2, z: r.z + r.d / 2 });

interface WRGJInst {
  kind: WRGJFurnitureKind;
  label: string;
  w: number;
  d: number;
  h: number;
  minW: number;
}

function wrgjEvaluate(room: WRGJRoomSpec, inst: WRGJInst, placed: WRGJRoomPlacement[], wall: WRGJWallId, along: number, width: number): WRGJRoomPlacement | null {
  const Lw = wrgjWallLength(room, wall);
  if (along < -0.5 || along + width > Lw + 0.5) return null;
  const rect = wrgjFloorRect(room, wall, along, width, inst.d);
  if (!wrgjInside(room, rect)) return null;
  const notes: string[] = [];
  const obs = room.obstacles.filter((o) => o.wall === wall);
  for (const o of obs) {
    const s = wrgjSpan(along, along + width, o.x, o.x + o.w);
    if (s <= 0) continue;
    if (o.type === 'puerta') return null;
    if (o.type === 'ventana' && inst.h > o.y - 30) return null;
    if (o.type === 'otro' && inst.h > o.y) return null;
  }
  const doors = room.obstacles.filter((o) => o.type === 'puerta');
  for (const d of doors) if (wrgjOverlap(rect, wrgjDoorSwing(room, d))) return null;
  for (const p of placed) if (wrgjOverlap(rect, p.rect) || wrgjOverlap(rect, p.clear)) return null;

  const perp = wall === 'fondo' || wall === 'frente' ? room.depth : room.width;
  const wanted = WRGJ_FURNITURE_INFO[inst.kind].clearance;
  const free = perp - inst.d;
  if (free < 450) return null;
  const c = Math.min(wanted, free);
  const clear = wrgjClearRect(room, wall, along, width, inst.d, c);
  for (const p of placed) if (wrgjOverlap(clear, p.rect)) return null;
  if (c < wanted) notes.push(`Circulación reducida al frente: ${Math.round(c)} mm (ideal ${wanted} mm)`);

  // puntuación
  let s = width / 100;
  const touchesCorner = along < 1 || along + width > Lw - 1;
  const cc = wrgjCenter(rect);
  const doorDist = doors.length ? Math.min(...doors.map((d) => {
    const dc = wrgjCenter(wrgjDoorSwing(room, d));
    return Math.hypot(dc.x - cc.x, dc.z - cc.z);
  })) : 3000;
  const winOnWall = obs.filter((o) => o.type === 'ventana');
  const winOverlap = winOnWall.reduce((a, o) => a + wrgjSpan(along, along + width, o.x, o.x + o.w), 0);
  const winPerp = room.obstacles.some((o) => o.type === 'ventana' && o.wall !== wall && o.wall !== WRGJ_OPPOSITE[wall]);

  switch (inst.kind) {
    case 'ropero':
      if (touchesCorner) {
        s += 25;
        notes.push('En esquina: aprovecha el rincón y no corta la circulación');
      }
      if (!winOnWall.length) s += 8;
      s += doorDist / 250;
      if (width >= inst.w - 1) s += 5;
      break;
    case 'escritorio':
      if (winOverlap > 0) {
        s += 40 * Math.min(1, winOverlap / width);
        notes.push('Bajo la ventana: luz natural sobre la mesa de trabajo');
      } else if (winPerp) {
        s += 12;
        notes.push('Ventana lateral: luz sin reflejos en pantalla');
      }
      s += doorDist / 500;
      break;
    case 'cama':
      s += doorDist / 150;
      s += 15 * (1 - Math.abs(along + width / 2 - Lw / 2) / (Lw / 2));
      if (winOverlap > 0) {
        s -= 15;
        notes.push('Cabecera bajo ventana (considere cortinas)');
      }
      notes.push('Cabecera contra la pared, lejos de la puerta');
      break;
    case 'velador': {
      const bed = placed.find((p) => p.kind === 'cama' && p.wall === wall);
      if (bed && (Math.abs(along + width - bed.along) < 40 || Math.abs(bed.along + bed.w - along) < 40)) {
        s += 80;
        notes.push('Junto a la cama');
      } else s -= 20;
      break;
    }
    case 'estante': {
      const desk = placed.find((p) => p.kind === 'escritorio' && p.wall === wall);
      if (desk && (Math.abs(along + width - desk.along) < 60 || Math.abs(desk.along + desk.w - along) < 60)) {
        s += 25;
        notes.push('Al lado del escritorio');
      }
      if (touchesCorner) s += 5;
      break;
    }
    case 'comoda': {
      s += doorDist / 300;
      const bed = placed.find((p) => p.kind === 'cama');
      if (bed && bed.wall === WRGJ_OPPOSITE[wall]) {
        s += 10;
        notes.push('Frente a la cama');
      }
      break;
    }
  }
  return { id: wrgjUid('pl'), kind: inst.kind, label: inst.label, wall, along, w: width, d: inst.d, h: inst.h, rect, clear, score: s, notes };
}

function wrgjPlaceOne(room: WRGJRoomSpec, inst: WRGJInst, placed: WRGJRoomPlacement[]): WRGJRoomPlacement | null {
  let best: WRGJRoomPlacement | null = null;
  const widths: number[] = [];
  for (let w = inst.w; w >= inst.minW - 0.1; w -= 100) widths.push(Math.round(w));
  if (!widths.length) widths.push(inst.w);
  for (const wall of WRGJ_WALLS) {
    const Lw = wrgjWallLength(room, wall);
    for (const width of widths) {
      if (width > Lw) continue;
      const pos = new Set<number>([0, Lw - width, (Lw - width) / 2]);
      for (let a = 0; a <= Lw - width; a += 50) pos.add(a);
      for (const p of placed) if (p.wall === wall) {
        pos.add(p.along + p.w);
        pos.add(p.along - width);
      }
      for (const o of room.obstacles) if (o.wall === wall) {
        pos.add(o.x + o.w / 2 - width / 2);
        pos.add(o.x + o.w);
        pos.add(o.x - width);
      }
      for (const a of pos) {
        const c = wrgjEvaluate(room, inst, placed, wall, Math.round(a), width);
        if (c && (!best || c.score > best.score)) best = c;
      }
    }
  }
  return best;
}

function wrgjPermutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  return arr.flatMap((x, i) => wrgjPermutations([...arr.slice(0, i), ...arr.slice(i + 1)]).map((p) => [x, ...p]));
}

export function wrgjPlanRoom(room: WRGJRoomSpec, reqs: WRGJFurnitureReq[]): WRGJPlanResult {
  const warnings: string[] = [];
  if (room.width < 1500 || room.depth < 1500) warnings.push('La habitación es muy pequeña; revise las medidas.');
  const insts: WRGJInst[] = [];
  for (const r of reqs) {
    if (!r.enabled) continue;
    for (let q = 0; q < Math.max(1, r.qty); q++) {
      insts.push({ kind: r.kind, label: WRGJ_FURNITURE_INFO[r.kind].label + (r.qty > 1 ? ` ${q + 1}` : ''), w: r.w, d: r.d, h: r.h, minW: Math.min(r.minW, r.w) });
    }
  }
  const head = insts.filter((i) => i.kind === 'ropero' || i.kind === 'cama' || i.kind === 'escritorio');
  const tail = insts.filter((i) => !head.includes(i));
  const orders = head.length ? wrgjPermutations(head).slice(0, 24).map((p) => [...p, ...tail]) : [tail];
  let best: WRGJPlanResult | null = null;
  let bestScore = -Infinity;
  for (const order of orders) {
    const placed: WRGJRoomPlacement[] = [];
    const failed: WRGJPlanResult['failed'] = [];
    for (const inst of order) {
      const p = wrgjPlaceOne(room, inst, placed);
      if (p) placed.push(p);
      else failed.push({ kind: inst.kind, label: inst.label, reason: `No hay un tramo libre de al menos ${inst.minW} mm sin bloquear puertas, ventanas ni circulación.` });
    }
    const total = placed.length * 1000 + placed.reduce((a, p) => a + p.score, 0);
    if (total > bestScore) {
      bestScore = total;
      best = { placements: placed, failed, warnings };
    }
  }
  return best ?? { placements: [], failed: [], warnings };
}

// Conversión a escena 3D
const WRGJ_WALL_T = 150;
const WRGJ_ROT: Record<WRGJWallId, number> = { fondo: 0, izquierda: 90, derecha: -90, frente: 180 };

/** Centro (x,z) del ítem en el plano de pared y su posición local x dentro del muro. */
function wrgjWallPoint(room: WRGJRoomSpec, wall: WRGJWallId, alongCenter: number): [number, number] {
  switch (wall) {
    case 'fondo':
      return [alongCenter, -WRGJ_WALL_T / 2];
    case 'frente':
      return [alongCenter, room.depth + WRGJ_WALL_T / 2];
    case 'izquierda':
      return [-WRGJ_WALL_T / 2, alongCenter];
    case 'derecha':
      return [room.width + WRGJ_WALL_T / 2, alongCenter];
  }
}

function wrgjHoleLocalX(room: WRGJRoomSpec, wall: WRGJWallId, alongCenter: number): number {
  switch (wall) {
    case 'fondo':
      return alongCenter + WRGJ_WALL_T;
    case 'frente':
      return room.width + WRGJ_WALL_T - alongCenter;
    case 'izquierda':
      return room.depth - alongCenter;
    case 'derecha':
      return alongCenter;
  }
}

export function wrgjRoomToScene(room: WRGJRoomSpec, placements: WRGJRoomPlacement[]): WRGJSceneItem[] {
  const W = room.width;
  const D = room.depth;
  const H = room.height;
  const items: WRGJSceneItem[] = [];
  items.push(wrgjCreateItem('floor', { name: 'Piso', params: { ancho: W, profundidad: D }, position: [W / 2, 0, D / 2], materialId: 'piso-madera' }));
  for (const wall of WRGJ_WALLS) {
    const long = wall === 'fondo' || wall === 'frente';
    const len = long ? W + 2 * WRGJ_WALL_T : D;
    const [cx, cz] = long ? [W / 2, wall === 'fondo' ? -WRGJ_WALL_T / 2 : D + WRGJ_WALL_T / 2] : [wall === 'izquierda' ? -WRGJ_WALL_T / 2 : W + WRGJ_WALL_T / 2, D / 2];
    const holes = room.obstacles
      .filter((o) => o.wall === wall && o.type !== 'otro')
      .map((o) => {
        const isDoor = o.type === 'puerta';
        const h = Math.min(o.h, H - 20);
        const y0 = isDoor ? 2 : o.y;
        return { id: o.id, shape: 'rect' as const, x: wrgjHoleLocalX(room, wall, o.x + o.w / 2), y: y0 + h / 2, w: o.w, h, r: 0 };
      });
    items.push(
      wrgjCreateItem('wall', {
        name: WRGJ_WALL_LABEL[wall].replace(' (foto)', '').replace(' (detrás de la cámara)', ''),
        params: { largo: len, alto: H, grosor: WRGJ_WALL_T, vanoTipo: 'ninguno' },
        position: [cx, 0, cz],
        rotationY: WRGJ_ROT[wall],
        hidden: wall === 'frente',
        overrides: holes.length ? { muro: { features: { holes } } } : {},
      }),
    );
  }
  for (const o of room.obstacles) {
    const [x, z] = wrgjWallPoint(room, o.wall, o.x + o.w / 2);
    if (o.type === 'ventana') {
      items.push(wrgjCreateItem('reference', { name: 'Ventana', params: { tipo: 'ventana', ancho: o.w, alto: o.h, profundidad: 10 }, position: [x, o.y, z], rotationY: WRGJ_ROT[o.wall] }));
    } else if (o.type === 'puerta') {
      items.push(wrgjCreateItem('reference', { name: 'Puerta', params: { tipo: 'puerta', ancho: o.w - 10, alto: o.h - 5, profundidad: 40 }, position: [x, 0, z], rotationY: WRGJ_ROT[o.wall] }));
    }
  }
  for (const p of placements) {
    const c = wrgjCenter(p.rect);
    const base = { position: [c.x, 0, c.z] as [number, number, number], rotationY: WRGJ_ROT[p.wall], name: p.label };
    switch (p.kind) {
      case 'ropero':
        items.push(wrgjCreateItem('closet', { ...base, params: { ancho: p.w, alto: p.h, profundidad: p.d - 18, puertas: p.w >= 2100 ? 3 : p.w < 700 ? 1 : 2 } }));
        break;
      case 'escritorio':
        items.push(wrgjCreateItem('desk', { ...base, params: { ancho: p.w, alto: p.h, profundidad: p.d } }));
        break;
      case 'cama':
        items.push(wrgjCreateItem('reference', { ...base, params: { tipo: 'cama', ancho: p.w, alto: p.h, profundidad: p.d } }));
        break;
      case 'velador':
        items.push(wrgjCreateItem('drawer-unit', { ...base, params: { ancho: p.w, alto: p.h, profundidad: p.d - 18, gavetas: '2', zocalo: 40 } }));
        break;
      case 'comoda':
        items.push(wrgjCreateItem('drawer-unit', { ...base, params: { ancho: p.w, alto: p.h, profundidad: p.d - 18, gavetas: '4', zocalo: 60 } }));
        break;
      case 'estante':
        items.push(wrgjCreateItem('shelf', { ...base, params: { ancho: p.w, alto: p.h, profundidad: p.d } }));
        break;
    }
  }
  return items;
}
