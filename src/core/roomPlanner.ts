// Planificador de ambientes basado en reglas de ergonomía
// Planta: x = ancho de la habitación (pared del fondo, izquierda→derecha), z = profundidad (fondo→frente).
// "along" en paredes laterales se mide desde la esquina con la pared del fondo.
import type { SceneItem } from './types';
import { createItem } from './items';
import { uid } from './ids';

export type WallId = 'fondo' | 'izquierda' | 'derecha' | 'frente';
export const WALLS: WallId[] = ['fondo', 'izquierda', 'derecha', 'frente'];
export const WALL_LABEL: Record<WallId, string> = {
  fondo: 'Pared del fondo (foto)',
  izquierda: 'Pared izquierda',
  derecha: 'Pared derecha',
  frente: 'Pared frontal (detrás de la cámara)',
};

export type ObstacleType = 'puerta' | 'ventana' | 'otro';
export interface Obstacle {
  id: string;
  type: ObstacleType;
  wall: WallId;
  /** inicio a lo largo de la pared (mm) */
  x: number;
  /** altura desde el piso (alféizar en ventanas) */
  y: number;
  w: number;
  h: number;
}

export interface RoomSpec {
  width: number;
  depth: number;
  height: number;
  obstacles: Obstacle[];
}

export type FurnitureKind = 'ropero' | 'cama' | 'escritorio' | 'comoda' | 'estante' | 'velador';
export interface FurnitureReq {
  kind: FurnitureKind;
  enabled: boolean;
  qty: number;
  w: number;
  d: number;
  h: number;
  minW: number;
}

export const FURNITURE_INFO: Record<FurnitureKind, { label: string; clearance: number; defaults: Omit<FurnitureReq, 'kind' | 'enabled'> }> = {
  ropero: { label: 'Ropero / clóset', clearance: 700, defaults: { qty: 1, w: 1800, d: 600, h: 2100, minW: 900 } },
  cama: { label: 'Cama', clearance: 600, defaults: { qty: 1, w: 1400, d: 1900, h: 500, minW: 1400 } },
  escritorio: { label: 'Escritorio / mesa', clearance: 800, defaults: { qty: 1, w: 1200, d: 600, h: 750, minW: 800 } },
  comoda: { label: 'Cómoda / cajonera', clearance: 700, defaults: { qty: 1, w: 900, d: 450, h: 900, minW: 600 } },
  estante: { label: 'Estante / librero', clearance: 600, defaults: { qty: 1, w: 800, d: 300, h: 1800, minW: 600 } },
  velador: { label: 'Velador', clearance: 400, defaults: { qty: 2, w: 450, d: 400, h: 550, minW: 400 } },
};

export const FURNITURE_ORDER: FurnitureKind[] = ['ropero', 'cama', 'escritorio', 'comoda', 'estante', 'velador'];

export function defaultFurniture(): FurnitureReq[] {
  return FURNITURE_ORDER.map((kind) => ({ kind, enabled: kind === 'ropero' || kind === 'escritorio' || kind === 'cama', ...FURNITURE_INFO[kind].defaults }));
}

export interface FloorRect {
  x: number;
  z: number;
  w: number;
  d: number;
}

export interface Placement {
  id: string;
  kind: FurnitureKind;
  label: string;
  wall: WallId;
  along: number;
  w: number;
  d: number;
  h: number;
  rect: FloorRect;
  clear: FloorRect;
  score: number;
  notes: string[];
}

export interface PlanResult {
  placements: Placement[];
  failed: { kind: FurnitureKind; label: string; reason: string }[];
  warnings: string[];
}

export const wallLength = (room: RoomSpec, wall: WallId) => (wall === 'fondo' || wall === 'frente' ? room.width : room.depth);
const OPPOSITE: Record<WallId, WallId> = { fondo: 'frente', frente: 'fondo', izquierda: 'derecha', derecha: 'izquierda' };

