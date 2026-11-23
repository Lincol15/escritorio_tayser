/*
 * ==================================================
 * Proyecto desarrollado por: 4BYTES
 * Equipo de desarrollo de software
 * Proyecto: Tayser - Diseño paramétrico 3D y optimización de cortes
 * Archivo: src/core/homography.ts
 * Descripción: Homografía entre la foto y el plano real de la pared.
 * ==================================================
 */
// Homografía 2D (DLT de 4 puntos) para pasar de la foto (px) al plano real de la pared (mm) y viceversa.
export interface Pt {
  x: number;
  y: number;
}

export type H3 = number[]; // 3x3 por filas, h[8] = 1

// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Resolver un sistema de ecuaciones lineales (eliminación de Gauss)
// ==================================================
function solve(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    if (Math.abs(M[piv][c]) < 1e-12) return null;
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Calcular la homografía a partir de 4 pares de puntos
// ==================================================
/**
 * Calcula H tal que dst ≈ H · src
 * @author 4BYTES - Equipo de desarrollo
 */
export function computeHomography(src: Pt[], dst: Pt[]): H3 | null {
  if (src.length !== 4 || dst.length !== 4) return null;
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i];
    const { x: u, y: v } = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  const h = solve(A, b);
  return h ? [...h, 1] : null;
}

// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Aplicar la homografía a un punto
// ==================================================
export function applyH(H: H3, p: Pt): Pt {
  const w = H[6] * p.x + H[7] * p.y + H[8];
  return { x: (H[0] * p.x + H[1] * p.y + H[2]) / w, y: (H[3] * p.x + H[4] * p.y + H[5]) / w };
}
