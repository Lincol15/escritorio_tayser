import * as THREE from 'three';
import { getMaterial } from '../core/materials';
import { getTexture } from './textures';

export type MatState = 'normal' | 'selected' | 'step';
const cache = new Map<string, THREE.MeshStandardMaterial>();

export function getMeshMaterial(materialId: string, variant: 'panel' | 'cyl', state: MatState): THREE.MeshStandardMaterial {
  const key = `${materialId}|${variant}|${state}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const def = getMaterial(materialId);
  const tex = getTexture(def, variant);
  const transparent = def.opacity !== undefined;
  const m = new THREE.MeshStandardMaterial({
    color: tex ? '#ffffff' : def.color,
    map: tex,
    roughness: def.roughness,
    metalness: def.metalness,
    transparent,
    opacity: def.opacity ?? 1,
    depthWrite: !transparent,
    side: transparent ? THREE.DoubleSide : THREE.FrontSide,
  });
  if (state === 'selected') {
    m.emissive = new THREE.Color('#2563eb');
    m.emissiveIntensity = 0.45;
  } else if (state === 'step') {
    m.emissive = new THREE.Color('#f59e0b');
    m.emissiveIntensity = 0.4;
  }
  cache.set(key, m);
  return m;
}