export function floorRect(room: RoomSpec, wall: WallId, along: number, w: number, d: number): FloorRect {
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

export function clearRect(room: RoomSpec, wall: WallId, along: number, w: number, d: number, c: number): FloorRect {
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

export function doorSwing(room: RoomSpec, o: Obstacle): FloorRect {
  return floorRect(room, o.wall, o.x, o.w, Math.min(o.w, 950));
}

const overlap = (a: FloorRect, b: FloorRect, eps = 1) =>
  a.x < b.x + b.w - eps && a.x + a.w > b.x + eps && a.z < b.z + b.d - eps && a.z + a.d > b.z + eps;
const inside = (room: RoomSpec, r: FloorRect) => r.x >= -0.5 && r.z >= -0.5 && r.x + r.w <= room.width + 0.5 && r.z + r.d <= room.depth + 0.5;
const span = (a0: number, a1: number, b0: number, b1: number) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
const center = (r: FloorRect) => ({ x: r.x + r.w / 2, z: r.z + r.d / 2 });

interface Inst {
  kind: FurnitureKind;
  label: string;
  w: number;
  d: number;
  h: number;
  minW: number;
}

function evaluate(room: RoomSpec, inst: Inst, placed: Placement[], wall: WallId, along: number, width: number): Placement | null {
  const Lw = wallLength(room, wall);
  if (along < -0.5 || along + width > Lw + 0.5) return null;
  const rect = floorRect(room, wall, along, width, inst.d);
  if (!inside(room, rect)) return null;
  const notes: string[] = [];
  const obs = room.obstacles.filter((o) => o.wall === wall);
  for (const o of obs) {
    const s = span(along, along + width, o.x, o.x + o.w);
    if (s <= 0) continue;
    if (o.type === 'puerta') return null;
    if (o.type === 'ventana' && inst.h > o.y - 30) return null;
    if (o.type === 'otro' && inst.h > o.y) return null;
  }
  const doors = room.obstacles.filter((o) => o.type === 'puerta');
  for (const d of doors) if (overlap(rect, doorSwing(room, d))) return null;
  for (const p of placed) if (overlap(rect, p.rect) || overlap(rect, p.clear)) return null;

  const perp = wall === 'fondo' || wall === 'frente' ? room.depth : room.width;
  const wanted = FURNITURE_INFO[inst.kind].clearance;
  const free = perp - inst.d;
  if (free < 450) return null;
  const c = Math.min(wanted, free);
  const clear = clearRect(room, wall, along, width, inst.d, c);
  for (const p of placed) if (overlap(clear, p.rect)) return null;
  if (c < wanted) notes.push(`Circulación reducida al frente: ${Math.round(c)} mm (ideal ${wanted} mm)`);

  // puntuación
  let s = width / 100;
  const touchesCorner = along < 1 || along + width > Lw - 1;
  const cc = center(rect);
  const doorDist = doors.length ? Math.min(...doors.map((d) => {
    const dc = center(doorSwing(room, d));
    return Math.hypot(dc.x - cc.x, dc.z - cc.z);
  })) : 3000;
  const winOnWall = obs.filter((o) => o.type === 'ventana');
  const winOverlap = winOnWall.reduce((a, o) => a + span(along, along + width, o.x, o.x + o.w), 0);
  const winPerp = room.obstacles.some((o) => o.type === 'ventana' && o.wall !== wall && o.wall !== OPPOSITE[wall]);

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
      if (bed && bed.wall === OPPOSITE[wall]) {
        s += 10;
        notes.push('Frente a la cama');
      }
      break;
    }
  }
  return { id: uid('pl'), kind: inst.kind, label: inst.label, wall, along, w: width, d: inst.d, h: inst.h, rect, clear, score: s, notes };
}

function placeOne(room: RoomSpec, inst: Inst, placed: Placement[]): Placement | null {
  let best: Placement | null = null;
  const widths: number[] = [];
  for (let w = inst.w; w >= inst.minW - 0.1; w -= 100) widths.push(Math.round(w));
  if (!widths.length) widths.push(inst.w);
  for (const wall of WALLS) {
    const Lw = wallLength(room, wall);
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
        const c = evaluate(room, inst, placed, wall, Math.round(a), width);
        if (c && (!best || c.score > best.score)) best = c;
      }
    }
  }
  return best;
}

function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  return arr.flatMap((x, i) => permutations([...arr.slice(0, i), ...arr.slice(i + 1)]).map((p) => [x, ...p]));
}

