/*
 * Proyecto:    Tayser 1.0.0
 * Archivo:     src/core/cutlist.ts
 * Autores:     LWYC, RCO, GDMS, JDAP
 * Descripción: Despiece agrupado por material, con tapacantos.
 */
// Despiece (lista de corte) con tapacantos
import type { WRGJCorner, WRGJEdgeBanding, WRGJEdgeKey, WRGJPiece, WRGJProject } from './types';
import { wrgjBuildItem } from './items';
import { wrgjGetMaterial } from './materials';
import { wrgjTrimNum } from './units';

export interface WRGJCutRow {
  code: string;
  name: string;
  modules: string[];
  materialId: string;
  materialName: string;
  thickness: number;
  length: number;
  width: number;
  cutLength: number;
  cutWidth: number;
  qty: number;
  edges: WRGJEdgeBanding;
  grain: boolean;
  notes: string;
  kind: 'panel' | 'turned' | 'hardware';
}

export interface WRGJMaterialGroup {
  key: string;
  letter: string;
  materialId: string;
  materialName: string;
  thickness: number;
  rows: WRGJCutRow[];
  totalQty: number;
  areaM2: number;
  optimize: boolean;
}

export interface WRGJEdgeTotal {
  thickness: number;
  meters: number;
  withWaste: number;
}

export interface WRGJCutList {
  groups: WRGJMaterialGroup[];
  turned: WRGJCutRow[];
  hardware: WRGJCutRow[];
  edgeTotals: WRGJEdgeTotal[];
  totalPieces: number;
}

export const WRGJ_CORNER_LABEL: Record<WRGJCorner, string> = { bl: 'inf-izq', br: 'inf-der', tr: 'sup-der', tl: 'sup-izq' };
export const WRGJ_EDGE_LABEL: Record<WRGJEdgeKey, string> = { l1: 'L1', l2: 'L2', w1: 'A1', w2: 'A2' };

export function wrgjFeatureNotes(p: WRGJPiece): string {
  const f = p.features;
  const out: string[] = [];
  if (f.cornerRadius > 0 && f.radiusCorners.length) {
    out.push(`Radio R${wrgjTrimNum(f.cornerRadius)} ${f.radiusCorners.length === 4 ? '(4 esquinas)' : '(' + f.radiusCorners.map((c) => WRGJ_CORNER_LABEL[c]).join(', ') + ')'}`);
  }
  f.diagonals.forEach((d) => out.push(`Diagonal ${wrgjTrimNum(d.cutL)}×${wrgjTrimNum(d.cutW)} esq. ${WRGJ_CORNER_LABEL[d.corner]}`));
  f.bevels.forEach((b) => out.push(`Bisel ${wrgjTrimNum(b.angle)}° en ${WRGJ_EDGE_LABEL[b.edge]}`));
  f.holes.forEach((h) =>
    out.push(h.shape === 'circle' ? `Calado Ø${wrgjTrimNum(h.r * 2)} c/(${wrgjTrimNum(h.x)},${wrgjTrimNum(h.y)})` : `Calado ${wrgjTrimNum(h.w)}×${wrgjTrimNum(h.h)} c/(${wrgjTrimNum(h.x)},${wrgjTrimNum(h.y)})`),
  );
  f.tenons.forEach((t) => out.push(`Espiga ${wrgjTrimNum(t.length)}×${wrgjTrimNum(t.size)}×${wrgjTrimNum(t.thickness)} en ${WRGJ_EDGE_LABEL[t.edge]}`));
  return out.join('; ');
}

function wrgjTenonExtra(p: WRGJPiece) {
  let l = 0;
  let w = 0;
  for (const t of p.features.tenons) {
    if (t.edge === 'w1' || t.edge === 'w2') l += t.length;
    else w += t.length;
  }
  return { l, w };
}

