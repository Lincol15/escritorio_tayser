/*
 * Proyecto:    Tayser 1.0.0
 * Archivo:     src/components/PieceEditor.tsx
 * Autor:       LRGJ
 * Descripción: Editor de pieza: tapacantos, veta y cortes especiales.
 */
import { Plus, Trash2, Undo2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { buildItem } from '../core/items';
import { BOARD_MATERIALS, EDGE_OPTIONS, MATERIALS } from '../core/materials';
import type { Corner, EdgeKey, Hole, PieceFeatures, SceneItem } from '../core/types';
import { Btn, NumberField, Row, Section, Select, Toggle, cx } from './ui';
import { CORNER_LABEL, EDGE_LABEL, featureNotes } from '../core/cutlist';
import { fmtLen } from '../core/units';
import { uid } from '../core/ids';

const EDGE_HINT: Record<EdgeKey, string> = { l1: 'Largo 1 (frente)', l2: 'Largo 2', w1: 'Ancho 1', w2: 'Ancho 2' };
const CORNERS: Corner[] = ['tl', 'tr', 'bl', 'br'];
const edgeOpts = EDGE_OPTIONS.map((v) => ({ value: String(v), label: v === 0 ? 'Sin canto' : `${v} mm` }));
const edgeKeyOpts = (['l1', 'l2', 'w1', 'w2'] as EdgeKey[]).map((k) => ({ value: k, label: `${EDGE_LABEL[k]} · ${EDGE_HINT[k]}` }));

export default function PieceEditor({ item, pieceKey }: { item: SceneItem; pieceKey: string }) {
  const unit = useStore((s) => s.unit);
  const st = useStore.getState();
  const piece = buildItem(item).pieces.find((p) => p.key === pieceKey);
  if (!piece) return null;
  const f = piece.features;
  const setF = (patch: Partial<PieceFeatures>) => st.setPieceOverride(item.id, pieceKey, { features: patch });
  const hidden = item.hiddenPieces.includes(pieceKey);
  const isPanel = piece.kind === 'panel';
  const notes = featureNotes(piece);

  return (
    <>
      <Section
        title={`Pieza: ${piece.name}`}
        right={
          <Btn size="sm" variant="ghost" title="Restablecer la pieza a los valores del generador" onClick={() => st.resetPieceOverride(item.id, pieceKey)}>
            <Undo2 size={12} />
          </Btn>
        }
      >
        <div className="grid grid-cols-3 gap-1 text-center font-mono text-[11px]">
          <div className="rounded bg-panel2 py-1">
            <div className="text-[9px] text-zinc-500">{isPanel ? 'LARGO' : 'ALTO'}</div>
            {fmtLen(piece.length, unit)}
          </div>
          <div className="rounded bg-panel2 py-1">
            <div className="text-[9px] text-zinc-500">{isPanel ? 'ANCHO' : 'Ø MAYOR'}</div>
            {fmtLen(piece.width, unit)}
          </div>
          <div className="rounded bg-panel2 py-1">
            <div className="text-[9px] text-zinc-500">ESPESOR</div>
            {fmtLen(piece.thickness, unit)}
          </div>
        </div>
        <div className="text-[10px] text-zinc-500">Las medidas se controlan con los parámetros del mueble. Clave: {piece.key}</div>
        <Row label="Visible">
          <Toggle value={!hidden} onChange={() => st.togglePieceHidden(item.id, pieceKey)} />
        </Row>
        <Row label="Material">
          <Select
            value={item.overrides[pieceKey]?.materialId ?? ''}
            options={[{ value: '', label: `Según mueble (${MATERIALS.find((m) => m.id === piece.materialId)?.name ?? ''})` }, ...BOARD_MATERIALS.map((m) => ({ value: m.id, label: m.name })), { value: 'metal-cromo', label: 'Metal cromado' }]}
            onChange={(v) => st.setPieceOverride(item.id, pieceKey, { materialId: v || undefined })}
          />
        </Row>
        <Row label="Paso de armado">
          <NumberField length={false} min={1} max={30} value={piece.step} onChange={(v) => st.setPieceOverride(item.id, pieceKey, { step: Math.round(v) })} />
        </Row>
        {isPanel && (
          <Row label="Respetar veta" hint="Con veta activa el optimizador no rota la pieza 90°">
            <Toggle value={piece.grain} onChange={(v) => st.setPieceOverride(item.id, pieceKey, { grain: v })} label={piece.grain ? 'Veta a lo largo' : 'Libre'} />
          </Row>
        )}
      </Section>

      {isPanel && (
        <Section title="Tapacantos">
          <EdgeDiagram piece={piece} />
          {(['l1', 'l2', 'w1', 'w2'] as EdgeKey[]).map((k) => (
            <Row key={k} label={`${EDGE_LABEL[k]} · ${EDGE_HINT[k]}`}>
              <Select value={String(piece.edges[k])} options={edgeOpts} onChange={(v) => st.setPieceOverride(item.id, pieceKey, { edges: { [k]: Number(v) } })} />
            </Row>
          ))}
        </Section>
      )}

      {isPanel && (
        <Section title="Cortes especiales">
          {notes && <div className="rounded border border-amber-300 bg-amber-500/10 p-2 text-[11px] text-amber-700">{notes}</div>}

          <div className="text-[11px] font-semibold text-zinc-700">Esquinas curvas (radio)</div>
          <Row label="Radio">
            <NumberField value={f.cornerRadius} min={0} max={Math.min(piece.length, piece.width) / 2} onChange={(v) => setF({ cornerRadius: v })} />
          </Row>
          <div className="grid grid-cols-4 gap-1">
            {CORNERS.map((c) => (
              <button
                key={c}
                onClick={() => setF({ radiusCorners: f.radiusCorners.includes(c) ? f.radiusCorners.filter((x) => x !== c) : [...f.radiusCorners, c] })}
                className={cx('rounded border px-1 py-1 text-[10px]', f.radiusCorners.includes(c) ? 'border-accent bg-accent/15 text-accent' : 'border-line text-zinc-500')}
              >
                {CORNER_LABEL[c]}
              </button>
            ))}
          </div>

          <ListHeader title="Cortes en diagonal" onAdd={() => setF({ diagonals: [...f.diagonals, { corner: 'tr', cutL: 100, cutW: 100 }] })} />
          {f.diagonals.map((d, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-1">
              <Select value={d.corner} options={CORNERS.map((c) => ({ value: c, label: CORNER_LABEL[c] }))} onChange={(v) => setF({ diagonals: f.diagonals.map((x, j) => (j === i ? { ...x, corner: v as Corner } : x)) })} />
              <NumberField value={d.cutL} min={1} onChange={(v) => setF({ diagonals: f.diagonals.map((x, j) => (j === i ? { ...x, cutL: v } : x)) })} />
              <NumberField value={d.cutW} min={1} onChange={(v) => setF({ diagonals: f.diagonals.map((x, j) => (j === i ? { ...x, cutW: v } : x)) })} />
              <DelBtn onClick={() => setF({ diagonals: f.diagonals.filter((_, j) => j !== i) })} />
            </div>
          ))}

          <ListHeader title="Cortes con grados (biseles)" onAdd={() => setF({ bevels: [...f.bevels, { edge: 'l1', angle: 45 }] })} />
          {f.bevels.map((b, i) => (
            <div key={i} className="grid grid-cols-[1.4fr_1fr_auto] gap-1">
              <Select value={b.edge} options={edgeKeyOpts} onChange={(v) => setF({ bevels: f.bevels.map((x, j) => (j === i ? { ...x, edge: v as EdgeKey } : x)) })} />
              <NumberField length={false} suffix="°" min={0} max={75} value={b.angle} onChange={(v) => setF({ bevels: f.bevels.map((x, j) => (j === i ? { ...x, angle: v } : x)) })} />
              <DelBtn onClick={() => setF({ bevels: f.bevels.filter((_, j) => j !== i) })} />
            </div>
          ))}

          <ListHeader
            title="Huecos / calados internos"
            onAdd={() =>
              setF({
                holes: [...f.holes, { id: uid('h'), shape: 'rect', x: piece.length / 2, y: piece.width / 2, w: Math.min(200, piece.length / 3), h: Math.min(100, piece.width / 3), r: 0 }],
              })
            }
          />
          {f.holes.map((h, i) => {
            const upd = (patch: Partial<Hole>) => setF({ holes: f.holes.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
            return (
              <div key={h.id} className="space-y-1 rounded border border-line p-1.5">
                <div className="flex gap-1">
                  <Select
                    value={h.shape}
                    options={[{ value: 'rect', label: 'Rectangular' }, { value: 'circle', label: 'Circular' }]}
                    onChange={(v) => upd({ shape: v as Hole['shape'], r: v === 'circle' ? Math.max(h.r, 20) : 0 })}
                  />
                  <DelBtn onClick={() => setF({ holes: f.holes.filter((_, j) => j !== i) })} />
                </div>
                <div className="grid grid-cols-2 gap-1 text-[10px] text-zinc-500">
                  <label>Centro X<NumberField value={h.x} onChange={(v) => upd({ x: v })} /></label>
                  <label>Centro Y<NumberField value={h.y} onChange={(v) => upd({ y: v })} /></label>
                  {h.shape === 'rect' ? (
                    <>
                      <label>Ancho<NumberField value={h.w} min={1} onChange={(v) => upd({ w: v })} /></label>
                      <label>Alto<NumberField value={h.h} min={1} onChange={(v) => upd({ h: v })} /></label>
                      <label>Radio esq.<NumberField value={h.r} min={0} onChange={(v) => upd({ r: v })} /></label>
                    </>
                  ) : (
                    <label>Radio<NumberField value={h.r} min={1} onChange={(v) => upd({ r: v })} /></label>
                  )}
                </div>
              </div>
            );
          })}

          <ListHeader title="Espigas" onAdd={() => setF({ tenons: [...f.tenons, { id: uid('t'), edge: 'w1', length: 25, size: Math.min(60, piece.width * 0.6), thickness: Math.max(4, piece.thickness / 3) }] })} />
          {f.tenons.map((t, i) => {
            const upd = (patch: Partial<typeof t>) => setF({ tenons: f.tenons.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
            return (
              <div key={t.id} className="space-y-1 rounded border border-line p-1.5">
                <div className="flex gap-1">
                  <Select value={t.edge} options={edgeKeyOpts} onChange={(v) => upd({ edge: v as EdgeKey })} />
                  <DelBtn onClick={() => setF({ tenons: f.tenons.filter((_, j) => j !== i) })} />
                </div>
                <div className="grid grid-cols-3 gap-1 text-[10px] text-zinc-500">
                  <label>Saliente<NumberField value={t.length} min={1} onChange={(v) => upd({ length: v })} /></label>
                  <label>Ancho<NumberField value={t.size} min={1} onChange={(v) => upd({ size: v })} /></label>
                  <label>Grosor<NumberField value={t.thickness} min={1} onChange={(v) => upd({ thickness: v })} /></label>
                </div>
              </div>
            );
          })}
          <div className="text-[10px] text-zinc-500">Las espigas se suman a la medida de corte. Los calados se miden desde la esquina inferior izquierda de la pieza.</div>
        </Section>
      )}
    </>
  );
}

function ListHeader({ title, onAdd }: { title: string; onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between pt-1">
      <span className="text-[11px] font-semibold text-zinc-700">{title}</span>
      <Btn size="sm" variant="ghost" onClick={onAdd}>
        <Plus size={12} /> Agregar
      </Btn>
    </div>
  );
}

function DelBtn({ onClick }: { onClick: () => void }) {
  return (
    <Btn size="sm" variant="ghost" onClick={onClick} className="text-red-700">
      <Trash2 size={12} />
    </Btn>
  );
}

/** Esquema de la pieza con sus 4 cantos coloreados según grosor */
function EdgeDiagram({ piece }: { piece: { length: number; width: number; edges: Record<EdgeKey, number>; grain: boolean } }) {
  const ratio = Math.min(3, Math.max(0.35, piece.length / piece.width));
  const W = 180;
  const H = Math.max(40, Math.min(110, W / ratio));
  const col = (v: number) => (v >= 2 ? '#f59e0b' : v >= 1 ? '#22c55e' : v > 0 ? '#38bdf8' : '#c4c9c3');
  const sw = (v: number) => (v > 0 ? 4 : 1.5);
  const x0 = 20;
  const y0 = 12;
  return (
    <svg viewBox={`0 0 ${W + 40} ${H + 28}`} className="w-full">
      <rect x={x0} y={y0} width={W} height={H} fill="#e4e7e3" />
      {piece.grain && Array.from({ length: 6 }, (_, i) => <line key={i} x1={x0 + 8} x2={x0 + W - 8} y1={y0 + ((i + 1) * H) / 7} y2={y0 + ((i + 1) * H) / 7} stroke="#52525b" strokeDasharray="6 4" />)}
      <line x1={x0} y1={y0} x2={x0 + W} y2={y0} stroke={col(piece.edges.l1)} strokeWidth={sw(piece.edges.l1)} />
      <line x1={x0} y1={y0 + H} x2={x0 + W} y2={y0 + H} stroke={col(piece.edges.l2)} strokeWidth={sw(piece.edges.l2)} />
      <line x1={x0 + W} y1={y0} x2={x0 + W} y2={y0 + H} stroke={col(piece.edges.w1)} strokeWidth={sw(piece.edges.w1)} />
      <line x1={x0} y1={y0} x2={x0} y2={y0 + H} stroke={col(piece.edges.w2)} strokeWidth={sw(piece.edges.w2)} />
      <text x={x0 + W / 2} y={y0 - 3} fontSize="9" fill="#5c635d" textAnchor="middle">L1 {piece.edges.l1 || ''}</text>
      <text x={x0 + W / 2} y={y0 + H + 11} fontSize="9" fill="#5c635d" textAnchor="middle">L2 {piece.edges.l2 || ''}</text>
      <text x={x0 + W + 4} y={y0 + H / 2} fontSize="9" fill="#5c635d">A1</text>
      <text x={2} y={y0 + H / 2} fontSize="9" fill="#5c635d">A2</text>
      <text x={x0 + W / 2} y={y0 + H + 24} fontSize="8.5" fill="#7a807a" textAnchor="middle">{piece.grain ? 'Veta ⟷ a lo largo' : 'Sin veta'}</text>
    </svg>
  );
}