export function planRoom(room: RoomSpec, reqs: FurnitureReq[]): PlanResult {
  const warnings: string[] = [];
  if (room.width < 1500 || room.depth < 1500) warnings.push('La habitación es muy pequeña; revise las medidas.');
  const insts: Inst[] = [];
  for (const r of reqs) {
    if (!r.enabled) continue;
    for (let q = 0; q < Math.max(1, r.qty); q++) {
      insts.push({ kind: r.kind, label: FURNITURE_INFO[r.kind].label + (r.qty > 1 ? ` ${q + 1}` : ''), w: r.w, d: r.d, h: r.h, minW: Math.min(r.minW, r.w) });
    }
  }
  const head = insts.filter((i) => i.kind === 'ropero' || i.kind === 'cama' || i.kind === 'escritorio');
  const tail = insts.filter((i) => !head.includes(i));
  const orders = head.length ? permutations(head).slice(0, 24).map((p) => [...p, ...tail]) : [tail];
  let best: PlanResult | null = null;
  let bestScore = -Infinity;
  for (const order of orders) {
    const placed: Placement[] = [];
    const failed: PlanResult['failed'] = [];
    for (const inst of order) {
      const p = placeOne(room, inst, placed);
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
const WALL_T = 150;
const ROT: Record<WallId, number> = { fondo: 0, izquierda: 90, derecha: -90, frente: 180 };

/** Centro (x,z) del ítem en el plano de pared y su posición local x dentro del muro. */
function wallPoint(room: RoomSpec, wall: WallId, alongCenter: number): [number, number] {
  switch (wall) {
    case 'fondo':
      return [alongCenter, -WALL_T / 2];
    case 'frente':
      return [alongCenter, room.depth + WALL_T / 2];
    case 'izquierda':
      return [-WALL_T / 2, alongCenter];
    case 'derecha':
      return [room.width + WALL_T / 2, alongCenter];
  }
}

function holeLocalX(room: RoomSpec, wall: WallId, alongCenter: number): number {
  switch (wall) {
    case 'fondo':
      return alongCenter + WALL_T;
    case 'frente':
      return room.width + WALL_T - alongCenter;
    case 'izquierda':
      return room.depth - alongCenter;
    case 'derecha':
      return alongCenter;
  }
}

export function roomToScene(room: RoomSpec, placements: Placement[]): SceneItem[] {
  const W = room.width;
  const D = room.depth;
  const H = room.height;
  const items: SceneItem[] = [];
  items.push(createItem('floor', { name: 'Piso', params: { ancho: W, profundidad: D }, position: [W / 2, 0, D / 2], materialId: 'piso-madera' }));
  for (const wall of WALLS) {
    const long = wall === 'fondo' || wall === 'frente';
    const len = long ? W + 2 * WALL_T : D;
    const [cx, cz] = long ? [W / 2, wall === 'fondo' ? -WALL_T / 2 : D + WALL_T / 2] : [wall === 'izquierda' ? -WALL_T / 2 : W + WALL_T / 2, D / 2];
    const holes = room.obstacles
      .filter((o) => o.wall === wall && o.type !== 'otro')
      .map((o) => {
        const isDoor = o.type === 'puerta';
        const h = Math.min(o.h, H - 20);
        const y0 = isDoor ? 2 : o.y;
        return { id: o.id, shape: 'rect' as const, x: holeLocalX(room, wall, o.x + o.w / 2), y: y0 + h / 2, w: o.w, h, r: 0 };
      });
    items.push(
      createItem('wall', {
        name: WALL_LABEL[wall].replace(' (foto)', '').replace(' (detrás de la cámara)', ''),
        params: { largo: len, alto: H, grosor: WALL_T, vanoTipo: 'ninguno' },
        position: [cx, 0, cz],
        rotationY: ROT[wall],
        hidden: wall === 'frente',
        overrides: holes.length ? { muro: { features: { holes } } } : {},
      }),
    );
  }
  for (const o of room.obstacles) {
    const [x, z] = wallPoint(room, o.wall, o.x + o.w / 2);
    if (o.type === 'ventana') {
      items.push(createItem('reference', { name: 'Ventana', params: { tipo: 'ventana', ancho: o.w, alto: o.h, profundidad: 10 }, position: [x, o.y, z], rotationY: ROT[o.wall] }));
    } else if (o.type === 'puerta') {
      items.push(createItem('reference', { name: 'Puerta', params: { tipo: 'puerta', ancho: o.w - 10, alto: o.h - 5, profundidad: 40 }, position: [x, 0, z], rotationY: ROT[o.wall] }));
    }
  }
  for (const p of placements) {
    const c = center(p.rect);
    const base = { position: [c.x, 0, c.z] as [number, number, number], rotationY: ROT[p.wall], name: p.label };
    switch (p.kind) {
      case 'ropero':
        items.push(createItem('closet', { ...base, params: { ancho: p.w, alto: p.h, profundidad: p.d - 18, puertas: p.w >= 2100 ? 3 : p.w < 700 ? 1 : 2 } }));
        break;
      case 'escritorio':
        items.push(createItem('desk', { ...base, params: { ancho: p.w, alto: p.h, profundidad: p.d } }));
        break;
      case 'cama':
        items.push(createItem('reference', { ...base, params: { tipo: 'cama', ancho: p.w, alto: p.h, profundidad: p.d } }));
        break;
      case 'velador':
        items.push(createItem('drawer-unit', { ...base, params: { ancho: p.w, alto: p.h, profundidad: p.d - 18, gavetas: '2', zocalo: 40 } }));
        break;
      case 'comoda':
        items.push(createItem('drawer-unit', { ...base, params: { ancho: p.w, alto: p.h, profundidad: p.d - 18, gavetas: '4', zocalo: 60 } }));
        break;
      case 'estante':
        items.push(createItem('shelf', { ...base, params: { ancho: p.w, alto: p.h, profundidad: p.d } }));
        break;
    }
  }
  return items;
}
