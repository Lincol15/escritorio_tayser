/*
 * ==================================================
 * Proyecto desarrollado por: 4BYTES
 * Equipo de desarrollo de software
 * Proyecto: Tayser - Diseño paramétrico 3D y optimización de cortes
 * Archivo: src/core/templates.ts
 * Descripción: Catálogo paramétrico: generadores de muebles y ambiente.
 * ==================================================
 */
// ===================== Catálogo paramétrico (generadores) =====================
// Coordenadas locales del módulo: x 0..ancho (izq→der), y 0..alto (piso→arriba), z 0..prof (fondo→frente).
import type {
  EdgeBanding, GenerateResult, MaterialSlot, ParamDef, Params, Piece, PieceFeatures, PieceRole, Plane, Template, Vec3,
} from './types';
import { calcDrawer, calcDrawerFronts, calcShelves } from './calculators';

// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Crear el conjunto vacío de cortes especiales de una pieza
// ==================================================
export const emptyFeatures = (): PieceFeatures => ({
  cornerRadius: 0,
  radiusCorners: ['bl', 'br', 'tr', 'tl'],
  diagonals: [],
  holes: [],
  bevels: [],
  tenons: [],
});

// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Definir los tapacantos de una pieza (L1, L2, A1, A2)
// ==================================================
export const edges = (l1 = 0, l2 = 0, w1 = 0, w2 = 0): EdgeBanding => ({ l1, l2, w1, w2 });

interface PanelOpts {
  slot?: MaterialSlot;
  materialId?: string;
  grain?: boolean;
  edges?: EdgeBanding;
  features?: Partial<PieceFeatures>;
  step?: number;
  cutlist?: boolean;
  rotation?: Vec3;
}

// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Crear una pieza de tablero con medidas, posición y material
// ==================================================
export function panel(
  key: string, name: string, role: PieceRole, length: number, width: number, thickness: number, plane: Plane, position: Vec3, o: PanelOpts = {},
): Piece {
  return {
    key, name, role, kind: 'panel',
    length: Math.max(1, length), width: Math.max(1, width), thickness: Math.max(0.5, thickness),
    plane, position, rotation: o.rotation,
    materialSlot: o.slot ?? 'carcass', materialId: o.materialId,
    grain: o.grain ?? true, edges: o.edges ?? edges(),
    features: { ...emptyFeatures(), ...o.features },
    step: o.step ?? 1, cutlist: o.cutlist ?? true,
  };
}

// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Crear una pieza cilíndrica o cónica (patas torneadas)
// ==================================================
export function cylinder(
  key: string, name: string, role: PieceRole, height: number, rTop: number, rBottom: number, position: Vec3, o: PanelOpts = {},
): Piece {
  const d = 2 * Math.max(rTop, rBottom);
  return {
    key, name, role, kind: 'cylinder', length: Math.max(1, height), width: d, thickness: d,
    radiusTop: Math.max(0.5, rTop), radiusBottom: Math.max(0.5, rBottom), plane: 'YZ', position, rotation: o.rotation,
    materialSlot: o.slot ?? 'fixed', materialId: o.materialId, grain: true, edges: edges(),
    features: emptyFeatures(), step: o.step ?? 1, cutlist: o.cutlist ?? true,
  };
}

// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Leer un parámetro numérico del mueble
// ==================================================
const n = (p: Params, k: string): number => {
  const v = Number(p[k]);
  return Number.isFinite(v) ? v : 0;
};
// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Leer un parámetro booleano del mueble
// ==================================================
const b = (p: Params, k: string): boolean => p[k] === true || p[k] === 'si' || p[k] === 'true';

// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Definir un parámetro de longitud para el inspector
// ==================================================
// ---------- definiciones de parámetros reutilizables ----------
const L = (key: string, label: string, def: number, min = 0, max = 6000, group = 'Medidas', hint?: string): ParamDef => ({
  key, label, type: 'length', default: def, min, max, group, hint,
});
// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Definir un parámetro de cantidad para el inspector
// ==================================================
const N = (key: string, label: string, def: number, min = 0, max = 12, group = 'Construcción'): ParamDef => ({
  key, label, type: 'number', default: def, min, max, step: 1, group,
});
// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Definir un parámetro de selección para el inspector
// ==================================================
const S = (key: string, label: string, def: string, options: [string, string][], group = 'Construcción'): ParamDef => ({
  key, label, type: 'select', default: def, options: options.map(([value, label]) => ({ value, label })), group,
});
// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Definir un parámetro de sí/no para el inspector
// ==================================================
const BOOL = (key: string, label: string, def: boolean, group = 'Construcción'): ParamDef => ({ key, label, type: 'boolean', default: def, group });

const THICK = S('espesor', 'Espesor de tablero', '18', [['12', '12 mm'], ['15', '15 mm'], ['18', '18 mm'], ['25', '25 mm']], 'Tableros');
const BACK = S('espesorFondo', 'Espesor de fondo', '5.5', [['3', '3 mm'], ['4', '4 mm'], ['5.5', '5.5 mm'], ['9', '9 mm'], ['12', '12 mm'], ['18', '18 mm']], 'Tableros');
const EDGE_OPTS: [string, string][] = [['0', 'Sin canto'], ['0.45', '0.45 mm'], ['1', '1 mm'], ['2', '2 mm'], ['3', '3 mm']];
const CANTO_CASCO = S('cantoCasco', 'Canto casco (frentes visibles)', '0.45', EDGE_OPTS, 'Tapacantos');
const CANTO_FRENTES = S('cantoFrentes', 'Canto puertas/frentes', '2', EDGE_OPTS, 'Tapacantos');
const HOLGURA = L('holgura', 'Holgura entre frentes', 3, 0, 10, 'Holguras');

// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Generar los laterales del casco de un mueble
// ==================================================
// ---------- piezas comunes de casco ----------
function carcassSides(W: number, H: number, D: number, t: number, cc: number): Piece[] {
  return [
    panel('lat-izq', 'Lateral', 'lateral', H, D, t, 'YZ', [t / 2, H / 2, D / 2], { edges: edges(cc, 0, cc, 0), step: 1 }),
    panel('lat-der', 'Lateral', 'lateral', H, D, t, 'YZ', [W - t / 2, H / 2, D / 2], { edges: edges(cc, 0, cc, 0), step: 2 }),
  ];
}

// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Generar las puertas de un módulo con sus holguras
// ==================================================
function doors(prefix: string, count: number, W: number, y0: number, y1: number, zFront: number, t: number, g: number, cf: number, step: number): Piece[] {
  const out: Piece[] = [];
  if (count <= 0) return out;
  const dw = (W - g * (count + 1)) / count;
  const dh = y1 - y0 - g;
  for (let i = 0; i < count; i++) {
    const x = g + dw / 2 + i * (dw + g);
    out.push(
      panel(`${prefix}-${i + 1}`, 'Puerta', 'puerta', dh, dw, t, 'YX', [x, y0 + g / 2 + dh / 2, zFront + t / 2], {
        slot: 'front', edges: edges(cf, cf, cf, cf), step,
      }),
    );
  }
  return out;
}

// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Generar repisas repartidas entre dos alturas
// ==================================================
function shelvesBetween(prefix: string, count: number, x0: number, x1: number, yBottom: number, innerH: number, zBack: number, depth: number, t: number, cc: number, step: number): Piece[] {
  if (count <= 0) return [];
  const res = calcShelves({ innerHeight: innerH, spaces: count + 1, shelfThickness: t, system32: false, firstHole: 37 });
  const w = x1 - x0 - 2;
  return res.shelves.map((s) =>
    panel(`${prefix}-${s.index}`, 'Repisa', 'repisa', w, depth, t, 'XZ', [(x0 + x1) / 2, yBottom + s.bottom + t / 2, zBack + depth / 2], {
      edges: edges(cc), step,
    }),
  );
}

