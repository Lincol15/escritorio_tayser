/*
 * Proyecto:    Tayser 1.0.0
 * Archivo:     src/three/geometry.ts
 * Autores:     LWYC, RCO, GDMS, JDAP
 * Descripción: Geometría de las piezas con cortes especiales.
 */
// Geometría de piezas: contorno con radios y diagonales, calados, biseles por canto, espigas y cilindros/conos.
// Marco de la pieza: x = largo (u), y = ancho (v), z = espesor, centrado en el origen.
import * as THREE from 'three';
import type { WRGJCorner, WRGJPiece, WRGJPlane } from '../core/types';
import { WRGJ_DEG } from '../core/units';

const wrgjGeoCache = new Map<string, THREE.BufferGeometry>();

export function wrgjGeometryKey(p: WRGJPiece): string {
  const f = p.features;
  return JSON.stringify([p.kind, p.length, p.width, p.thickness, p.radiusTop, p.radiusBottom, f.cornerRadius, f.radiusCorners, f.diagonals, f.holes, f.bevels]);
}

function wrgjOutline(L: number, W: number, p: WRGJPiece): THREE.Shape {
  const f = p.features;
  const hx = L / 2;
  const hy = W / 2;
  const pts: { c: WRGJCorner; x: number; y: number }[] = [
    { c: 'bl', x: -hx, y: -hy },
    { c: 'br', x: hx, y: -hy },
    { c: 'tr', x: hx, y: hy },
    { c: 'tl', x: -hx, y: hy },
  ];
  const shape = new THREE.Shape();
  pts.forEach((pt, i) => {
    const prev = pts[(i + 3) % 4];
    const next = pts[(i + 1) % 4];
    const inX = Math.sign(pt.x - prev.x);
    const inY = Math.sign(pt.y - prev.y);
    const outX = Math.sign(next.x - pt.x);
    const outY = Math.sign(next.y - pt.y);
    const diag = f.diagonals.find((d) => d.corner === pt.c);
    const r = f.radiusCorners.includes(pt.c) ? Math.min(f.cornerRadius, hx * 0.98, hy * 0.98) : 0;
    const go = (x: number, y: number) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y));
    if (diag && diag.cutL > 0 && diag.cutW > 0) {
      const dIn = inX !== 0 ? Math.min(diag.cutL, L * 0.95) : Math.min(diag.cutW, W * 0.95);
      const dOut = outX !== 0 ? Math.min(diag.cutL, L * 0.95) : Math.min(diag.cutW, W * 0.95);
      go(pt.x - inX * dIn, pt.y - inY * dIn);
      shape.lineTo(pt.x + outX * dOut, pt.y + outY * dOut);
    } else if (r > 0.05) {
      const ax = pt.x - inX * r;
      const ay = pt.y - inY * r;
      const cx = ax + outX * r;
      const cy = ay + outY * r;
      const bx = pt.x + outX * r;
      const by = pt.y + outY * r;
      go(ax, ay);
      shape.absarc(cx, cy, r, Math.atan2(ay - cy, ax - cx), Math.atan2(by - cy, bx - cx), false);
    } else {
      go(pt.x, pt.y);
    }
  });
  shape.closePath();

  for (const h of f.holes) {
    const cx = h.x - hx;
    const cy = h.y - hy;
    const path = new THREE.Path();
    if (h.shape === 'circle') {
      const rr = Math.max(0.5, h.r);
      if (Math.abs(cx) + rr >= hx || Math.abs(cy) + rr >= hy) continue;
      path.absarc(cx, cy, rr, 0, Math.PI * 2, true);
    } else {
      const w2 = h.w / 2;
      const h2 = h.h / 2;
      if (Math.abs(cx) + w2 >= hx || Math.abs(cy) + h2 >= hy) continue;
      const rr = Math.min(Math.max(0, h.r), w2 * 0.99, h2 * 0.99);
      if (rr > 0.05) {
        path.moveTo(cx - w2 + rr, cy - h2);
        path.lineTo(cx + w2 - rr, cy - h2);
        path.absarc(cx + w2 - rr, cy - h2 + rr, rr, -Math.PI / 2, 0, false);
        path.lineTo(cx + w2, cy + h2 - rr);
        path.absarc(cx + w2 - rr, cy + h2 - rr, rr, 0, Math.PI / 2, false);
        path.lineTo(cx - w2 + rr, cy + h2);
        path.absarc(cx - w2 + rr, cy + h2 - rr, rr, Math.PI / 2, Math.PI, false);
        path.lineTo(cx - w2, cy - h2 + rr);
        path.absarc(cx - w2 + rr, cy - h2 + rr, rr, Math.PI, Math.PI * 1.5, false);
      } else {
        path.moveTo(cx - w2, cy - h2);
        path.lineTo(cx + w2, cy - h2);
        path.lineTo(cx + w2, cy + h2);
        path.lineTo(cx - w2, cy + h2);
      }
      path.closePath();
    }
    shape.holes.push(path);
  }
  return shape;
}

