/*
 * Proyecto:    Tayser 1.0.0
 * Archivo:     src/core/types.ts
 * Autores:     LWYC, RCO, GDMS, JDAP
 * Descripción: Modelos de datos. Todas las medidas internas están en milímetros.
 */
// Modelos de dominio Tayser
// Todas las medidas internas están en MILÍMETROS (precisión decimal).

export type Unit = 'mm' | 'cm' | 'in';
export type AppMode = 'build' | 'cutlist' | 'optimize' | 'calc' | 'client' | 'room';
export type Vec3 = [number, number, number];

/** Plano de la pieza: 1ª letra = eje del LARGO (veta), 2ª letra = eje del ANCHO. El espesor va en el eje restante. */
export type Plane = 'XY' | 'YX' | 'XZ' | 'ZX' | 'YZ' | 'ZY';

/** l1/l2 = cantos a lo largo del LARGO (l1 = lado +ancho, normalmente el frente). w1/w2 = cantos del ANCHO (w1 = extremo +largo). */
export type EdgeKey = 'l1' | 'l2' | 'w1' | 'w2';
export type Corner = 'bl' | 'br' | 'tr' | 'tl';
export type MaterialSlot = 'carcass' | 'front' | 'back' | 'fixed';

export type PieceRole =
  | 'lateral' | 'base' | 'techo' | 'fondo' | 'repisa' | 'division' | 'puerta' | 'frente'
  | 'zocalo' | 'travesano' | 'cajon' | 'tapa' | 'faldon' | 'pata' | 'barra'
  | 'pared' | 'piso' | 'referencia' | 'pieza';

export interface Hole {
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

export interface Tenon {
  id: string;
  edge: EdgeKey;
  /** saliente de la espiga */
  length: number;
  /** ancho de la espiga a lo largo del canto */
  size: number;
  /** grosor de la espiga */
  thickness: number;
}

export interface Bevel {
  edge: EdgeKey;
  /** ángulo del bisel en grados (0-60) */
  angle: number;
}

export interface DiagonalCut {
  corner: Corner;
  cutL: number;
  cutW: number;
}

export interface PieceFeatures {
  cornerRadius: number;
  radiusCorners: Corner[];
  diagonals: DiagonalCut[];
  holes: Hole[];
  bevels: Bevel[];
  tenons: Tenon[];
}

export type EdgeBanding = Record<EdgeKey, number>;

export interface Piece {
  key: string;
  name: string;
  role: PieceRole;
  kind: 'panel' | 'cylinder';
  /** largo (sentido de la veta); en cilindros, la altura */
  length: number;
  width: number;
  thickness: number;
  radiusTop?: number;
  radiusBottom?: number;
  plane: Plane;
  /** centro de la pieza en coordenadas locales del módulo (x: 0..ancho, y: 0..alto, z: 0..prof, +z = frente) */
  position: Vec3;
  /** rotación extra en grados */
  rotation?: Vec3;
  materialSlot: MaterialSlot;
  materialId?: string;
  grain: boolean;
  edges: EdgeBanding;
  features: PieceFeatures;
  step: number;
  cutlist: boolean;
}

export interface ResolvedPiece extends Piece {
  materialId: string;
  itemId: string;
}

export type ParamValue = number | string | boolean;
export type Params = Record<string, ParamValue>;

export interface ParamDef {
  key: string;
  label: string;
  type: 'length' | 'number' | 'select' | 'boolean' | 'angle';
  default: ParamValue;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
  group?: string;
  hint?: string;
}

export type ItemCategory = 'module' | 'wall' | 'reference' | 'floor' | 'piece';

export interface Size3 {
  w: number;
  h: number;
  d: number;
}

export interface GenerateResult {
  pieces: Piece[];
  size: Size3;
}

export interface Template {
  id: string;
  name: string;
  category: ItemCategory;
  group: string;
  description: string;
  icon: string;
  params: ParamDef[];
  materials: { carcass: string; front: string; back: string };
  defaultY?: number;
  generate: (p: Params) => GenerateResult;
}

export interface PieceOverride {
  edges?: Partial<EdgeBanding>;
  grain?: boolean;
  materialId?: string;
  features?: Partial<PieceFeatures>;
  step?: number;
}

export interface SceneItem {
  id: string;
  templateId: string;
  name: string;
  category: ItemCategory;
  params: Params;
  /** centro de la huella (x, z) y nivel inferior (y), en mm */
  position: Vec3;
  rotationY: number;
  hidden: boolean;
  hiddenPieces: string[];
  materialId: string;
  frontMaterialId: string;
  backMaterialId: string;
  overrides: Record<string, PieceOverride>;
}

export type PackAlgorithm = 'auto' | 'maxrects' | 'guillotine';

export interface SheetConfig {
  length: number;
  width: number;
  kerf: number;
  trim: number;
  algorithm: PackAlgorithm;
}

export interface ProjectSettings {
  discountEdges: boolean;
  edgeWastePct: number;
}

export interface Project {
  format: 'tayser';
  version: 1;
  id: string;
  name: string;
  client: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  items: SceneItem[];
  sheet: SheetConfig;
  settings: ProjectSettings;
}
