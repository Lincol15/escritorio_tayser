/*
 * Proyecto:    Tayser 1.0.0
 * Archivo:     src/core/items.ts
 * Autores:     LWYC, RCO, GDMS, JDAP
 * Descripción: Motor paramétrico: convierte cada mueble en sus piezas.
 */
// Motor paramétrico: ítem de escena -> piezas resueltas (con overrides y materiales).
import type { Params, PieceOverride, ResolvedPiece, SceneItem, Size3, Vec3 } from './types';
import { TEMPLATE_MAP, defaultParams, REF_MATERIAL } from './templates';
import { uid } from './ids';
import { DEG } from './units';

export interface BuiltItem {
  pieces: ResolvedPiece[];
  size: Size3;
  maxStep: number;
}

const cache = new WeakMap<SceneItem, BuiltItem>();

export function itemParams(item: SceneItem): Params {
  const t = TEMPLATE_MAP[item.templateId];
  return t ? { ...defaultParams(t), ...item.params } : item.params;
}

export function buildItem(item: SceneItem): BuiltItem {
  const hit = cache.get(item);
  if (hit) return hit;
  const t = TEMPLATE_MAP[item.templateId];
  if (!t) {
    const empty = { pieces: [], size: { w: 0, h: 0, d: 0 }, maxStep: 0 };
    cache.set(item, empty);
    return empty;
  }
  const { pieces, size } = t.generate(itemParams(item));
  let maxStep = 0;
  const resolved: ResolvedPiece[] = pieces.map((p) => {
    const ov: PieceOverride | undefined = item.overrides[p.key];
    const features = ov?.features ? { ...p.features, ...ov.features } : p.features;
    const edges = ov?.edges ? { ...p.edges, ...ov.edges } : p.edges;
    const slotMat = p.materialSlot === 'front' ? item.frontMaterialId : p.materialSlot === 'back' ? item.backMaterialId : item.materialId;
    const materialId = ov?.materialId ?? p.materialId ?? slotMat;
    const step = ov?.step ?? p.step;
    maxStep = Math.max(maxStep, step);
    return { ...p, features, edges, grain: ov?.grain ?? p.grain, materialId, step, itemId: item.id };
  });
  const built = { pieces: resolved, size, maxStep };
  cache.set(item, built);
  return built;
}

export interface CreateOpts {
  params?: Params;
  position?: Vec3;
  rotationY?: number;
  name?: string;
  materialId?: string;
  frontMaterialId?: string;
  backMaterialId?: string;
  hidden?: boolean;
  overrides?: Record<string, PieceOverride>;
}

export function createItem(templateId: string, o: CreateOpts = {}): SceneItem {
  const t = TEMPLATE_MAP[templateId];
  if (!t) throw new Error(`Plantilla desconocida: ${templateId}`);
  const params = { ...defaultParams(t), ...(o.params ?? {}) };
  let materialId = o.materialId ?? t.materials.carcass;
  if (templateId === 'reference' && !o.materialId) materialId = REF_MATERIAL[String(params.tipo)] ?? materialId;
  return {
    id: uid('it'),
    templateId,
    name: o.name ?? t.name,
    category: t.category,
    params,
    position: o.position ?? [0, t.defaultY ?? 0, 0],
    rotationY: o.rotationY ?? 0,
    hidden: o.hidden ?? false,
    hiddenPieces: [],
    materialId,
    frontMaterialId: o.frontMaterialId ?? t.materials.front,
    backMaterialId: o.backMaterialId ?? t.materials.back,
    overrides: o.overrides ?? {},
  };
}

/** Caja envolvente (en planta y altura) del ítem en coordenadas de mundo (mm). */
export function itemAABB(item: SceneItem) {
  const { size } = buildItem(item);
  const r = item.rotationY * DEG;
  const c = Math.cos(r);
  const s = Math.sin(r);
  const xs: number[] = [];
  const zs: number[] = [];
  for (const [lx, lz] of [[-size.w / 2, -size.d / 2], [size.w / 2, -size.d / 2], [size.w / 2, size.d / 2], [-size.w / 2, size.d / 2]]) {
    xs.push(item.position[0] + lx * c + lz * s);
    zs.push(item.position[2] - lx * s + lz * c);
  }
  return {
    minX: Math.min(...xs), maxX: Math.max(...xs),
    minZ: Math.min(...zs), maxZ: Math.max(...zs),
    minY: item.position[1], maxY: item.position[1] + size.h,
  };
}

/** Vectores unitarios del ítem rotado: u = eje del ancho, n = normal frontal. */
export function itemAxes(rotDeg: number) {
  const r = rotDeg * DEG;
  return { u: [Math.cos(r), -Math.sin(r)] as [number, number], n: [Math.sin(r), Math.cos(r)] as [number, number] };
}
