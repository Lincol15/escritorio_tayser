/*
 * Proyecto:    Tayser 1.0.0
 * Archivo:     src/core/materials.ts
 * Autores:     LWYC, RCO, GDMS, JDAP
 * Descripción: Catálogo de materiales, tableros y tapacantos.
 */
export type WRGJTextureKind = 'solid' | 'wood' | 'pine' | 'concrete' | 'brick' | 'metal' | 'glass' | 'granite' | 'tiles' | 'paint';
export type WRGJMaterialKind = 'board' | 'solid-wood' | 'hardware' | 'wall' | 'reference';

export interface WRGJMaterial {
  id: string;
  name: string;
  kind: WRGJMaterialKind;
  texture: WRGJTextureKind;
  color: string;
  color2?: string;
  roughness: number;
  metalness: number;
  opacity?: number;
  /** entra en el optimizador de tableros */
  optimize: boolean;
}

const wrgjMat = (
  id: string,
  name: string,
  kind: WRGJMaterialKind,
  texture: WRGJTextureKind,
  color: string,
  extra: Partial<WRGJMaterial> = {},
): WRGJMaterial => ({
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

export const WRGJ_MATERIALS: WRGJMaterial[] = [
  wrgjMat('mel-blanco', 'Melamina Blanco', 'board', 'solid', '#f1f1ee', { roughness: 0.5 }),
  wrgjMat('mel-gris', 'Melamina Gris Humo', 'board', 'solid', '#8b8f94', { roughness: 0.5 }),
  wrgjMat('mel-grafito', 'Melamina Grafito', 'board', 'solid', '#36383d', { roughness: 0.5 }),
  wrgjMat('mel-roble', 'Melamina Roble Natural', 'board', 'wood', '#c8a27a', { color2: '#9a744d' }),
  wrgjMat('mel-fresno', 'Melamina Fresno Claro', 'board', 'wood', '#dccbb1', { color2: '#b59d7e' }),
  wrgjMat('mel-nogal', 'Melamina Nogal', 'board', 'wood', '#6e4b34', { color2: '#3f2a1c' }),
  wrgjMat('mel-cedro', 'Melamina Cedro', 'board', 'wood', '#a3593a', { color2: '#6f3822' }),
  wrgjMat('hdf-blanco', 'HDF Blanco (fondos)', 'board', 'solid', '#ecebe7'),
  wrgjMat('mdf-crudo', 'MDF Crudo', 'board', 'solid', '#b9976b', { roughness: 0.8 }),
  wrgjMat('pino', 'Pino', 'solid-wood', 'pine', '#e6c48f', { color2: '#c48f52', roughness: 0.7 }),
  wrgjMat('madera-tornillo', 'Madera Tornillo (maciza)', 'solid-wood', 'wood', '#b07a4f', { color2: '#7d5132', roughness: 0.7 }),
  wrgjMat('metal-cromo', 'Metal cromado', 'hardware', 'metal', '#c9ccd1', { roughness: 0.25, metalness: 0.9 }),
  wrgjMat('concreto', 'Concreto', 'wall', 'concrete', '#9a9a96', { roughness: 0.95 }),
  wrgjMat('pared-blanca', 'Pared pintada blanca', 'wall', 'paint', '#e9e6df', { roughness: 0.9 }),
  wrgjMat('pared-arena', 'Pared color arena', 'wall', 'paint', '#d8c7a8', { roughness: 0.9 }),
  wrgjMat('ladrillo', 'Ladrillo caravista', 'wall', 'brick', '#a4553a', { color2: '#d9d2c5', roughness: 0.95 }),
  wrgjMat('piso-ceramico', 'Piso cerámico', 'wall', 'tiles', '#cfc8bd', { color2: '#9d968b', roughness: 0.4 }),
  wrgjMat('piso-madera', 'Piso laminado', 'wall', 'wood', '#a07a55', { color2: '#6d4f35', roughness: 0.55 }),
  wrgjMat('acero-inox', 'Acero inoxidable', 'reference', 'metal', '#c4c8ce', { roughness: 0.4, metalness: 0.45 }),
  wrgjMat('granito', 'Granito negro', 'reference', 'granite', '#2a2a2c', { color2: '#8a8a8a', roughness: 0.3 }),
  wrgjMat('vidrio', 'Vidrio', 'reference', 'glass', '#9fd3f0', { opacity: 0.35, roughness: 0.05 }),
  wrgjMat('tela', 'Tela / colchón', 'reference', 'solid', '#d7dbe3', { roughness: 0.95 }),
  wrgjMat('madera-puerta', 'Puerta de madera', 'reference', 'wood', '#8a5a3b', { color2: '#5e3b25' }),
];

export const WRGJ_MATERIAL_MAP: Record<string, WRGJMaterial> = Object.fromEntries(WRGJ_MATERIALS.map((x) => [x.id, x]));

export function wrgjGetMaterial(id: string | undefined): WRGJMaterial {
  return (id && WRGJ_MATERIAL_MAP[id]) || WRGJ_MATERIALS[0];
}

export const WRGJ_BOARD_MATERIALS = WRGJ_MATERIALS.filter((x) => x.kind === 'board' || x.kind === 'solid-wood');
export const WRGJ_WALL_MATERIALS = WRGJ_MATERIALS.filter((x) => x.kind === 'wall');
export const WRGJ_REFERENCE_MATERIALS = WRGJ_MATERIALS.filter((x) => x.kind !== 'board');
export const WRGJ_EDGE_OPTIONS = [0, 0.45, 1, 2, 3];