// ==================================================
// 4BYTES - Equipo de desarrollo
// Plantilla: Módulo bajo de cocina
// ==================================================
// ---------- 1. Módulo bajo de cocina ----------
const baseCabinet: Template = {
  id: 'base-cabinet',
  name: 'Módulo bajo de cocina',
  category: 'module',
  group: 'Cocina',
  icon: 'Archive',
  description: 'Casco con zócalo, travesaños, fondo, repisa interior y puertas.',
  materials: { carcass: 'mel-blanco', front: 'mel-roble', back: 'hdf-blanco' },
  params: [
    L('ancho', 'Ancho', 800, 150, 1500), L('alto', 'Alto (con zócalo)', 870, 300, 1200), L('profundidad', 'Profundidad', 560, 200, 900),
    THICK, BACK, L('zocalo', 'Altura de zócalo', 100, 0, 250, 'Construcción'),
    N('puertas', 'Puertas', 2, 0, 4), N('repisas', 'Repisas', 1, 0, 6), HOLGURA, CANTO_CASCO, CANTO_FRENTES,
  ],
  generate(p): GenerateResult {
    const W = n(p, 'ancho'), H = n(p, 'alto'), D = n(p, 'profundidad'), t = n(p, 'espesor'), tb = n(p, 'espesorFondo');
    const z = Math.max(0, n(p, 'zocalo')), g = n(p, 'holgura'), nd = Math.round(n(p, 'puertas')), ns = Math.round(n(p, 'repisas'));
    const cc = n(p, 'cantoCasco'), cf = n(p, 'cantoFrentes');
    const iw = W - 2 * t;
    const pieces: Piece[] = [
      ...carcassSides(W, H, D, t, cc),
      panel('base', 'Base', 'base', iw, D - tb, t, 'XZ', [W / 2, z + t / 2, tb + (D - tb) / 2], { edges: edges(cc), step: 1 }),
      panel('trav-del', 'Travesaño', 'travesano', iw, 100, t, 'XZ', [W / 2, H - t / 2, D - 50], { edges: edges(cc), step: 3 }),
      panel('trav-tras', 'Travesaño', 'travesano', iw, 100, t, 'XZ', [W / 2, H - t / 2, tb + 50], { step: 3 }),
      panel('fondo', 'Fondo', 'fondo', iw, H - z, tb, 'XY', [W / 2, z + (H - z) / 2, tb / 2], { slot: 'back', grain: false, step: 4 }),
      ...shelvesBetween('repisa', ns, t, W - t, z + t, H - z - 2 * t, tb, D - tb - 20, t, cc, 5),
    ];
    if (z > 0) pieces.push(panel('zocalo', 'Zócalo', 'zocalo', iw, z, t, 'XY', [W / 2, z / 2, D - 50 - t / 2], { edges: edges(cc), step: 6 }));
    pieces.push(...doors('puerta', nd, W, z, H, D, t, g, cf, 7));
    return { pieces, size: { w: W, h: H, d: D + (nd > 0 ? t : 0) } };
  },
};

// ==================================================
// 4BYTES - Equipo de desarrollo
// Plantilla: Módulo alto / alacena
// ==================================================
// ---------- 2. Módulo alto / alacena ----------
const wallCabinet: Template = {
  id: 'wall-cabinet',
  name: 'Módulo alto / alacena',
  category: 'module',
  group: 'Cocina',
  icon: 'PanelTop',
  description: 'Alacena colgante con base, techo, fondo, repisas y puertas.',
  materials: { carcass: 'mel-blanco', front: 'mel-roble', back: 'hdf-blanco' },
  defaultY: 1450,
  params: [
    L('ancho', 'Ancho', 800, 150, 1500), L('alto', 'Alto', 720, 200, 1400), L('profundidad', 'Profundidad', 330, 150, 600),
    THICK, BACK, N('puertas', 'Puertas', 2, 0, 4), N('repisas', 'Repisas', 2, 0, 6), HOLGURA, CANTO_CASCO, CANTO_FRENTES,
  ],
  generate(p) {
    const W = n(p, 'ancho'), H = n(p, 'alto'), D = n(p, 'profundidad'), t = n(p, 'espesor'), tb = n(p, 'espesorFondo');
    const g = n(p, 'holgura'), nd = Math.round(n(p, 'puertas')), ns = Math.round(n(p, 'repisas'));
    const cc = n(p, 'cantoCasco'), cf = n(p, 'cantoFrentes');
    const iw = W - 2 * t;
    const pieces: Piece[] = [
      ...carcassSides(W, H, D, t, cc),
      panel('base', 'Base', 'base', iw, D - tb, t, 'XZ', [W / 2, t / 2, tb + (D - tb) / 2], { edges: edges(cc), step: 1 }),
      panel('techo', 'Techo', 'techo', iw, D - tb, t, 'XZ', [W / 2, H - t / 2, tb + (D - tb) / 2], { edges: edges(cc), step: 3 }),
      panel('fondo', 'Fondo', 'fondo', iw, H, tb, 'XY', [W / 2, H / 2, tb / 2], { slot: 'back', grain: false, step: 4 }),
      ...shelvesBetween('repisa', ns, t, W - t, t, H - 2 * t, tb, D - tb - 15, t, cc, 5),
      ...doors('puerta', nd, W, 0, H, D, t, g, cf, 6),
    ];
    return { pieces, size: { w: W, h: H, d: D + (nd > 0 ? t : 0) } };
  },
};

// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Generar las piezas de una cajonera (cajas y frentes)
// ==================================================
// ---------- 3. Cajonera de cocina ----------
function drawerUnitGenerate(p: Params): GenerateResult {
  const W = n(p, 'ancho'), H = n(p, 'alto'), D = n(p, 'profundidad'), t = n(p, 'espesor'), tb = n(p, 'espesorFondo');
  const z = Math.max(0, n(p, 'zocalo')), g = n(p, 'holgura'), count = Math.max(1, Math.round(n(p, 'gavetas')));
  const cc = n(p, 'cantoCasco'), cf = n(p, 'cantoFrentes'), bt = n(p, 'espesorCaja'), sc = n(p, 'descuentoCorredera');
  const iw = W - 2 * t;
  const pieces: Piece[] = [
    ...carcassSides(W, H, D, t, cc),
    panel('base', 'Base', 'base', iw, D - tb, t, 'XZ', [W / 2, z + t / 2, tb + (D - tb) / 2], { edges: edges(cc), step: 1 }),
    panel('trav-del', 'Travesaño', 'travesano', iw, 100, t, 'XZ', [W / 2, H - t / 2, D - 50], { edges: edges(cc), step: 3 }),
    panel('trav-tras', 'Travesaño', 'travesano', iw, 100, t, 'XZ', [W / 2, H - t / 2, tb + 50], { step: 3 }),
    panel('fondo', 'Fondo', 'fondo', iw, H - z, tb, 'XY', [W / 2, z + (H - z) / 2, tb / 2], { slot: 'back', grain: false, step: 4 }),
  ];
  if (z > 0) pieces.push(panel('zocalo', 'Zócalo', 'zocalo', iw, z, t, 'XY', [W / 2, z / 2, D - 50 - t / 2], { edges: edges(cc), step: 6 }));
  const { fronts } = calcDrawerFronts({
    totalHeight: H - z, totalWidth: W, count, gap: g, topGap: g / 2, bottomGap: g / 2, sideGap: g / 2,
    mode: p.distribucion === 'progresivo' ? 'progresivo' : 'iguales', ratio: 1.25,
  });
  fronts.forEach((f, idx) => {
    const i = idx + 1;
    pieces.push(
      panel(`frente-${i}`, 'Frente de gaveta', 'frente', f.width, f.height, t, 'XY', [W / 2, z + f.y + f.height / 2, D + t / 2], {
        slot: 'front', edges: edges(cf, cf, cf, cf), step: 7,
      }),
    );
    const bh = Math.max(60, Math.round(f.height - 50));
    const dr = calcDrawer({
      openingWidth: iw, depth: D - tb, boxHeight: bh, sideThickness: bt, bottomThickness: tb, slideClearance: sc,
      bottomMode: 'clavado', grooveDepth: 8, rearClearance: 10,
    });
    const len = dr.slideLength;
    const yb = Math.max(z + t + tb + 8, z + f.y + 20);
    const zc = D - len / 2;
    pieces.push(
      panel(`caj${i}-lat-izq`, 'Lateral de gaveta', 'cajon', len, bh, bt, 'ZY', [t + sc + bt / 2, yb + bh / 2, zc], { edges: edges(cc), step: 5 }),
      panel(`caj${i}-lat-der`, 'Lateral de gaveta', 'cajon', len, bh, bt, 'ZY', [W - t - sc - bt / 2, yb + bh / 2, zc], { edges: edges(cc), step: 5 }),
      panel(`caj${i}-frente`, 'Frente interior gaveta', 'cajon', dr.innerWidth, bh, bt, 'XY', [W / 2, yb + bh / 2, D - bt / 2], { edges: edges(cc), step: 5 }),
      panel(`caj${i}-trasera`, 'Trasera de gaveta', 'cajon', dr.innerWidth, bh, bt, 'XY', [W / 2, yb + bh / 2, D - len + bt / 2], { edges: edges(cc), step: 5 }),
      panel(`caj${i}-fondo`, 'Fondo de gaveta', 'fondo', dr.outerWidth, len, tb, 'XZ', [W / 2, yb - tb / 2, zc], { slot: 'back', grain: false, step: 5 }),
    );
  });
  return { pieces, size: { w: W, h: H, d: D + t } };
}