export function wrgjBuildCutList(project: WRGJProject): WRGJCutList {
  const panelMap = new Map<string, WRGJCutRow>();
  const turnedMap = new Map<string, WRGJCutRow>();
  const hwMap = new Map<string, WRGJCutRow>();
  const discount = project.settings.discountEdges;

  for (const item of project.items) {
    const built = wrgjBuildItem(item);
    for (const p of built.pieces) {
      if (!p.cutlist) continue;
      const mat = wrgjGetMaterial(p.materialId);
      const notes = wrgjFeatureNotes(p);
      if (p.kind === 'cylinder') {
        const isHw = mat.kind === 'hardware';
        const dia = 2 * Math.max(p.radiusTop ?? 0, p.radiusBottom ?? 0);
        const name = p.name;
        const conical = Math.abs((p.radiusTop ?? 0) - (p.radiusBottom ?? 0)) > 0.1;
        const note = isHw ? 'Accesorio metálico' : conical ? `Torneado cónico Ø${wrgjTrimNum(2 * (p.radiusTop ?? 0))} → Ø${wrgjTrimNum(2 * (p.radiusBottom ?? 0))}` : `Torneado Ø${wrgjTrimNum(dia)}`;
        const key = [mat.id, name, p.length.toFixed(1), dia.toFixed(1), note].join('|');
        const map = isHw ? hwMap : turnedMap;
        const row = map.get(key);
        if (row) {
          row.qty++;
          if (!row.modules.includes(item.name)) row.modules.push(item.name);
        } else {
          map.set(key, {
            code: '', name, modules: [item.name], materialId: mat.id, materialName: mat.name, thickness: dia,
            length: p.length, width: dia, cutLength: p.length + (isHw ? 0 : 20), cutWidth: dia + (isHw ? 0 : 5),
            qty: 1, edges: { l1: 0, l2: 0, w1: 0, w2: 0 }, grain: true, notes: note, kind: isHw ? 'hardware' : 'turned',
          });
        }
        continue;
      }
      const te = wrgjTenonExtra(p);
      const e = p.edges;
      const cutLength = p.length + te.l - (discount ? e.w1 + e.w2 : 0);
      const cutWidth = p.width + te.w - (discount ? e.l1 + e.l2 : 0);
      const key = [mat.id, p.thickness, p.name, p.length.toFixed(1), p.width.toFixed(1), e.l1, e.l2, e.w1, e.w2, p.grain, notes].join('|');
      const row = panelMap.get(key);
      if (row) {
        row.qty++;
        if (!row.modules.includes(item.name)) row.modules.push(item.name);
      } else {
        panelMap.set(key, {
          code: '', name: p.name, modules: [item.name], materialId: mat.id, materialName: mat.name, thickness: p.thickness,
          length: p.length, width: p.width, cutLength, cutWidth, qty: 1, edges: { ...e }, grain: p.grain, notes, kind: 'panel',
        });
      }
    }
  }

  const groupsMap = new Map<string, WRGJMaterialGroup>();
  for (const row of panelMap.values()) {
    const key = `${row.materialId}|${row.thickness}`;
    let g = groupsMap.get(key);
    if (!g) {
      const mat = wrgjGetMaterial(row.materialId);
      g = { key, letter: '', materialId: row.materialId, materialName: row.materialName, thickness: row.thickness, rows: [], totalQty: 0, areaM2: 0, optimize: mat.optimize };
      groupsMap.set(key, g);
    }
    g.rows.push(row);
    g.totalQty += row.qty;
    g.areaM2 += (row.qty * row.cutLength * row.cutWidth) / 1e6;
  }
  const groups = [...groupsMap.values()].sort((a, b) => a.materialName.localeCompare(b.materialName) || b.thickness - a.thickness);
  groups.forEach((g, gi) => {
    g.letter = gi < 26 ? String.fromCharCode(65 + gi) : `Z${gi}`;
    g.rows.sort((a, b) => b.cutLength * b.cutWidth - a.cutLength * a.cutWidth);
    g.rows.forEach((r, ri) => (r.code = `${g.letter}${String(ri + 1).padStart(2, '0')}`));
  });
  const turned = [...turnedMap.values()];
  turned.forEach((r, i) => (r.code = `T${String(i + 1).padStart(2, '0')}`));
  const hardware = [...hwMap.values()];
  hardware.forEach((r, i) => (r.code = `H${String(i + 1).padStart(2, '0')}`));

  const edgeMap = new Map<number, number>();
  for (const g of groups) {
    for (const r of g.rows) {
      const add = (th: number, len: number) => {
        if (th > 0) edgeMap.set(th, (edgeMap.get(th) ?? 0) + (r.qty * (len + 30)) / 1000);
      };
      add(r.edges.l1, r.length);
      add(r.edges.l2, r.length);
      add(r.edges.w1, r.width);
      add(r.edges.w2, r.width);
    }
  }
  const waste = 1 + project.settings.edgeWastePct / 100;
  const edgeTotals = [...edgeMap.entries()].sort((a, b) => a[0] - b[0]).map(([thickness, meters]) => ({ thickness, meters, withWaste: meters * waste }));
  const totalPieces = groups.reduce((a, g) => a + g.totalQty, 0) + turned.reduce((a, r) => a + r.qty, 0) + hardware.reduce((a, r) => a + r.qty, 0);
  return { groups, turned, hardware, edgeTotals, totalPieces };
}
