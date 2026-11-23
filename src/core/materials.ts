/*
 * ==================================================
 * Proyecto desarrollado por: 4BYTES
 * Equipo de desarrollo de software
 * Proyecto: Tayser - Diseño paramétrico 3D y optimización de cortes
 * Archivo: src/core/materials.ts
 * Descripción: Catálogo de materiales y tapacantos.
 * ==================================================
 */
export type TextureKind = 'solid' | 'wood' | 'pine' | 'concrete' | 'brick' | 'metal' | 'glass' | 'granite' | 'tiles' | 'paint';
export type MaterialKind = 'board' | 'solid-wood' | 'hardware' | 'wall' | 'reference';

export interface Material {
  id: string;
  name: string;
  kind: MaterialKind;
  texture: TextureKind;
  color: string;
  color2?: string;
  roughness: number;
  metalness: number;
  opacity?: number;
  /** entra en el optimizador de tableros */
  optimize: boolean;
}

// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Construir la definición de un material del catálogo
// ==================================================
const m = (
  id: string,
  name: string,
  kind: MaterialKind,
  texture: TextureKind,
  color: string,
  extra: Partial<Material> = {},
): Material => ({
  id,
  name,
  kind,
  texture,
  color,
  roughness: 0.6,
  metalness: 0,
  optimize: kind === 'board' || kind === 'solid-wood',
  ...extra,
});

// ==================================================
// 4BYTES - Equipo de desarrollo
// Sección: Catálogo de materiales: tableros, maderas, paredes y referencias
// ==================================================
export const MATERIALS: Material[] = [
  m('mel-blanco', 'Melamina Blanco', 'board', 'solid', '#f1f1ee', { roughness: 0.5 }),
  m('mel-gris', 'Melamina Gris Humo', 'board', 'solid', '#8b8f94', { roughness: 0.5 }),
  m('mel-grafito', 'Melamina Grafito', 'board', 'solid', '#36383d', { roughness: 0.5 }),
  m('mel-roble', 'Melamina Roble Natural', 'board', 'wood', '#c8a27a', { color2: '#9a744d' }),
  m('mel-fresno', 'Melamina Fresno Claro', 'board', 'wood', '#dccbb1', { color2: '#b59d7e' }),
  m('mel-nogal', 'Melamina Nogal', 'board', 'wood', '#6e4b34', { color2: '#3f2a1c' }),
  m('mel-cedro', 'Melamina Cedro', 'board', 'wood', '#a3593a', { color2: '#6f3822' }),
  m('hdf-blanco', 'HDF Blanco (fondos)', 'board', 'solid', '#ecebe7'),
  m('mdf-crudo', 'MDF Crudo', 'board', 'solid', '#b9976b', { roughness: 0.8 }),
  m('pino', 'Pino', 'solid-wood', 'pine', '#e6c48f', { color2: '#c48f52', roughness: 0.7 }),
  m('madera-tornillo', 'Madera Tornillo (maciza)', 'solid-wood', 'wood', '#b07a4f', { color2: '#7d5132', roughness: 0.7 }),
  m('metal-cromo', 'Metal cromado', 'hardware', 'metal', '#c9ccd1', { roughness: 0.25, metalness: 0.9 }),
  m('concreto', 'Concreto', 'wall', 'concrete', '#9a9a96', { roughness: 0.95 }),
  m('pared-blanca', 'Pared pintada blanca', 'wall', 'paint', '#e9e6df', { roughness: 0.9 }),
  m('pared-arena', 'Pared color arena', 'wall', 'paint', '#d8c7a8', { roughness: 0.9 }),
  m('ladrillo', 'Ladrillo caravista', 'wall', 'brick', '#a4553a', { color2: '#d9d2c5', roughness: 0.95 }),
  m('piso-ceramico', 'Piso cerámico', 'wall', 'tiles', '#cfc8bd', { color2: '#9d968b', roughness: 0.4 }),
  m('piso-madera', 'Piso laminado', 'wall', 'wood', '#a07a55', { color2: '#6d4f35', roughness: 0.55 }),
  m('acero-inox', 'Acero inoxidable', 'reference', 'metal', '#c4c8ce', { roughness: 0.4, metalness: 0.45 }),
  m('granito', 'Granito negro', 'reference', 'granite', '#2a2a2c', { color2: '#8a8a8a', roughness: 0.3 }),
  m('vidrio', 'Vidrio', 'reference', 'glass', '#9fd3f0', { opacity: 0.35, roughness: 0.05 }),
  m('tela', 'Tela / colchón', 'reference', 'solid', '#d7dbe3', { roughness: 0.95 }),
  m('madera-puerta', 'Puerta de madera', 'reference', 'wood', '#8a5a3b', { color2: '#5e3b25' }),
];

export const MATERIAL_MAP: Record<string, Material> = Object.fromEntries(MATERIALS.map((x) => [x.id, x]));

// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Obtener un material por su identificador
// ==================================================
export function getMaterial(id: string | undefined): Material {
  return (id && MATERIAL_MAP[id]) || MATERIALS[0];
}

export const BOARD_MATERIALS = MATERIALS.filter((x) => x.kind === 'board' || x.kind === 'solid-wood');
export const WALL_MATERIALS = MATERIALS.filter((x) => x.kind === 'wall');
export const REFERENCE_MATERIALS = MATERIALS.filter((x) => x.kind !== 'board');
export const EDGE_OPTIONS = [0, 0.45, 1, 2, 3];
