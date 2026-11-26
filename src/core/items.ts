/*
 * Proyecto:    Tayser 1.0.0
 * Archivo:     src/core/items.ts
 * Autores:     LWYC, RCO, GDMS, JDAP
 * Descripción: Motor paramétrico: convierte cada mueble en sus piezas.
 */
// Motor paramétrico: ítem de escena -> piezas resueltas (con overrides y materiales).
import type { WRGJParams, WRGJPieceOverride, WRGJResolvedPiece, WRGJSceneItem, WRGJSize3, WRGJVec3 } from './types';
import { WRGJ_TEMPLATE_MAP, wrgjDefaultParams, WRGJ_REF_MATERIAL } from './templates';
import { wrgjUid } from './ids';
import { WRGJ_DEG } from './units';

export interface WRGJBuiltItem {
  pieces: WRGJResolvedPiece[];
  size: WRGJSize3;
  maxStep: number;
}

const wrgjCache = new WeakMap<WRGJSceneItem, WRGJBuiltItem>();

export function wrgjItemParams(item: WRGJSceneItem): WRGJParams {
  const t = WRGJ_TEMPLATE_MAP[item.templateId];
  return t ? { ...wrgjDefaultParams(t), ...item.params } : item.params;
}

export function wrgjBuildItem(item: WRGJSceneItem): WRGJBuiltItem {
  const hit = wrgjCache.get(item);
  if (hit) return hit;
  const t = WRGJ_TEMPLATE_MAP[item.templateId];
  if (!t) {
    const empty = { pieces: [], size: { w: 0, h: 0, d: 0 }, maxStep: 0 };
    wrgjCache.set(item, empty);
    return empty;
  }
  const { pieces, size } = t.generate(wrgjItemParams(item));
  let maxStep = 0;
  const resolved: WRGJResolvedPiece[] = pieces.map((p) => {
    const ov: WRGJPieceOverride | undefined = item.overrides[p.key];
    const features = ov?.features ? { ...p.features, ...ov.features } : p.features;
    const edges = ov?.edges ? { ...p.edges, ...ov.edges } : p.edges;
    const slotMat = p.materialSlot === 'front' ? item.frontMaterialId : p.materialSlot === 'back' ? item.backMaterialId : item.materialId;
    const materialId = ov?.materialId ?? p.materialId ?? slotMat;
    const step = ov?.step ?? p.step;
    maxStep = Math.max(maxStep, step);
    return { ...p, features, edges, grain: ov?.grain ?? p.grain, materialId, step, itemId: item.id };
  });
  const built = { pieces: resolved, size, maxStep };
  wrgjCache.set(item, built);
  return built;
}

export interface WRGJCreateOpts {
  params?: WRGJParams;
  position?: WRGJVec3;
  rotationY?: number;
  name?: string;
  materialId?: string;
  frontMaterialId?: string;
  backMaterialId?: string;
  hidden?: boolean;
  overrides?: Record<string, WRGJPieceOverride>;
}

export function wrgjCreateItem(templateId: string, o: WRGJCreateOpts = {}): WRGJSceneItem {
  const t = WRGJ_TEMPLATE_MAP[templateId];
  if (!t) throw new Error(`Plantilla desconocida: ${templateId}`);
  const params = { ...wrgjDefaultParams(t), ...(o.params ?? {}) };
  let materialId = o.materialId ?? t.materials.carcass;
  if (templateId === 'reference' && !o.materialId) materialId = WRGJ_REF_MATERIAL[String(params.tipo)] ?? materialId;
  return {
    id: wrgjUid('it'),
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
export function wrgjItemAABB(item: WRGJSceneItem) {
  const { size } = wrgjBuildItem(item);
  const r = item.rotationY * WRGJ_DEG;
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
export function wrgjItemAxes(rotDeg: number) {
  const r = rotDeg * WRGJ_DEG;
  return { u: [Math.cos(r), -Math.sin(r)] as [number, number], n: [Math.sin(r), Math.cos(r)] as [number, number] };
}
