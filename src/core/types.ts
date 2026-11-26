/*
 * Proyecto:    Tayser 1.0.0
 * Archivo:     src/core/types.ts
 * Autores:     LWYC, RCO, GDMS, JDAP
 * Descripción: Modelos de datos. Todas las medidas internas están en milímetros.
 */
// Modelos de dominio Tayser
// Todas las medidas internas están en MILÍMETROS (precisión decimal).

export type WRGJUnit = 'mm' | 'cm' | 'in';
export type WRGJAppMode = 'build' | 'cutlist' | 'optimize' | 'calc' | 'client' | 'room';
export type WRGJVec3 = [number, number, number];

/** Plano de la pieza: 1ª letra = eje del LARGO (veta), 2ª letra = eje del ANCHO. El espesor va en el eje restante. */
export type WRGJPlane = 'XY' | 'YX' | 'XZ' | 'ZX' | 'YZ' | 'ZY';

/** l1/l2 = cantos a lo largo del LARGO (l1 = lado +ancho, normalmente el frente). w1/w2 = cantos del ANCHO (w1 = extremo +largo). */
export type WRGJEdgeKey = 'l1' | 'l2' | 'w1' | 'w2';
export type WRGJCorner = 'bl' | 'br' | 'tr' | 'tl';
export type WRGJMaterialSlot = 'carcass' | 'front' | 'back' | 'fixed';

export type WRGJPieceRole =
  | 'lateral' | 'base' | 'techo' | 'fondo' | 'repisa' | 'division' | 'puerta' | 'frente'
  | 'zocalo' | 'travesano' | 'cajon' | 'tapa' | 'faldon' | 'pata' | 'barra'
  | 'pared' | 'piso' | 'referencia' | 'pieza';

export interface WRGJHole {
  id: string;
  shape: 'rect' | 'circle';
  /** centro del calado medido desde la esquina inferior izquierda de la pieza (x sobre el largo, y sobre el ancho) */
  x: number;
  y: number;
  w: number;
  h: number;
  /** radio (círculo) o radio de esquinas (rectángulo) */
  r: number;
}

export interface WRGJTenon {
  id: string;
  edge: WRGJEdgeKey;
  /** saliente de la espiga */
  length: number;
  /** ancho de la espiga a lo largo del canto */
  size: number;
  /** grosor de la espiga */
  thickness: number;
}

export interface WRGJBevel {
  edge: WRGJEdgeKey;
  /** ángulo del bisel en grados (0-60) */
  angle: number;
}

export interface WRGJDiagonalCut {
  corner: WRGJCorner;
  cutL: number;
  cutW: number;
}

export interface WRGJPieceFeatures {
  cornerRadius: number;
  radiusCorners: WRGJCorner[];
  diagonals: WRGJDiagonalCut[];
  holes: WRGJHole[];
  bevels: WRGJBevel[];
  tenons: WRGJTenon[];
}

export type WRGJEdgeBanding = Record<WRGJEdgeKey, number>;

export interface WRGJPiece {
  key: string;
  name: string;
  role: WRGJPieceRole;
  kind: 'panel' | 'cylinder';
  /** largo (sentido de la veta); en cilindros, la altura */
  length: number;
  width: number;
  thickness: number;
  radiusTop?: number;
  radiusBottom?: number;
  plane: WRGJPlane;
  /** centro de la pieza en coordenadas locales del módulo (x: 0..ancho, y: 0..alto, z: 0..prof, +z = frente) */
  position: WRGJVec3;
  /** rotación extra en grados */
  rotation?: WRGJVec3;
  materialSlot: WRGJMaterialSlot;
  materialId?: string;
  grain: boolean;
  edges: WRGJEdgeBanding;
  features: WRGJPieceFeatures;
  step: number;
  cutlist: boolean;
}

export interface WRGJResolvedPiece extends WRGJPiece {
  materialId: string;
  itemId: string;
}

export type WRGJParamValue = number | string | boolean;
export type WRGJParams = Record<string, WRGJParamValue>;

export interface WRGJParamDef {
  key: string;
  label: string;
  type: 'length' | 'number' | 'select' | 'boolean' | 'angle';
  default: WRGJParamValue;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
  group?: string;
  hint?: string;
}

export type WRGJItemCategory = 'module' | 'wall' | 'reference' | 'floor' | 'piece';

export interface WRGJSize3 {
  w: number;
  h: number;
  d: number;
}

export interface WRGJGenerateResult {
  pieces: WRGJPiece[];
  size: WRGJSize3;
}

export interface WRGJTemplate {
  id: string;
  name: string;
  category: WRGJItemCategory;
  group: string;
  description: string;
  icon: string;
  params: WRGJParamDef[];
  materials: { carcass: string; front: string; back: string };
  defaultY?: number;
  generate: (p: WRGJParams) => WRGJGenerateResult;
}

export interface WRGJPieceOverride {
  edges?: Partial<WRGJEdgeBanding>;
  grain?: boolean;
  materialId?: string;
  features?: Partial<WRGJPieceFeatures>;
  step?: number;
}

export interface WRGJSceneItem {
  id: string;
  templateId: string;
  name: string;
  category: WRGJItemCategory;
  params: WRGJParams;
  /** centro de la huella (x, z) y nivel inferior (y), en mm */
  position: WRGJVec3;
  rotationY: number;
  hidden: boolean;
  hiddenPieces: string[];
  materialId: string;
  frontMaterialId: string;
  backMaterialId: string;
  overrides: Record<string, WRGJPieceOverride>;
}

export type WRGJPackAlgorithm = 'auto' | 'maxrects' | 'guillotine';

export interface WRGJSheetConfig {
  length: number;
  width: number;
  kerf: number;
  trim: number;
  algorithm: WRGJPackAlgorithm;
}

export interface WRGJProjectSettings {
  discountEdges: boolean;
  edgeWastePct: number;
}

export interface WRGJProject {
  format: 'tayser';
  version: 1;
  id: string;
  name: string;
  client: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  items: WRGJSceneItem[];
  sheet: WRGJSheetConfig;
  settings: WRGJProjectSettings;
}