// ==================================================
// 4BYTES - Equipo de desarrollo
// Plantilla: Cajonera de cocina
// ==================================================
const drawerUnit: Template = {
  id: 'drawer-unit',
  name: 'Cajonera de cocina',
  category: 'module',
  group: 'Cocina',
  icon: 'Rows3',
  description: 'Cajonera de 2 a 6 gavetas con cajas calculadas para correderas telescópicas.',
  materials: { carcass: 'mel-blanco', front: 'mel-roble', back: 'hdf-blanco' },
  params: [
    L('ancho', 'Ancho', 600, 300, 1200), L('alto', 'Alto (con zócalo)', 870, 300, 1400), L('profundidad', 'Profundidad', 560, 300, 800),
    THICK, BACK, S('espesorCaja', 'Espesor caja de gaveta', '15', [['12', '12 mm'], ['15', '15 mm'], ['18', '18 mm']], 'Tableros'),
    L('zocalo', 'Altura de zócalo', 100, 0, 250, 'Construcción'),
    S('gavetas', 'Gavetas', '3', [['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6']]),
    S('distribucion', 'Distribución de frentes', 'iguales', [['iguales', 'Iguales'], ['progresivo', 'Progresiva (abajo más altas)']]),
    L('descuentoCorredera', 'Descuento corredera (por lado)', 12.7, 0, 30, 'Holguras'), HOLGURA, CANTO_CASCO, CANTO_FRENTES,
  ],
  generate: drawerUnitGenerate,
};

// ==================================================
// 4BYTES - Equipo de desarrollo
// Plantilla: Clóset / ropero
// ==================================================
// ---------- 4. Clóset / ropero ----------
const closet: Template = {
  id: 'closet',
  name: 'Clóset / ropero',
  category: 'module',
  group: 'Dormitorio',
  icon: 'DoorClosed',
  description: 'Ropero con división, repisas, maletero, barra colgadora y puertas.',
  materials: { carcass: 'mel-blanco', front: 'mel-nogal', back: 'hdf-blanco' },
  params: [
    L('ancho', 'Ancho', 1200, 400, 3000), L('alto', 'Alto', 2100, 800, 2700), L('profundidad', 'Profundidad', 580, 300, 800),
    THICK, BACK, L('zocalo', 'Altura de zócalo', 80, 0, 200, 'Construcción'),
    N('puertas', 'Puertas', 2, 0, 6), N('repisas', 'Repisas (columna izq.)', 4, 0, 10), BOOL('division', 'División central', true),
    L('maletero', 'Altura de maletero', 350, 150, 700, 'Construcción'), BOOL('barra', 'Barra colgadora', true),
    HOLGURA, CANTO_CASCO, CANTO_FRENTES,
  ],
  generate(p) {
    const W = n(p, 'ancho'), H = n(p, 'alto'), D = n(p, 'profundidad'), t = n(p, 'espesor'), tb = n(p, 'espesorFondo');
    const z = Math.max(0, n(p, 'zocalo')), g = n(p, 'holgura'), nd = Math.round(n(p, 'puertas')), ns = Math.round(n(p, 'repisas'));
    const cc = n(p, 'cantoCasco'), cf = n(p, 'cantoFrentes'), mal = n(p, 'maletero');
    const iw = W - 2 * t;
    const dIn = D - tb;
    const pieces: Piece[] = [
      ...carcassSides(W, H, D, t, cc),
      panel('base', 'Base', 'base', iw, dIn, t, 'XZ', [W / 2, z + t / 2, tb + dIn / 2], { edges: edges(cc), step: 1 }),
      panel('techo', 'Techo', 'techo', iw, dIn, t, 'XZ', [W / 2, H - t / 2, tb + dIn / 2], { edges: edges(cc), step: 3 }),
      panel('fondo', 'Fondo', 'fondo', iw, H - z, tb, 'XY', [W / 2, z + (H - z) / 2, tb / 2], { slot: 'back', grain: false, step: 4 }),
    ];
    if (z > 0) pieces.push(panel('zocalo', 'Zócalo', 'zocalo', iw, z, t, 'XY', [W / 2, z / 2, D - 40 - t / 2], { edges: edges(cc), step: 7 }));
    const hd = H - z - 2 * t;
    let rx0 = t;
    const rx1 = W - t;
    if (b(p, 'division')) {
      pieces.push(panel('division', 'División', 'division', hd, dIn, t, 'YZ', [W / 2, z + t + hd / 2, tb + dIn / 2], { edges: edges(cc), step: 3 }));
      pieces.push(...shelvesBetween('repisa', ns, t, W / 2 - t / 2, z + t, hd, tb, dIn - 20, t, cc, 5));
      rx0 = W / 2 + t / 2;
    }
    const yMal = H - t - mal - t / 2;
    pieces.push(panel('maletero', 'Repisa maletero', 'repisa', rx1 - rx0 - 2, dIn - 20, t, 'XZ', [(rx0 + rx1) / 2, yMal, tb + (dIn - 20) / 2], { edges: edges(cc), step: 5 }));
    if (b(p, 'barra')) {
      pieces.push(
        cylinder('barra', 'Barra colgadora Ø25', 'barra', rx1 - rx0 - 4, 12.5, 12.5, [(rx0 + rx1) / 2, yMal - t / 2 - 60, tb + dIn / 2], {
          materialId: 'metal-cromo', rotation: [0, 0, 90], step: 6,
        }),
      );
    }
    pieces.push(...doors('puerta', nd, W, z, H, D, t, g, cf, 8));
    return { pieces, size: { w: W, h: H, d: D + (nd > 0 ? t : 0) } };
  },
};