export function wrgjPanelGeometry(p: WRGJPiece): THREE.BufferGeometry {
  const key = wrgjGeometryKey(p);
  const hit = wrgjGeoCache.get(key);
  if (hit) return hit;
  const L = p.length;
  const W = p.width;
  const T = p.thickness;
  const geo = new THREE.ExtrudeGeometry(wrgjOutline(L, W, p), { depth: T, bevelEnabled: false, curveSegments: 14 });
  geo.translate(0, 0, -T / 2);
  // Biseles / cortes a grados: se desplazan los vértices de la cara superior del canto indicado.
  if (p.features.bevels.length) {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const hx = L / 2;
    const hy = W / 2;
    for (const b of p.features.bevels) {
      const ang = Math.min(Math.max(b.angle, 0), 75) * WRGJ_DEG;
      const lim = b.edge === 'l1' || b.edge === 'l2' ? W * 0.9 : L * 0.9;
      const off = Math.min(T * Math.tan(ang), lim);
      for (let i = 0; i < pos.count; i++) {
        if (pos.getZ(i) < T / 2 - 0.01) continue;
        const x = pos.getX(i);
        const y = pos.getY(i);
        if (b.edge === 'l1' && y > hy - 0.5) pos.setY(i, y - off);
        else if (b.edge === 'l2' && y < -hy + 0.5) pos.setY(i, y + off);
        else if (b.edge === 'w1' && x > hx - 0.5) pos.setX(i, x - off);
        else if (b.edge === 'w2' && x < -hx + 0.5) pos.setX(i, x + off);
      }
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  }
  geo.computeBoundingSphere();
  wrgjGeoCache.set(key, geo);
  return geo;
}

export function wrgjCylinderGeometry(p: WRGJPiece): THREE.BufferGeometry {
  const key = wrgjGeometryKey(p);
  const hit = wrgjGeoCache.get(key);
  if (hit) return hit;
  const geo = new THREE.CylinderGeometry(p.radiusTop ?? 10, p.radiusBottom ?? 10, p.length, 40, 1);
  wrgjGeoCache.set(key, geo);
  return geo;
}

const WRGJ_AX: Record<string, THREE.Vector3> = { X: new THREE.Vector3(1, 0, 0), Y: new THREE.Vector3(0, 1, 0), Z: new THREE.Vector3(0, 0, 1) };
const wrgjQuatCache = new Map<WRGJPlane, THREE.Quaternion>();

export function wrgjPlaneQuaternion(plane: WRGJPlane): THREE.Quaternion {
  const hit = wrgjQuatCache.get(plane);
  if (hit) return hit;
  const u = WRGJ_AX[plane[0]];
  const v = WRGJ_AX[plane[1]];
  const t = new THREE.Vector3().crossVectors(u, v);
  const m = new THREE.Matrix4().makeBasis(u, v, t);
  const q = new THREE.Quaternion().setFromRotationMatrix(m);
  wrgjQuatCache.set(plane, q);
  return q;
}

/** Posición y tamaño de una espiga en el marco de la pieza */
export function wrgjTenonBox(p: WRGJPiece, t: WRGJPiece['features']['tenons'][number]) {
  const hx = p.length / 2;
  const hy = p.width / 2;
  const th = Math.min(t.thickness, p.thickness);
  switch (t.edge) {
    case 'w1':
      return { pos: [hx + t.length / 2, 0, 0] as [number, number, number], size: [t.length, t.size, th] as [number, number, number] };
    case 'w2':
      return { pos: [-hx - t.length / 2, 0, 0] as [number, number, number], size: [t.length, t.size, th] as [number, number, number] };
    case 'l1':
      return { pos: [0, hy + t.length / 2, 0] as [number, number, number], size: [t.size, t.length, th] as [number, number, number] };
    case 'l2':
      return { pos: [0, -hy - t.length / 2, 0] as [number, number, number], size: [t.size, t.length, th] as [number, number, number] };
  }
}
