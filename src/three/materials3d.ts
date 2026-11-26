/*
 * Proyecto:    Tayser 1.0.0
 * Archivo:     src/three/materials3d.ts
 * Autores:     LWYC, RCO, GDMS, JDAP
 * Descripción: Materiales de Three.js a partir del catálogo.
 */
import * as THREE from 'three';
import { wrgjGetMaterial } from '../core/materials';
import { wrgjGetTexture } from './textures';

export type WRGJMatState = 'normal' | 'selected' | 'step';
const wrgjMatCache = new Map<string, THREE.MeshStandardMaterial>();

export function wrgjGetMeshMaterial(materialId: string, variant: 'panel' | 'cyl', state: WRGJMatState): THREE.MeshStandardMaterial {
  const key = `${materialId}|${variant}|${state}`;
  const hit = wrgjMatCache.get(key);
  if (hit) return hit;
  const def = wrgjGetMaterial(materialId);
  const tex = wrgjGetTexture(def, variant);
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
  wrgjMatCache.set(key, m);
  return m;
}