// ==================================================
// 4BYTES - Equipo de desarrollo
// Plantilla: Escritorio / mesa
// ==================================================
// ---------- 5. Escritorio ----------
const desk: Template = {
  id: 'desk',
  name: 'Escritorio / mesa',
  category: 'module',
  group: 'Oficina y sala',
  icon: 'Table2',
  description: 'Tapa con esquinas curvas, patas de paneles o patas cónicas/cilíndricas de pino con faldones espigados.',
  materials: { carcass: 'mel-roble', front: 'mel-roble', back: 'mel-blanco' },
  params: [
    L('ancho', 'Ancho', 1200, 500, 2800), L('alto', 'Alto', 750, 400, 1100), L('profundidad', 'Profundidad', 600, 350, 1200),
    S('espesorTapa', 'Espesor de tapa', '25', [['18', '18 mm'], ['25', '25 mm'], ['36', '36 mm']], 'Tableros'), THICK,
    L('radio', 'Radio de esquinas de tapa', 30, 0, 200, 'Cortes especiales'),
    S('patas', 'Tipo de patas', 'paneles', [['paneles', 'Laterales de tablero'], ['conicas', 'Patas cónicas (pino)'], ['cilindricas', 'Patas cilíndricas (pino)']]),
    L('diametroPata', 'Diámetro de pata', 50, 20, 120, 'Construcción'), BOOL('faldon', 'Faldón / panel de modestia', true),
    BOOL('repisaInferior', 'Repisa inferior (solo paneles)', false), CANTO_CASCO, CANTO_FRENTES,
  ],
  generate(p) {
    const W = n(p, 'ancho'), H = n(p, 'alto'), D = n(p, 'profundidad'), tt = n(p, 'espesorTapa'), t = n(p, 'espesor');
    const r = n(p, 'radio'), cc = n(p, 'cantoCasco'), cf = n(p, 'cantoFrentes'), dp = n(p, 'diametroPata');
    const pieces: Piece[] = [
      panel('tapa', 'Tapa', 'tapa', W, D, tt, 'XZ', [W / 2, H - tt / 2, D / 2], {
        slot: 'front', edges: edges(cf, cf, cf, cf), features: { cornerRadius: r }, step: 4,
      }),
    ];
    const legH = H - tt;
    if (p.patas === 'paneles') {
      const ins = 40;
      pieces.push(
        panel('lat-izq', 'Lateral', 'lateral', legH, D - 60, t, 'YZ', [ins + t / 2, legH / 2, D / 2], { edges: edges(cc, cc, 0, 0), step: 1 }),
        panel('lat-der', 'Lateral', 'lateral', legH, D - 60, t, 'YZ', [W - ins - t / 2, legH / 2, D / 2], { edges: edges(cc, cc, 0, 0), step: 1 }),
      );
      const inner = W - 2 * ins - 2 * t;
      if (b(p, 'faldon')) pieces.push(panel('faldon', 'Faldón', 'faldon', inner, 300, t, 'XY', [W / 2, legH - 150, 60 + t / 2], { edges: edges(cc), step: 2 }));
      if (b(p, 'repisaInferior')) pieces.push(panel('repisa', 'Repisa inferior', 'repisa', inner, D - 120, t, 'XZ', [W / 2, 150, D / 2], { edges: edges(cc), step: 3 }));
    } else {
      const ins = 60;
      const rTop = dp / 2;
      const rBot = p.patas === 'conicas' ? dp * 0.3 : dp / 2;
      const legs: [string, number, number][] = [['pata-1', ins, ins], ['pata-2', W - ins, ins], ['pata-3', ins, D - ins], ['pata-4', W - ins, D - ins]];
      legs.forEach(([k, x, zz]) => pieces.push(cylinder(k, p.patas === 'conicas' ? 'Pata cónica' : 'Pata cilíndrica', 'pata', legH, rTop, rBot, [x, legH / 2, zz], { materialId: 'pino', step: 1 })));
      const ten = { length: 25, size: 60, thickness: 8 };
      const fl = W - 2 * ins - dp;
      const fd = D - 2 * ins - dp;
      pieces.push(
        panel('faldon-tras', 'Faldón (espigado)', 'faldon', fl, 100, 20, 'XY', [W / 2, legH - 50, ins], {
          materialId: 'pino', slot: 'fixed', step: 2,
          features: { tenons: [{ id: 't1', edge: 'w1', ...ten }, { id: 't2', edge: 'w2', ...ten }] },
        }),
        panel('faldon-del', 'Faldón (espigado)', 'faldon', fl, 100, 20, 'XY', [W / 2, legH - 50, D - ins], {
          materialId: 'pino', slot: 'fixed', step: 2,
          features: { tenons: [{ id: 't1', edge: 'w1', ...ten }, { id: 't2', edge: 'w2', ...ten }] },
        }),
        panel('faldon-izq', 'Faldón lateral (espigado)', 'faldon', fd, 100, 20, 'ZY', [ins, legH - 50, D / 2], {
          materialId: 'pino', slot: 'fixed', step: 3,
          features: { tenons: [{ id: 't1', edge: 'w1', ...ten }, { id: 't2', edge: 'w2', ...ten }] },
        }),
        panel('faldon-der', 'Faldón lateral (espigado)', 'faldon', fd, 100, 20, 'ZY', [W - ins, legH - 50, D / 2], {
          materialId: 'pino', slot: 'fixed', step: 3,
          features: { tenons: [{ id: 't1', edge: 'w1', ...ten }, { id: 't2', edge: 'w2', ...ten }] },
        }),
      );
    }
    return { pieces, size: { w: W, h: H, d: D } };
  },
};

// ==================================================
// 4BYTES - Equipo de desarrollo
// Plantilla: Estante / librero
// ==================================================
// ---------- 6. Estante / librero ----------
const shelf: Template = {
  id: 'shelf',
  name: 'Estante / librero',
  category: 'module',
  group: 'Oficina y sala',
  icon: 'LibraryBig',
  description: 'Librero con repisas distribuidas uniformemente y fondo opcional.',
  materials: { carcass: 'mel-roble', front: 'mel-roble', back: 'hdf-blanco' },
  params: [
    L('ancho', 'Ancho', 800, 250, 2000), L('alto', 'Alto', 1800, 300, 2700), L('profundidad', 'Profundidad', 300, 150, 600),
    THICK, BACK, L('zocalo', 'Altura de zócalo', 60, 0, 200, 'Construcción'), N('repisas', 'Repisas', 4, 0, 12),
    BOOL('conFondo', 'Con fondo', true), CANTO_CASCO,
  ],
  generate(p) {
    const W = n(p, 'ancho'), H = n(p, 'alto'), D = n(p, 'profundidad'), t = n(p, 'espesor'), tb = n(p, 'espesorFondo');
    const z = Math.max(0, n(p, 'zocalo')), ns = Math.round(n(p, 'repisas')), cc = n(p, 'cantoCasco');
    const conFondo = b(p, 'conFondo');
    const zb = conFondo ? tb : 0;
    const iw = W - 2 * t;
    const pieces: Piece[] = [
      ...carcassSides(W, H, D, t, cc),
      panel('base', 'Base', 'base', iw, D - zb, t, 'XZ', [W / 2, z + t / 2, zb + (D - zb) / 2], { edges: edges(cc), step: 1 }),
      panel('techo', 'Techo', 'techo', iw, D - zb, t, 'XZ', [W / 2, H - t / 2, zb + (D - zb) / 2], { edges: edges(cc), step: 3 }),
      ...shelvesBetween('repisa', ns, t, W - t, z + t, H - z - 2 * t, zb, D - zb - 10, t, cc, 5),
    ];
    if (conFondo) pieces.push(panel('fondo', 'Fondo', 'fondo', iw, H - z, tb, 'XY', [W / 2, z + (H - z) / 2, tb / 2], { slot: 'back', grain: false, step: 4 }));
    if (z > 0) pieces.push(panel('zocalo', 'Zócalo', 'zocalo', iw, z, t, 'XY', [W / 2, z / 2, D - 20 - t / 2], { edges: edges(cc), step: 6 }));
    return { pieces, size: { w: W, h: H, d: D } };
  },
};

// ==================================================
// 4BYTES - Equipo de desarrollo
// Plantilla: Pieza suelta (tablero, cilindro o cono)
// ==================================================
// ---------- 7. Pieza suelta (tablero / cilindro / cono) ----------
const freePiece: Template = {
  id: 'free-piece',
  name: 'Pieza suelta',
  category: 'piece',
  group: 'Piezas',
  icon: 'Square',
  description: 'Tablero, cilindro o cono independiente. Admite radios, diagonales, biseles, calados y espigas.',
  materials: { carcass: 'mel-blanco', front: 'mel-blanco', back: 'mel-blanco' },
  params: [
    S('forma', 'Forma', 'tablero', [['tablero', 'Tablero'], ['cilindro', 'Cilindro'], ['cono', 'Cono / pata cónica']], 'Medidas'),
    L('largo', 'Largo / altura', 600, 10, 3000), L('ancho', 'Ancho', 400, 10, 2000), THICK,
    S('orientacion', 'Orientación', 'horizontal', [['horizontal', 'Horizontal (acostada)'], ['vertical', 'Vertical (de canto)'], ['frontal', 'Frontal (de cara)']], 'Medidas'),
    L('diametro', 'Diámetro (mayor)', 60, 5, 600, 'Cilindro / cono'), L('diametroMenor', 'Diámetro menor (cono)', 30, 2, 600, 'Cilindro / cono'),
  ],
  generate(p) {
    const Lg = n(p, 'largo'), Wd = n(p, 'ancho'), T = n(p, 'espesor');
    if (p.forma === 'cilindro' || p.forma === 'cono') {
      const d = n(p, 'diametro');
      const r = d / 2;
      const r2 = p.forma === 'cono' ? n(p, 'diametroMenor') / 2 : r;
      return {
        pieces: [cylinder('pieza', p.forma === 'cono' ? 'Cono' : 'Cilindro', 'pieza', Lg, r, r2, [d / 2, Lg / 2, d / 2], { slot: 'carcass' })],
        size: { w: d, h: Lg, d },
      };
    }
    if (p.orientacion === 'vertical') {
      return { pieces: [panel('pieza', 'Pieza', 'pieza', Lg, Wd, T, 'YZ', [T / 2, Lg / 2, Wd / 2])], size: { w: T, h: Lg, d: Wd } };
    }
    if (p.orientacion === 'frontal') {
      return { pieces: [panel('pieza', 'Pieza', 'pieza', Lg, Wd, T, 'XY', [Lg / 2, Wd / 2, T / 2])], size: { w: Lg, h: Wd, d: T } };
    }
    return { pieces: [panel('pieza', 'Pieza', 'pieza', Lg, Wd, T, 'XZ', [Lg / 2, T / 2, Wd / 2])], size: { w: Lg, h: T, d: Wd } };
  },
};

