/*
 * Proyecto:    Tayser 1.0.0
 * Archivo:     src/core/homography.ts
 * Autores:     LWYC, RCO, GDMS, JDAP
 * Descripción: Homografía entre la foto y las medidas reales de la pared.
 */
// Homografía 2D (DLT de 4 puntos) para pasar de la foto (px) al plano real de la pared (mm) y viceversa.
export interface WRGJPt {
  x: number;
  y: number;
}

export type WRGJH3 = number[]; // 3x3 por filas, h[8] = 1

function wrgjSolve(A: number[][], b: number[]): number[] | null {
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

/** Calcula H tal que dst ≈ H · src */
export function wrgjComputeHomography(src: WRGJPt[], dst: WRGJPt[]): WRGJH3 | null {
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
  const h = wrgjSolve(A, b);
  return h ? [...h, 1] : null;
}

export function wrgjApplyH(H: WRGJH3, p: WRGJPt): WRGJPt {
  const w = H[6] * p.x + H[7] * p.y + H[8];
  return { x: (H[0] * p.x + H[1] * p.y + H[2]) / w, y: (H[3] * p.x + H[4] * p.y + H[5]) / w };
}
