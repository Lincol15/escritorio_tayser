/*
 * Proyecto:    Tayser 1.0.0
 * Archivo:     src/core/export.ts
 * Autor:       LRGJ
 * Descripción: Exportación a PDF y CSV.
 */
// Exportación local: PDF (jsPDF + autotable) y CSV
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Project, Unit } from './types';
import type { CutList, CutRow } from './cutlist';
import type { GroupOptimization } from './optimizer';
import { fmtLen, trimNum } from './units';
import { saveBinaryFile } from './persistence';

const PALETTE: [number, number, number][] = [
  [191, 219, 254], [187, 247, 208], [254, 240, 138], [254, 202, 202], [221, 214, 254], [165, 243, 252],
  [253, 230, 138], [251, 207, 232], [204, 251, 241], [226, 232, 240], [254, 215, 170], [217, 249, 157],
];

export function colorForCode(code: string): [number, number, number] {
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

const edgeTxt = (v: number) => (v > 0 ? trimNum(v, 2) : '—');
const safe = (s: string) => s.replace(/[^\w\-áéíóúñÁÉÍÓÚÑ ]+/g, '').trim().replace(/\s+/g, '_') || 'proyecto';

export function buildPdf(project: Project, cut: CutList, opts: GroupOptimization[], unit: Unit): ArrayBuffer {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const L = (mm: number) => fmtLen(mm, unit, false);
  const date = new Date().toLocaleString('es');

  const header = (title: string) => {
    doc.setFillColor(17, 24, 39);
    doc.rect(0, 0, PW, 16, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('TAYSER', 10, 10.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(title, 38, 10.5);
    doc.text(`${project.name}  ·  ${date}`, PW - 10, 10.5, { align: 'right' });
    doc.setTextColor(20, 20, 20);
  };
  const lastY = () => (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 30;

  // Página 1: resumen
  header('Resumen del proyecto');
  doc.setFontSize(10);
  doc.text(`Cliente: ${project.client || '—'}`, 10, 24);
  doc.text(`Unidades: ${unit}   ·   Tablero: ${L(project.sheet.length)} × ${L(project.sheet.width)}   ·   Sierra: ${L(project.sheet.kerf)}   ·   Refilado: ${L(project.sheet.trim)}`, 10, 30);
  if (project.notes) doc.text(`Notas: ${project.notes}`, 10, 36, { maxWidth: PW - 20 });

  const modules = project.items.filter((i) => i.category === 'module' || i.category === 'piece');
  autoTable(doc, {
    startY: 42,
    head: [['Material', 'Espesor', 'Piezas', 'Área piezas (m²)', 'Tableros', 'Aprovechamiento', 'Desperdicio (m²)']],
    body: cut.groups.map((g) => {
      const o = opts.find((x) => x.key === g.key);
      return [
        g.materialName, L(g.thickness), String(g.totalQty), g.areaM2.toFixed(2),
        o ? String(o.sheets.length) : '—', o ? `${(o.utilization * 100).toFixed(1)} %` : '—', o ? (o.wasteArea / 1e6).toFixed(2) : '—',
      ];
    }),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [37, 99, 235] },
    margin: { left: 10, right: 10 },
  });
  autoTable(doc, {
    startY: lastY() + 6,
    head: [['Tapacanto', 'Metros netos', `Metros con ${project.settings.edgeWastePct}% merma`]],
    body: cut.edgeTotals.length ? cut.edgeTotals.map((e) => [`${trimNum(e.thickness, 2)} mm`, e.meters.toFixed(2), e.withWaste.toFixed(2)]) : [['Sin tapacantos', '—', '—']],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [245, 158, 11] },
    margin: { left: 10 },
    tableWidth: 140,
  });
  autoTable(doc, {
    startY: lastY() + 6,
    head: [['Módulo', 'Tipo', 'Posición X/Y/Z', 'Rotación']],
    body: modules.map((m) => [m.name, m.templateId, m.position.map((v) => L(v)).join(' / '), `${trimNum(m.rotationY)}°`]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [55, 65, 81] },
    margin: { left: 10, right: 10 },
  });

  // Despiece
  const rowToCells = (r: CutRow) => [
    r.code, r.name, String(r.qty), L(r.length), L(r.width), L(r.thickness), L(r.cutLength), L(r.cutWidth),
    edgeTxt(r.edges.l1), edgeTxt(r.edges.l2), edgeTxt(r.edges.w1), edgeTxt(r.edges.w2), r.grain ? 'Sí' : 'No', r.notes || '', r.modules.join(', '),
  ];
  for (const g of cut.groups) {
    doc.addPage();
    header(`Despiece · ${g.materialName} ${L(g.thickness)}`);
    autoTable(doc, {
      startY: 22,
      head: [['Cód.', 'Pieza', 'Cant', 'Largo', 'Ancho', 'Esp.', 'L corte', 'A corte', 'L1', 'L2', 'A1', 'A2', 'Veta', 'Observaciones', 'Módulo(s)']],
      body: g.rows.map(rowToCells),
      styles: { fontSize: 7.5, cellPadding: 1.4 },
      headStyles: { fillColor: [37, 99, 235] },
      columnStyles: { 13: { cellWidth: 55 }, 14: { cellWidth: 40 } },
      margin: { left: 8, right: 8 },
    });
  }
  if (cut.turned.length || cut.hardware.length) {
    doc.addPage();
    header('Piezas torneadas, macizas y accesorios');
    autoTable(doc, {
      startY: 22,
      head: [['Cód.', 'Pieza', 'Cant', 'Material', 'Largo', 'Ø', 'Bruto largo', 'Bruto sección', 'Observaciones']],
      body: [...cut.turned, ...cut.hardware].map((r) => [r.code, r.name, String(r.qty), r.materialName, L(r.length), L(r.width), L(r.cutLength), `${L(r.cutWidth)} × ${L(r.cutWidth)}`, r.notes]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [55, 65, 81] },
      margin: { left: 10, right: 10 },
    });
  }

  // Planos de corte
  for (const o of opts) {
    o.sheets.forEach((s, si) => {
      doc.addPage();
      header(`Plano de corte · ${o.materialName} ${L(o.thickness)} · Tablero ${si + 1}/${o.sheets.length}`);
      const maxW = PW - 20;
      const maxH = PH - 40;
      const sc = Math.min(maxW / o.sheetLength, maxH / o.sheetWidth);
      const ox = 10;
      const oy = 24;
      doc.setFontSize(9);
      doc.text(`Aprovechamiento: ${(s.utilization * 100).toFixed(1)} %   ·   Piezas: ${s.placements.length}   ·   ${o.algorithm}`, 10, 21);
      doc.setDrawColor(90, 90, 90);
      doc.setFillColor(243, 244, 246);
      doc.rect(ox, oy, o.sheetLength * sc, o.sheetWidth * sc, 'FD');
      doc.setDrawColor(200, 200, 200);
      doc.setLineDashPattern([1, 1], 0);
      doc.rect(ox + o.trim * sc, oy + o.trim * sc, (o.sheetLength - 2 * o.trim) * sc, (o.sheetWidth - 2 * o.trim) * sc, 'S');
      doc.setLineDashPattern([], 0);
      for (const p of s.placements) {
        const [r, g, b] = colorForCode(p.code);
        doc.setFillColor(r, g, b);
        doc.setDrawColor(40, 40, 40);
        const x = ox + p.x * sc;
        const y = oy + p.y * sc;
        const w = p.w * sc;
        const h = p.h * sc;
        doc.rect(x, y, w, h, 'FD');
        const fs = Math.max(4, Math.min(9, Math.min(w, h) / 3.2));
        doc.setFontSize(fs);
        doc.setTextColor(20, 20, 20);
        if (w > 8 && h > 5) {
          doc.text(p.code, x + w / 2, y + h / 2 - fs * 0.15, { align: 'center' });
          doc.setFontSize(Math.max(3.5, fs * 0.7));
          doc.text(`${L(p.w)} × ${L(p.h)}${p.grain ? ' (veta)' : ''}`, x + w / 2, y + h / 2 + fs * 0.42, { align: 'center' });
        }
      }
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      doc.text(`${L(o.sheetLength)}`, ox + (o.sheetLength * sc) / 2, oy + o.sheetWidth * sc + 5, { align: 'center' });
      doc.text(`${L(o.sheetWidth)}`, ox + o.sheetLength * sc + 3, oy + (o.sheetWidth * sc) / 2, { angle: 90 });
    });
    if (o.unplaced.length) {
      doc.addPage();
      header(`Piezas que no caben en el tablero · ${o.materialName}`);
      autoTable(doc, {
        startY: 22,
        head: [['Cód.', 'Pieza', 'Medida de corte']],
        body: o.unplaced.map((u) => [u.code, u.name, `${L(u.w)} × ${L(u.h)}`]),
        headStyles: { fillColor: [220, 38, 38] },
      });
    }
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Página ${i} de ${pages} · Generado offline con Tayser`, PW - 10, PH - 5, { align: 'right' });
  }
  return doc.output('arraybuffer');
}

export function buildCsv(project: Project, cut: CutList, unit: Unit): string {
  const q = (v: string | number) => {
    const s = String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const L = (mm: number) => fmtLen(mm, unit, false);
  const lines: string[] = [];
  lines.push(`Proyecto;${q(project.name)};Cliente;${q(project.client)};Unidades;${unit}`);
  lines.push(['Código', 'Pieza', 'Módulo(s)', 'Material', 'Cantidad', 'Largo', 'Ancho', 'Espesor', 'Largo corte', 'Ancho corte', 'Canto L1', 'Canto L2', 'Canto A1', 'Canto A2', 'Veta', 'Observaciones'].join(';'));
  const all = [...cut.groups.flatMap((g) => g.rows), ...cut.turned, ...cut.hardware];
  for (const r of all) {
    lines.push(
      [
        r.code, r.name, r.modules.join(', '), r.materialName, r.qty, L(r.length), L(r.width), L(r.thickness), L(r.cutLength), L(r.cutWidth),
        r.edges.l1, r.edges.l2, r.edges.w1, r.edges.w2, r.grain ? 'Sí' : 'No', r.notes,
      ].map(q).join(';'),
    );
  }
  lines.push('');
  lines.push('Tapacanto (mm);Metros netos;Metros con merma');
  cut.edgeTotals.forEach((e) => lines.push(`${e.thickness};${e.meters.toFixed(2)};${e.withWaste.toFixed(2)}`));
  return '﻿' + lines.join('\r\n');
}

export async function exportPdf(project: Project, cut: CutList, opts: GroupOptimization[], unit: Unit) {
  const data = buildPdf(project, cut, opts, unit);
  return saveBinaryFile(`${safe(project.name)}_despiece.pdf`, new Uint8Array(data), 'application/pdf', [{ name: 'PDF', extensions: ['pdf'] }]);
}

export async function exportCsv(project: Project, cut: CutList, unit: Unit) {
  const csv = buildCsv(project, cut, unit);
  return saveBinaryFile(`${safe(project.name)}_despiece.csv`, csv, 'text/csv', [{ name: 'CSV', extensions: ['csv'] }]);
}