// ==================================================
// 4BYTES - Equipo de desarrollo
// Plantilla: Pared / muro con vano
// ==================================================
// ---------- 8. Pared / muro ----------
const wall: Template = {
  id: 'wall',
  name: 'Pared / muro',
  category: 'wall',
  group: 'Ambiente',
  icon: 'BrickWall',
  description: 'Muro estructural con vano opcional de ventana o puerta.',
  materials: { carcass: 'pared-blanca', front: 'pared-blanca', back: 'pared-blanca' },
  params: [
    L('largo', 'Largo', 3000, 200, 15000), L('alto', 'Alto', 2500, 500, 5000), L('grosor', 'Grosor', 150, 50, 600),
    S('vanoTipo', 'Vano', 'ninguno', [['ninguno', 'Sin vano'], ['ventana', 'Ventana'], ['puerta', 'Puerta']], 'Vano'),
    L('vanoAncho', 'Ancho de vano', 1200, 100, 5000, 'Vano'), L('vanoAlto', 'Alto de vano', 1100, 100, 3000, 'Vano'),
    L('vanoX', 'Distancia desde la izquierda', 900, 0, 15000, 'Vano'), L('vanoY', 'Altura de alféizar', 1000, 0, 3000, 'Vano'),
  ],
  generate(p) {
    const Lg = n(p, 'largo'), H = n(p, 'alto'), T = n(p, 'grosor');
    const holes = [];
    if (p.vanoTipo !== 'ninguno') {
      const w = Math.min(n(p, 'vanoAncho'), Lg - 20);
      const isDoor = p.vanoTipo === 'puerta';
      const h = Math.min(n(p, 'vanoAlto'), H - (isDoor ? 20 : 40));
      const y0 = isDoor ? 2 : Math.min(n(p, 'vanoY'), H - h - 10);
      const x = Math.min(Math.max(n(p, 'vanoX') + w / 2, w / 2 + 5), Lg - w / 2 - 5);
      holes.push({ id: 'vano', shape: 'rect' as const, x, y: y0 + h / 2, w, h, r: 0 });
    }
    return {
      pieces: [panel('muro', 'Muro', 'pared', Lg, H, T, 'XY', [Lg / 2, H / 2, T / 2], { grain: false, cutlist: false, features: { holes } })],
      size: { w: Lg, h: H, d: T },
    };
  },
};

// ==================================================
// 4BYTES - Equipo de desarrollo
// Plantilla: Piso
// ==================================================
// ---------- 9. Piso ----------
const floor: Template = {
  id: 'floor',
  name: 'Piso',
  category: 'floor',
  group: 'Ambiente',
  icon: 'Grid2x2',
  description: 'Superficie de piso de la habitación.',
  materials: { carcass: 'piso-ceramico', front: 'piso-ceramico', back: 'piso-ceramico' },
  params: [L('ancho', 'Ancho', 4000, 500, 20000), L('profundidad', 'Profundidad', 3500, 500, 20000)],
  generate(p) {
    const W = n(p, 'ancho'), D = n(p, 'profundidad');
    return { pieces: [panel('piso', 'Piso', 'piso', W, D, 10, 'XZ', [W / 2, -5, D / 2], { grain: false, cutlist: false })], size: { w: W, h: 0, d: D } };
  },
};

// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Generar una columna de gavetas (frentes y cajas) dentro de un hueco
// ==================================================
interface DrawerColumnOpts {
  prefix: string;
  /** hueco interior entre paneles (para las cajas) */
  x0: number;
  x1: number;
  /** extensión de los frentes sobrepuestos */
  fx0: number;
  fx1: number;
  /** cara superior de la base (apoyo de cajas) */
  yBase: number;
  /** zona de frentes */
  fy0: number;
  fh: number;
  count: number;
  mode: string;
  D: number;
  t: number;
  tb: number;
  bt: number;
  sc: number;
  g: number;
  cc: number;
  cf: number;
}
function drawerColumn(o: DrawerColumnOpts): Piece[] {
  const out: Piece[] = [];
  const { fronts } = calcDrawerFronts({
    totalHeight: o.fh, totalWidth: o.fx1 - o.fx0, count: Math.max(1, o.count), gap: o.g, topGap: o.g / 2, bottomGap: o.g / 2, sideGap: o.g / 2,
    mode: o.mode === 'progresivo' ? 'progresivo' : 'iguales', ratio: 1.25,
  });
  const ow = o.x1 - o.x0;
  const cx = (o.x0 + o.x1) / 2;
  fronts.forEach((f, idx) => {
    const i = idx + 1;
    out.push(
      panel(`${o.prefix}frente-${i}`, 'Frente de gaveta', 'frente', f.width, f.height, o.t, 'XY', [(o.fx0 + o.fx1) / 2, o.fy0 + f.y + f.height / 2, o.D + o.t / 2], {
        slot: 'front', edges: edges(o.cf, o.cf, o.cf, o.cf), step: 7,
      }),
    );
    const bh = Math.max(60, Math.round(f.height - 50));
    const dr = calcDrawer({
      openingWidth: ow, depth: o.D - o.tb, boxHeight: bh, sideThickness: o.bt, bottomThickness: o.tb, slideClearance: o.sc,
      bottomMode: 'clavado', grooveDepth: 8, rearClearance: 10,
    });
    const len = dr.slideLength;
    const yb = Math.max(o.yBase + o.tb + 8, o.fy0 + f.y + 20);
    const zc = o.D - len / 2;
    out.push(
      panel(`${o.prefix}caj${i}-lat-izq`, 'Lateral de gaveta', 'cajon', len, bh, o.bt, 'ZY', [o.x0 + o.sc + o.bt / 2, yb + bh / 2, zc], { edges: edges(o.cc), step: 5 }),
      panel(`${o.prefix}caj${i}-lat-der`, 'Lateral de gaveta', 'cajon', len, bh, o.bt, 'ZY', [o.x1 - o.sc - o.bt / 2, yb + bh / 2, zc], { edges: edges(o.cc), step: 5 }),
      panel(`${o.prefix}caj${i}-frente`, 'Frente interior gaveta', 'cajon', dr.innerWidth, bh, o.bt, 'XY', [cx, yb + bh / 2, o.D - o.bt / 2], { edges: edges(o.cc), step: 5 }),
      panel(`${o.prefix}caj${i}-trasera`, 'Trasera de gaveta', 'cajon', dr.innerWidth, bh, o.bt, 'XY', [cx, yb + bh / 2, o.D - len + o.bt / 2], { edges: edges(o.cc), step: 5 }),
      panel(`${o.prefix}caj${i}-fondo`, 'Fondo de gaveta', 'fondo', dr.outerWidth, len, o.tb, 'XZ', [cx, yb - o.tb / 2, zc], { slot: 'back', grain: false, step: 5 }),
    );
  });
  return out;
}

// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Generar puertas dentro de un tramo horizontal (fx0..fx1)
// ==================================================
function doorsIn(prefix: string, count: number, fx0: number, fx1: number, lg: number, rg: number, y0: number, y1: number, zFront: number, t: number, g: number, cf: number, step: number): Piece[] {
  const out: Piece[] = [];
  if (count <= 0) return out;
  const dw = (fx1 - fx0 - lg - rg - g * (count - 1)) / count;
  const dh = y1 - y0 - g;
  for (let i = 0; i < count; i++) {
    const x = fx0 + lg + dw / 2 + i * (dw + g);
    out.push(panel(`${prefix}-${i + 1}`, 'Puerta', 'puerta', dh, dw, t, 'YX', [x, y0 + g / 2 + dh / 2, zFront + t / 2], { slot: 'front', edges: edges(cf, cf, cf, cf), step }));
  }
  return out;
}

const ESPESOR_CAJA = S('espesorCaja', 'Espesor caja de gaveta', '15', [['12', '12 mm'], ['15', '15 mm'], ['18', '18 mm']], 'Tableros');
const DESC_CORREDERA = L('descuentoCorredera', 'Descuento corredera (por lado)', 12.7, 0, 30, 'Holguras');
const DISTRIBUCION = S('distribucion', 'Distribución de frentes', 'iguales', [['iguales', 'Iguales'], ['progresivo', 'Progresiva (abajo más altas)']]);

// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Generar una cómoda / velador con tapa, gavetas y nicho opcional
// ==================================================
function chestGenerate(p: Params): GenerateResult {
  const W = n(p, 'ancho'), H = n(p, 'alto'), D = n(p, 'profundidad'), t = n(p, 'espesor'), tb = n(p, 'espesorFondo');
  const z = Math.max(0, n(p, 'zocalo')), g = n(p, 'holgura'), count = Math.max(1, Math.round(n(p, 'gavetas')));
  const cc = n(p, 'cantoCasco'), cf = n(p, 'cantoFrentes'), bt = n(p, 'espesorCaja'), sc = n(p, 'descuentoCorredera');
  const cols = p.columnas === '2' ? 2 : 1;
  const nicho = Math.max(0, n(p, 'nicho'));
  const iw = W - 2 * t;
  const hs = H - t;
  const pieces: Piece[] = [
    panel('tapa', 'Tapa', 'tapa', W, D, t, 'XZ', [W / 2, H - t / 2, D / 2], { edges: edges(cc, cc, cc, cc), step: 3 }),
    panel('lat-izq', 'Lateral', 'lateral', hs, D, t, 'YZ', [t / 2, hs / 2, D / 2], { edges: edges(cc, 0, 0, 0), step: 1 }),
    panel('lat-der', 'Lateral', 'lateral', hs, D, t, 'YZ', [W - t / 2, hs / 2, D / 2], { edges: edges(cc, 0, 0, 0), step: 2 }),
    panel('base', 'Base', 'base', iw, D - tb, t, 'XZ', [W / 2, z + t / 2, tb + (D - tb) / 2], { edges: edges(cc), step: 1 }),
    panel('fondo', 'Fondo', 'fondo', iw, hs - z, tb, 'XY', [W / 2, z + (hs - z) / 2, tb / 2], { slot: 'back', grain: false, step: 4 }),
  ];
  if (z > 0) pieces.push(panel('zocalo', 'Zócalo', 'zocalo', iw, z, t, 'XY', [W / 2, z / 2, D - 40 - t / 2], { edges: edges(cc), step: 6 }));
  // Nicho abierto bajo la tapa
  let top = hs;
  if (nicho > 0 && nicho < hs - z - 120) {
    const yShelf = hs - nicho - t / 2;
    pieces.push(panel('repisa-nicho', 'Repisa de nicho', 'repisa', iw, D - tb, t, 'XZ', [W / 2, yShelf, tb + (D - tb) / 2], { edges: edges(cc), step: 3 }));
    top = yShelf - t / 2;
  }
  const common = { yBase: z + t, fy0: z, fh: top - z, count, mode: String(p.distribucion), D, t, tb, bt, sc, g, cc, cf };
  if (cols === 2) {
    const divH = top - (z + t);
    pieces.push(panel('division', 'División', 'division', divH, D - tb, t, 'YZ', [W / 2, z + t + divH / 2, tb + (D - tb) / 2], { edges: edges(cc), step: 3 }));
    pieces.push(...drawerColumn({ ...common, prefix: 'izq-', x0: t, x1: W / 2 - t / 2, fx0: 0, fx1: W / 2 }));
    pieces.push(...drawerColumn({ ...common, prefix: 'der-', x0: W / 2 + t / 2, x1: W - t, fx0: W / 2, fx1: W }));
  } else {
    pieces.push(...drawerColumn({ ...common, prefix: '', x0: t, x1: W - t, fx0: 0, fx1: W }));
  }
  return { pieces, size: { w: W, h: H, d: D + t } };
}

// ==================================================
// 4BYTES - Equipo de desarrollo
// Plantilla: Cómoda
// ==================================================
const chest: Template = {
  id: 'chest',
  name: 'Cómoda',
  category: 'module',
  group: 'Dormitorio',
  icon: 'Rows4',
  description: 'Cómoda con tapa, 1 o 2 columnas de gavetas, nicho abierto opcional y zócalo.',
  materials: { carcass: 'mel-blanco', front: 'mel-roble', back: 'hdf-blanco' },
  params: [
    L('ancho', 'Ancho', 1000, 400, 2200), L('alto', 'Alto', 900, 400, 1500), L('profundidad', 'Profundidad', 450, 300, 700),
    THICK, BACK, ESPESOR_CAJA, L('zocalo', 'Altura de zócalo', 60, 0, 200, 'Construcción'),
    S('columnas', 'Columnas de gavetas', '2', [['1', '1 columna'], ['2', '2 columnas']]),
    N('gavetas', 'Gavetas por columna', 4, 1, 8), DISTRIBUCION, L('nicho', 'Nicho abierto arriba (0 = sin nicho)', 0, 0, 600, 'Construcción'),
    DESC_CORREDERA, HOLGURA, CANTO_CASCO, CANTO_FRENTES,
  ],
  generate: chestGenerate,
};

// ==================================================
// 4BYTES - Equipo de desarrollo
// Plantilla: Velador / mesa de noche
// ==================================================
const nightstand: Template = {
  id: 'nightstand',
  name: 'Velador / mesa de noche',
  category: 'module',
  group: 'Dormitorio',
  icon: 'Lamp',
  description: 'Mesa de noche con gavetas y nicho abierto superior.',
  materials: { carcass: 'mel-blanco', front: 'mel-roble', back: 'hdf-blanco' },
  params: [
    L('ancho', 'Ancho', 450, 300, 800), L('alto', 'Alto', 550, 350, 800), L('profundidad', 'Profundidad', 400, 250, 600),
    THICK, BACK, ESPESOR_CAJA, L('zocalo', 'Altura de zócalo', 50, 0, 200, 'Construcción'),
    S('columnas', 'Columnas de gavetas', '1', [['1', '1 columna'], ['2', '2 columnas']]),
    N('gavetas', 'Gavetas por columna', 2, 1, 4), DISTRIBUCION, L('nicho', 'Nicho abierto arriba (0 = sin nicho)', 150, 0, 400, 'Construcción'),
    DESC_CORREDERA, HOLGURA, CANTO_CASCO, CANTO_FRENTES,
  ],
  generate: chestGenerate,
};

