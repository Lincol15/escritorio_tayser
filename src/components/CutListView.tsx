import { useMemo, useState } from 'react';
import { FileDown, FileSpreadsheet, Layers, ListOrdered, Settings2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { buildCutList, type CutRow } from '../core/cutlist';
import { optimizeAll } from '../core/optimizer';
import { exportCsv, exportPdf } from '../core/export';
import { fmtLen, trimNum } from '../core/units';
import { Btn, NumberField, Select, Stat, Toggle, cx } from './ui';
import SheetSvg from './SheetSvg';
import type { PackAlgorithm } from '../core/types';

const edgeCell = (v: number) => (v > 0 ? <span className={cx('rounded px-1 font-mono text-[11px]', v >= 2 ? 'bg-amber-500/20 text-amber-700' : v >= 1 ? 'bg-emerald-500/20 text-emerald-700' : 'bg-accent/15 text-accent')}>{trimNum(v, 2)}</span> : <span className="text-zinc-400">—</span>);

export default function CutListView() {
  const project = useStore((s) => s.project);
  const unit = useStore((s) => s.unit);
  const st = useStore.getState();
  const [tab, setTab] = useState<'list' | 'sheets'>('list');
  const cut = useMemo(() => buildCutList(project), [project.items, project.settings]); // eslint-disable-line react-hooks/exhaustive-deps
  const opts = useMemo(() => optimizeAll(cut, project.sheet), [cut, project.sheet]);
  const totalSheets = opts.reduce((a, o) => a + o.sheets.length, 0);
  const used = opts.reduce((a, o) => a + o.usedArea, 0);
  const area = opts.reduce((a, o) => a + o.sheetArea, 0);
  const edgeM = cut.edgeTotals.reduce((a, e) => a + e.withWaste, 0);
  const L = (v: number) => fmtLen(v, unit, false);

  const doPdf = async () => {
    const r = await exportPdf(project, cut, opts, unit);
    if (r) st.notify(`PDF guardado: ${r}`);
  };
  const doCsv = async () => {
    const r = await exportCsv(project, cut, unit);
    if (r) st.notify(`CSV guardado: ${r}`);
  };

  const Rows = ({ rows }: { rows: CutRow[] }) => (
    <>
      {rows.map((r) => (
        <tr key={r.code}>
          <td className="font-mono font-semibold text-accent">{r.code}</td>
          <td>
            {r.name}
            <div className="text-[10px] text-zinc-500">{r.modules.join(', ')}</div>
          </td>
          <td className="text-center font-mono">{r.qty}</td>
          <td className="font-mono">{L(r.length)}</td>
          <td className="font-mono">{L(r.width)}</td>
          <td className="font-mono">{L(r.thickness)}</td>
          <td className="font-mono text-emerald-700">{L(r.cutLength)}</td>
          <td className="font-mono text-emerald-700">{L(r.cutWidth)}</td>
          <td>{edgeCell(r.edges.l1)}</td>
          <td>{edgeCell(r.edges.l2)}</td>
          <td>{edgeCell(r.edges.w1)}</td>
          <td>{edgeCell(r.edges.w2)}</td>
          <td className="text-center">{r.grain ? '⟷' : '—'}</td>
          <td className="max-w-72 text-[11px] text-amber-700/90">{r.notes}</td>
        </tr>
      ))}
    </>
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-panel px-4 py-2">
        <div className="flex rounded-md border border-line p-0.5">
          <Btn size="sm" variant={tab === 'list' ? 'primary' : 'ghost'} onClick={() => setTab('list')}>
            <ListOrdered size={14} /> Lista de despiece
          </Btn>
          <Btn size="sm" variant={tab === 'sheets' ? 'primary' : 'ghost'} onClick={() => setTab('sheets')}>
            <Layers size={14} /> Planos de tableros
          </Btn>
        </div>
        <div className="ml-2 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
          <Settings2 size={14} />
          Tablero
          <NumberField className="w-24" value={project.sheet.length} min={300} onChange={(v) => st.setSheet({ length: v })} />×
          <NumberField className="w-24" value={project.sheet.width} min={300} onChange={(v) => st.setSheet({ width: v })} />
          Sierra
          <NumberField className="w-20" value={project.sheet.kerf} min={0} max={10} onChange={(v) => st.setSheet({ kerf: v })} />
          Refilado
          <NumberField className="w-20" value={project.sheet.trim} min={0} max={50} onChange={(v) => st.setSheet({ trim: v })} />
          <Select
            className="w-40"
            value={project.sheet.algorithm}
            options={[
              { value: 'auto', label: 'Automático (mejor)' },
              { value: 'guillotine', label: 'Guillotina (sierra)' },
              { value: 'maxrects', label: 'MaxRects' },
            ]}
            onChange={(v) => st.setSheet({ algorithm: v as PackAlgorithm })}
          />
          <Toggle value={project.settings.discountEdges} onChange={(v) => st.setSettings({ discountEdges: v })} label="Descontar canto" />
        </div>
        <div className="ml-auto flex gap-2">
          <Btn variant="primary" onClick={doPdf}>
            <FileDown size={15} /> PDF completo
          </Btn>
          <Btn onClick={doCsv}>
            <FileSpreadsheet size={15} /> CSV
          </Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 px-4 py-3 md:grid-cols-5">
        <Stat label="Piezas" value={String(cut.totalPieces)} sub={`${cut.groups.length} grupos de material`} />
        <Stat label="Tableros" value={String(totalSheets)} sub={`${fmtLen(project.sheet.length, unit)} × ${fmtLen(project.sheet.width, unit)}`} />
        <Stat label="Aprovechamiento" value={area ? `${((used / area) * 100).toFixed(1)} %` : '—'} tone={used / area > 0.75 ? 'good' : 'warn'} sub={`Desperdicio ${((area - used) / 1e6).toFixed(2)} m²`} />
        <Stat label="Tapacanto" value={`${edgeM.toFixed(1)} m`} sub={`incluye ${project.settings.edgeWastePct}% de merma`} />
        <Stat label="Área de piezas" value={`${(used / 1e6).toFixed(2)} m²`} sub="neto a cortar" />
      </div>

      <div className="scroll-thin flex-1 overflow-auto px-4 pb-6">
        {tab === 'list' ? (
          <div className="space-y-5">
            {cut.groups.map((g) => (
              <div key={g.key} className="overflow-hidden rounded-lg border border-line">
                <div className="flex items-center justify-between bg-panel2 px-3 py-2 text-sm">
                  <span className="font-semibold">
                    <span className="mr-2 rounded bg-accent px-1.5 font-mono text-xs">{g.letter}</span>
                    {g.materialName} · {fmtLen(g.thickness, unit)}
                  </span>
                  <span className="text-xs text-zinc-600">
                    {g.totalQty} piezas · {g.areaM2.toFixed(2)} m² {g.optimize ? '' : '· no optimizable'}
                  </span>
                </div>
                <table className="cut w-full">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Pieza</th>
                      <th>Cant.</th>
                      <th>Largo</th>
                      <th>Ancho</th>
                      <th>Esp.</th>
                      <th>L corte</th>
                      <th>A corte</th>
                      <th title="Tapacanto Largo 1">L1</th>
                      <th title="Tapacanto Largo 2">L2</th>
                      <th title="Tapacanto Ancho 1">A1</th>
                      <th title="Tapacanto Ancho 2">A2</th>
                      <th>Veta</th>
                      <th>Observaciones / corte especial</th>
                    </tr>
                  </thead>
                  <tbody>
                    <Rows rows={g.rows} />
                  </tbody>
                </table>
              </div>
            ))}
            {(cut.turned.length > 0 || cut.hardware.length > 0) && (
              <div className="overflow-hidden rounded-lg border border-line">
                <div className="bg-panel2 px-3 py-2 text-sm font-semibold">Piezas torneadas (conos / cilindros) y accesorios</div>
                <table className="cut w-full">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Pieza</th>
                      <th>Cant.</th>
                      <th>Material</th>
                      <th>Largo</th>
                      <th>Ø</th>
                      <th>Bruto</th>
                      <th>Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...cut.turned, ...cut.hardware].map((r) => (
                      <tr key={r.code}>
                        <td className="font-mono font-semibold text-accent">{r.code}</td>
                        <td>{r.name}</td>
                        <td className="font-mono">{r.qty}</td>
                        <td>{r.materialName}</td>
                        <td className="font-mono">{L(r.length)}</td>
                        <td className="font-mono">{L(r.width)}</td>
                        <td className="font-mono">
                          {L(r.cutLength)} × {L(r.cutWidth)}
                        </td>
                        <td className="text-[11px] text-amber-700/90">{r.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="overflow-hidden rounded-lg border border-line md:w-[480px]">
              <div className="bg-panel2 px-3 py-2 text-sm font-semibold">Resumen de tapacantos</div>
              <table className="cut w-full">
                <thead>
                  <tr>
                    <th>Grosor</th>
                    <th>Metros netos</th>
                    <th>Con merma ({project.settings.edgeWastePct}%)</th>
                  </tr>
                </thead>
                <tbody>
                  {cut.edgeTotals.map((e) => (
                    <tr key={e.thickness}>
                      <td>{edgeCell(e.thickness)} mm</td>
                      <td className="font-mono">{e.meters.toFixed(2)} m</td>
                      <td className="font-mono">{e.withWaste.toFixed(2)} m</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!cut.groups.length && <div className="py-10 text-center text-zinc-500">No hay piezas en el proyecto. Agrega módulos en Build 3D.</div>}
          </div>
        ) : (
          <div className="space-y-6">
            {opts.map((o) => (
              <div key={o.key}>
                <div className="mb-2 flex flex-wrap items-baseline gap-3">
                  <h3 className="text-sm font-semibold">
                    <span className="mr-2 rounded bg-accent px-1.5 font-mono text-xs">{o.letter}</span>
                    {o.materialName} {fmtLen(o.thickness, unit)}
                  </h3>
                  <span className="text-xs text-zinc-600">
                    {o.sheets.length} tablero(s) · aprovechamiento {(o.utilization * 100).toFixed(1)} % · desperdicio {(o.wasteArea / 1e6).toFixed(2)} m² · {o.algorithm}
                  </span>
                </div>
                {o.unplaced.length > 0 && (
                  <div className="mb-2 rounded border border-red-300 bg-red-500/10 p-2 text-xs text-red-700">
                    {o.unplaced.length} pieza(s) no caben en el tablero configurado: {o.unplaced.map((u) => `${u.code} (${L(u.w)}×${L(u.h)})`).join(', ')}
                  </div>
                )}
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                  {o.sheets.map((s, i) => (
                    <SheetSvg key={i} opt={o} sheet={s} index={i} unit={unit} />
                  ))}
                </div>
              </div>
            ))}
            {!opts.length && <div className="py-10 text-center text-zinc-500">No hay tableros que optimizar.</div>}
          </div>
        )}
      </div>
    </div>
  );
}