// ==================================================
// 4BYTES - Equipo de desarrollo
// Plantilla: Cama (cabecera, piecera, largueros y tarima)
// ==================================================
const MATTRESS: Record<string, [number, number]> = {
  '1': [900, 1900], '1.5': [1050, 1900], '2': [1350, 1900], queen: [1500, 2000], king: [2000, 2000],
};
const bed: Template = {
  id: 'bed',
  name: 'Cama',
  category: 'module',
  group: 'Dormitorio',
  icon: 'BedDouble',
  description: 'Cama de tablero: cabecera, piecera, largueros, apoyos, viga central y tarima de listones o tablero entero.',
  materials: { carcass: 'mel-nogal', front: 'mel-nogal', back: 'mel-blanco' },
  params: [
    S('colchon', 'Medida de colchón', '2', [
      ['1', '1 plaza (900 × 1900)'], ['1.5', '1½ plazas (1050 × 1900)'], ['2', '2 plazas (1350 × 1900)'],
      ['queen', 'Queen (1500 × 2000)'], ['king', 'King (2000 × 2000)'], ['custom', 'Personalizada'],
    ], 'Medidas'),
    L('anchoColchon', 'Ancho colchón (personalizada)', 1350, 600, 2400), L('largoColchon', 'Largo colchón (personalizada)', 1900, 1500, 2400),
    L('altoCabecera', 'Alto de cabecera', 1000, 300, 1800), L('altoPiecera', 'Alto de piecera', 350, 150, 1200),
    L('altoLarguero', 'Alto de largueros', 300, 120, 600), L('alturaTarima', 'Altura de tarima desde el piso', 250, 80, 550),
    THICK, S('tarima', 'Tipo de tarima', 'listones', [['listones', 'Listones'], ['tablero', 'Tablero entero (2 partes)']]),
    N('listones', 'Cantidad de listones', 12, 4, 30), L('anchoListon', 'Ancho de listón', 90, 40, 200, 'Construcción'),
    BOOL('vigaCentral', 'Viga central con patas', true), L('holguraColchon', 'Holgura colchón (por lado)', 10, 0, 50, 'Holguras'), CANTO_CASCO,
  ],
  generate(p) {
    const preset = MATTRESS[String(p.colchon)];
    const mw = preset ? preset[0] : n(p, 'anchoColchon');
    const ml = preset ? preset[1] : n(p, 'largoColchon');
    const t = n(p, 'espesor'), h = n(p, 'holguraColchon'), cc = n(p, 'cantoCasco');
    const Hc = n(p, 'altoCabecera'), Hp = n(p, 'altoPiecera'), Hl = n(p, 'altoLarguero');
    const iW = mw + 2 * h;
    const iL = ml + 2 * h;
    const W = iW + 2 * t;
    const D = iL + 2 * t;
    const ya = Math.min(Math.max(60, n(p, 'alturaTarima') - t), Hl - t); // cara inferior de la tarima
    const pieces: Piece[] = [
      panel('cabecera', 'Cabecera', 'lateral', W, Hc, t, 'XY', [W / 2, Hc / 2, t / 2], { edges: edges(cc, cc, cc, cc), step: 1 }),
      panel('piecera', 'Piecera', 'lateral', W, Hp, t, 'XY', [W / 2, Hp / 2, D - t / 2], { edges: edges(cc, cc, cc, cc), step: 1 }),
      panel('larg-izq', 'Larguero', 'lateral', iL, Hl, t, 'ZY', [t / 2, Hl / 2, t + iL / 2], { edges: edges(cc, 0, 0, 0), step: 2 }),
      panel('larg-der', 'Larguero', 'lateral', iL, Hl, t, 'ZY', [W - t / 2, Hl / 2, t + iL / 2], { edges: edges(cc, 0, 0, 0), step: 2 }),
      panel('apoyo-izq', 'Listón de apoyo', 'travesano', iL, 60, t, 'ZY', [t + t / 2, ya - 30, t + iL / 2], { step: 3 }),
      panel('apoyo-der', 'Listón de apoyo', 'travesano', iL, 60, t, 'ZY', [W - t - t / 2, ya - 30, t + iL / 2], { step: 3 }),
    ];
    if (b(p, 'vigaCentral')) {
      const vh = 100;
      pieces.push(panel('viga', 'Viga central', 'travesano', iL, vh, t, 'ZY', [W / 2, ya - vh / 2, t + iL / 2], { step: 3 }));
      const ph = Math.max(20, ya - vh);
      [0.3, 0.7].forEach((f, i) => pieces.push(panel(`pata-viga-${i + 1}`, 'Pata de viga', 'pata', ph, 100, t, 'YX', [W / 2, ph / 2, t + iL * f], { step: 3 })));
    }
    if (p.tarima === 'tablero') {
      [0.25, 0.75].forEach((f, i) =>
        pieces.push(panel(`tarima-${i + 1}`, 'Tarima', 'repisa', iW - 2, iL / 2 - 1, t, 'XZ', [W / 2, ya + t / 2, t + iL * f], { slot: 'back', grain: false, step: 4 })),
      );
    } else {
      const nl = Math.max(2, Math.round(n(p, 'listones')));
      const lw = n(p, 'anchoListon');
      for (let i = 0; i < nl; i++) {
        const zc = t + lw / 2 + ((iL - lw) * i) / (nl - 1);
        pieces.push(panel(`liston-${i + 1}`, 'Listón de tarima', 'repisa', iW - 2, lw, t, 'XZ', [W / 2, ya + t / 2, zc], { step: 4 }));
      }
    }
    return { pieces, size: { w: W, h: Math.max(Hc, Hp, Hl), d: D } };
  },
};

// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Generar un mueble a medida por columnas (repisas, puertas o gavetas)
// ==================================================
function customGenerate(p: Params): GenerateResult {
  const W = n(p, 'ancho'), H = n(p, 'alto'), D = n(p, 'profundidad'), t = n(p, 'espesor'), tb = n(p, 'espesorFondo');
  const z = Math.max(0, n(p, 'zocalo')), g = n(p, 'holgura'), cc = n(p, 'cantoCasco'), cf = n(p, 'cantoFrentes');
  const cols = Math.max(1, Math.round(n(p, 'columnas'))), ns = Math.round(n(p, 'repisas'));
  const bt = n(p, 'espesorCaja'), sc = n(p, 'descuentoCorredera'), nDr = Math.max(1, Math.round(n(p, 'gavetas')));
  const conFondo = b(p, 'conFondo'), tapa = b(p, 'tapaCompleta');
  const frente = String(p.frente);
  const zb = conFondo ? tb : 0;
  const iw = W - 2 * t;
  const hs = tapa ? H - t : H;
  const pieces: Piece[] = [
    panel('lat-izq', 'Lateral', 'lateral', hs, D, t, 'YZ', [t / 2, hs / 2, D / 2], { edges: edges(cc, 0, tapa ? 0 : cc, 0), step: 1 }),
    panel('lat-der', 'Lateral', 'lateral', hs, D, t, 'YZ', [W - t / 2, hs / 2, D / 2], { edges: edges(cc, 0, tapa ? 0 : cc, 0), step: 2 }),
    panel('base', 'Base', 'base', iw, D - zb, t, 'XZ', [W / 2, z + t / 2, zb + (D - zb) / 2], { edges: edges(cc), step: 1 }),
    tapa
      ? panel('tapa', 'Tapa', 'tapa', W, D, t, 'XZ', [W / 2, H - t / 2, D / 2], { edges: edges(cc, cc, cc, cc), step: 3 })
      : panel('techo', 'Techo', 'techo', iw, D - zb, t, 'XZ', [W / 2, H - t / 2, zb + (D - zb) / 2], { edges: edges(cc), step: 3 }),
  ];
  if (conFondo) pieces.push(panel('fondo', 'Fondo', 'fondo', iw, hs - z, tb, 'XY', [W / 2, z + (hs - z) / 2, tb / 2], { slot: 'back', grain: false, step: 4 }));
  if (z > 0) pieces.push(panel('zocalo', 'Zócalo', 'zocalo', iw, z, t, 'XY', [W / 2, z / 2, D - 40 - t / 2], { edges: edges(cc), step: 6 }));
  const yIn = z + t;
  const innerH = H - t - yIn;
  const cw = (iw - (cols - 1) * t) / cols;
  for (let k = 0; k < cols; k++) {
    const x0 = t + k * (cw + t);
    const x1 = x0 + cw;
    if (k > 0) pieces.push(panel(`division-${k}`, 'División', 'division', innerH, D - zb, t, 'YZ', [x0 - t / 2, yIn + innerH / 2, zb + (D - zb) / 2], { edges: edges(cc), step: 3 }));
    const fx0 = k === 0 ? 0 : x0 - t / 2;
    const fx1 = k === cols - 1 ? W : x1 + t / 2;
    const lg = k === 0 ? g : g / 2;
    const rg = k === cols - 1 ? g : g / 2;
    const lateral = k === 0 || k === cols - 1;
    if (frente === 'gavetas') {
      pieces.push(...drawerColumn({ prefix: `c${k + 1}-`, x0, x1, fx0, fx1, yBase: yIn, fy0: z, fh: H - z, count: nDr, mode: String(p.distribucion), D, t, tb, bt, sc, g, cc, cf }));
      continue;
    }
    pieces.push(...shelvesBetween(`repisa-c${k + 1}`, ns, x0, x1, yIn, innerH, zb, D - zb - 20, t, cc, 5));
    let nd = 0;
    if (frente === 'puertas') nd = 1;
    if (frente === 'puertas2') nd = 2;
    if (frente === 'laterales' && lateral && cols > 1) nd = 1;
    pieces.push(...doorsIn(`puerta-c${k + 1}`, nd, fx0, fx1, lg, rg, z, H, D, t, g, cf, 8));
  }
  return { pieces, size: { w: W, h: H, d: D + (frente === 'ninguno' ? 0 : t) } };
}

// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Parámetros del mueble a medida con valores por defecto
// ==================================================
function customParams(d: { ancho: number; alto: number; prof: number; cols: number; repisas: number; frente: string; zocalo: number; tapa: boolean }): ParamDef[] {
  return [
    L('ancho', 'Ancho', d.ancho, 200, 4000), L('alto', 'Alto', d.alto, 150, 2700), L('profundidad', 'Profundidad', d.prof, 150, 900),
    THICK, BACK, ESPESOR_CAJA, L('zocalo', 'Altura de zócalo', d.zocalo, 0, 250, 'Construcción'),
    N('columnas', 'Columnas (divisiones verticales)', d.cols, 1, 8), N('repisas', 'Repisas por columna', d.repisas, 0, 12),
    S('frente', 'Frentes', d.frente, [
      ['ninguno', 'Abierto (sin puertas)'], ['puertas', '1 puerta por columna'], ['puertas2', '2 puertas por columna'],
      ['laterales', 'Puertas solo en columnas laterales'], ['gavetas', 'Gavetas en todas las columnas'],
    ]),
    N('gavetas', 'Gavetas por columna', 3, 1, 8), DISTRIBUCION,
    BOOL('conFondo', 'Con fondo', true), BOOL('tapaCompleta', 'Tapa encima de los laterales', d.tapa),
    DESC_CORREDERA, HOLGURA, CANTO_CASCO, CANTO_FRENTES,
  ];
}

// ==================================================
// 4BYTES - Equipo de desarrollo
// Plantilla: Mueble a medida (configurable por columnas)
// ==================================================
const customFurniture: Template = {
  id: 'custom-furniture',
  name: 'Mueble a medida',
  category: 'module',
  group: 'A medida',
  icon: 'LayoutGrid',
  description: 'Caja configurable: elige columnas, repisas y si lleva puertas, gavetas o queda abierto. Sirve para zapateros, aparadores, racks, etc.',
  materials: { carcass: 'mel-blanco', front: 'mel-roble', back: 'hdf-blanco' },
  params: customParams({ ancho: 1000, alto: 900, prof: 400, cols: 2, repisas: 2, frente: 'puertas', zocalo: 60, tapa: true }),
  generate: customGenerate,
};

// ==================================================
// 4BYTES - Equipo de desarrollo
// Plantilla: Mueble de TV / rack
// ==================================================
const tvUnit: Template = {
  id: 'tv-unit',
  name: 'Mueble de TV / rack',
  category: 'module',
  group: 'Oficina y sala',
  icon: 'Tv',
  description: 'Rack bajo con columnas, centro abierto y puertas laterales (o gavetas).',
  materials: { carcass: 'mel-grafito', front: 'mel-roble', back: 'hdf-blanco' },
  params: customParams({ ancho: 1800, alto: 500, prof: 400, cols: 3, repisas: 1, frente: 'laterales', zocalo: 80, tapa: true }),
  generate: customGenerate,
};

// ==================================================
// 4BYTES - Equipo de desarrollo
// Plantilla: Zapatero
// ==================================================
const shoeCabinet: Template = {
  id: 'shoe-cabinet',
  name: 'Zapatero',
  category: 'module',
  group: 'Dormitorio',
  icon: 'Footprints',
  description: 'Zapatero con repisas y puertas.',
  materials: { carcass: 'mel-blanco', front: 'mel-fresno', back: 'hdf-blanco' },
  params: customParams({ ancho: 800, alto: 1000, prof: 350, cols: 1, repisas: 4, frente: 'puertas2', zocalo: 60, tapa: true }),
  generate: customGenerate,
};

// ---------- 10. Bloques de referencia ----------
export const REF_MATERIAL: Record<string, string> = {
  refrigerador: 'acero-inox', cocina: 'acero-inox', lavadero: 'acero-inox', meson: 'granito', cama: 'madera-puerta',
  sofa: 'tela', ventana: 'vidrio', puerta: 'madera-puerta', generico: 'mdf-crudo',
};

// ==================================================
// 4BYTES - Equipo de desarrollo
// Plantilla: Bloque de referencia (electrodomésticos, camas, puertas)
// ==================================================
const reference: Template = {
  id: 'reference',
  name: 'Bloque de referencia',
  category: 'reference',
  group: 'Ambiente',
  icon: 'Box',
  description: 'Electrodomésticos, mesón, cama, ventana o puerta para dar contexto (no entra al despiece).',
  materials: { carcass: 'acero-inox', front: 'acero-inox', back: 'acero-inox' },
  params: [
    S('tipo', 'Tipo', 'refrigerador', [
      ['refrigerador', 'Refrigerador'], ['cocina', 'Cocina / horno'], ['lavadero', 'Lavadero'], ['meson', 'Mesón / encimera'],
      ['cama', 'Cama'], ['sofa', 'Sofá'], ['ventana', 'Ventana'], ['puerta', 'Puerta'], ['generico', 'Genérico'],
    ], 'Medidas'),
    L('ancho', 'Ancho', 700, 10, 6000), L('alto', 'Alto', 1800, 5, 3000), L('profundidad', 'Profundidad', 700, 5, 3000),
  ],
  generate(p) {
    const W = n(p, 'ancho'), H = n(p, 'alto'), D = n(p, 'profundidad');
    if (p.tipo === 'cama') {
      const bh = H * 0.55;
      const mh = H * 0.45;
      return {
        pieces: [
          panel('base-cama', 'Base de cama', 'referencia', W, D - 60, bh, 'XZ', [W / 2, bh / 2, 60 + (D - 60) / 2], { cutlist: false, grain: false }),
          panel('colchon', 'Colchón', 'referencia', W - 20, D - 80, mh, 'XZ', [W / 2, bh + mh / 2, 60 + (D - 60) / 2], { cutlist: false, grain: false, materialId: 'tela', slot: 'fixed', features: { cornerRadius: 40 } }),
          panel('cabecera', 'Cabecera', 'referencia', 1000, W, 60, 'YX', [W / 2, 500, 30], { cutlist: false }),
        ],
        size: { w: W, h: Math.max(H, 1000), d: D },
      };
    }
    return { pieces: [panel('bloque', 'Bloque', 'referencia', W, H, D, 'XY', [W / 2, H / 2, D / 2], { cutlist: false, grain: false })], size: { w: W, h: H, d: D } };
  },
};

// ==================================================
// 4BYTES - Equipo de desarrollo
// Sección: Lista de plantillas disponibles en el catálogo
// ==================================================
export const TEMPLATES: Template[] = [
  baseCabinet, wallCabinet, drawerUnit, closet, bed, chest, nightstand, shoeCabinet, desk, shelf, tvUnit, customFurniture, freePiece, wall, floor, reference,
];
export const TEMPLATE_MAP: Record<string, Template> = Object.fromEntries(TEMPLATES.map((t) => [t.id, t]));

// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Obtener los parámetros por defecto de una plantilla
// ==================================================
export function defaultParams(t: Template): Params {
  return Object.fromEntries(t.params.map((p) => [p.key, p.default]));
}
