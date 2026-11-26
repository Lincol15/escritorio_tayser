/*
 * Proyecto:    Tayser 1.0.0
 * Archivo:     src/components/PieceEditor.tsx
 * Autores:     LWYC, RCO, GDMS, JDAP
 * Descripción: Editor de pieza: tapacantos, veta y cortes especiales.
 */
import { Plus, Trash2, Undo2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { wrgjBuildItem } from '../core/items';
import { WRGJ_BOARD_MATERIALS, WRGJ_EDGE_OPTIONS, WRGJ_MATERIALS } from '../core/materials';
import type { WRGJCorner, WRGJEdgeKey, WRGJHole, WRGJPieceFeatures, WRGJSceneItem } from '../core/types';
import { WRGJBtn, WRGJNumberField, WRGJRow, WRGJSection, WRGJSelect, WRGJToggle, wrgjCx } from './ui';
import { WRGJ_CORNER_LABEL, WRGJ_EDGE_LABEL, wrgjFeatureNotes } from '../core/cutlist';
import { wrgjFmtLen } from '../core/units';
import { wrgjUid } from '../core/ids';

const WRGJ_EDGE_HINT: Record<WRGJEdgeKey, string> = { l1: 'Largo 1 (frente)', l2: 'Largo 2', w1: 'Ancho 1', w2: 'Ancho 2' };
const WRGJ_CORNERS: WRGJCorner[] = ['tl', 'tr', 'bl', 'br'];
const wrgjEdgeOpts = WRGJ_EDGE_OPTIONS.map((v) => ({ value: String(v), label: v === 0 ? 'Sin canto' : `${v} mm` }));
const wrgjEdgeKeyOpts = (['l1', 'l2', 'w1', 'w2'] as WRGJEdgeKey[]).map((k) => ({ value: k, label: `${WRGJ_EDGE_LABEL[k]} · ${WRGJ_EDGE_HINT[k]}` }));

export default function WRGJPieceEditor({ item, pieceKey }: { item: WRGJSceneItem; pieceKey: string }) {
  const unit = useStore((s) => s.unit);
  const st = useStore.getState();
  const piece = wrgjBuildItem(item).pieces.find((p) => p.key === pieceKey);
  if (!piece) return null;
  const f = piece.features;
  const setF = (patch: Partial<WRGJPieceFeatures>) => st.setPieceOverride(item.id, pieceKey, { features: patch });
  const hidden = item.hiddenPieces.includes(pieceKey);
  const isPanel = piece.kind === 'panel';
  const notes = wrgjFeatureNotes(piece);

  return (
    <>
      <WRGJSection
        title={`Pieza: ${piece.name}`}
        right={
          <WRGJBtn size="sm" variant="ghost" title="Restablecer la pieza a los valores del generador" onClick={() => st.resetPieceOverride(item.id, pieceKey)}>
            <Undo2 size={12} />
          </WRGJBtn>
        }
      >
        <div className="grid grid-cols-3 gap-1 text-center font-mono text-[11px]">
          <div className="rounded bg-panel2 py-1">
            <div className="text-[9px] text-zinc-500">{isPanel ? 'LARGO' : 'ALTO'}</div>
            {wrgjFmtLen(piece.length, unit)}
          </div>
          <div className="rounded bg-panel2 py-1">
            <div className="text-[9px] text-zinc-500">{isPanel ? 'ANCHO' : 'Ø MAYOR'}</div>
            {wrgjFmtLen(piece.width, unit)}
          </div>
          <div className="rounded bg-panel2 py-1">
            <div className="text-[9px] text-zinc-500">ESPESOR</div>
            {wrgjFmtLen(piece.thickness, unit)}
          </div>
        </div>
        <div className="text-[10px] text-zinc-500">Las medidas se controlan con los parámetros del mueble. Clave: {piece.key}</div>
        <WRGJRow label="Visible">
          <WRGJToggle value={!hidden} onChange={() => st.togglePieceHidden(item.id, pieceKey)} />
        </WRGJRow>
        <WRGJRow label="Material">
          <WRGJSelect
            value={item.overrides[pieceKey]?.materialId ?? ''}
            options={[{ value: '', label: `Según mueble (${WRGJ_MATERIALS.find((m) => m.id === piece.materialId)?.name ?? ''})` }, ...WRGJ_BOARD_MATERIALS.map((m) => ({ value: m.id, label: m.name })), { value: 'metal-cromo', label: 'Metal cromado' }]}
            onChange={(v) => st.setPieceOverride(item.id, pieceKey, { materialId: v || undefined })}
          />
        </WRGJRow>
        <WRGJRow label="Paso de armado">
          <WRGJNumberField length={false} min={1} max={30} value={piece.step} onChange={(v) => st.setPieceOverride(item.id, pieceKey, { step: Math.round(v) })} />
        </WRGJRow>
        {isPanel && (
          <WRGJRow label="Respetar veta" hint="Con veta activa el optimizador no rota la pieza 90°">
            <WRGJToggle value={piece.grain} onChange={(v) => st.setPieceOverride(item.id, pieceKey, { grain: v })} label={piece.grain ? 'Veta a lo largo' : 'Libre'} />
          </WRGJRow>
        )}
      </WRGJSection>

      {isPanel && (
        <WRGJSection title="Tapacantos">
          <WRGJEdgeDiagram piece={piece} />
          {(['l1', 'l2', 'w1', 'w2'] as WRGJEdgeKey[]).map((k) => (
            <WRGJRow key={k} label={`${WRGJ_EDGE_LABEL[k]} · ${WRGJ_EDGE_HINT[k]}`}>
              <WRGJSelect value={String(piece.edges[k])} options={wrgjEdgeOpts} onChange={(v) => st.setPieceOverride(item.id, pieceKey, { edges: { [k]: Number(v) } })} />
            </WRGJRow>
          ))}
        </WRGJSection>
      )}

      {isPanel && (
        <WRGJSection title="Cortes especiales">
          {notes && <div className="rounded border border-amber-300 bg-amber-500/10 p-2 text-[11px] text-amber-700">{notes}</div>}

          <div className="text-[11px] font-semibold text-zinc-700">Esquinas curvas (radio)</div>
          <WRGJRow label="Radio">
            <WRGJNumberField value={f.cornerRadius} min={0} max={Math.min(piece.length, piece.width) / 2} onChange={(v) => setF({ cornerRadius: v })} />
          </WRGJRow>
          <div className="grid grid-cols-4 gap-1">
            {WRGJ_CORNERS.map((c) => (
              <button
                key={c}
                onClick={() => setF({ radiusCorners: f.radiusCorners.includes(c) ? f.radiusCorners.filter((x) => x !== c) : [...f.radiusCorners, c] })}
                className={wrgjCx('rounded border px-1 py-1 text-[10px]', f.radiusCorners.includes(c) ? 'border-accent bg-accent/15 text-accent' : 'border-line text-zinc-500')}
              >
                {WRGJ_CORNER_LABEL[c]}
              </button>
            ))}
          </div>

          <WRGJListHeader title="Cortes en diagonal" onAdd={() => setF({ diagonals: [...f.diagonals, { corner: 'tr', cutL: 100, cutW: 100 }] })} />
          {f.diagonals.map((d, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-1">
              <WRGJSelect value={d.corner} options={WRGJ_CORNERS.map((c) => ({ value: c, label: WRGJ_CORNER_LABEL[c] }))} onChange={(v) => setF({ diagonals: f.diagonals.map((x, j) => (j === i ? { ...x, corner: v as WRGJCorner } : x)) })} />
              <WRGJNumberField value={d.cutL} min={1} onChange={(v) => setF({ diagonals: f.diagonals.map((x, j) => (j === i ? { ...x, cutL: v } : x)) })} />
              <WRGJNumberField value={d.cutW} min={1} onChange={(v) => setF({ diagonals: f.diagonals.map((x, j) => (j === i ? { ...x, cutW: v } : x)) })} />
              <WRGJDelBtn onClick={() => setF({ diagonals: f.diagonals.filter((_, j) => j !== i) })} />
            </div>
          ))}

          <WRGJListHeader title="Cortes con grados (biseles)" onAdd={() => setF({ bevels: [...f.bevels, { edge: 'l1', angle: 45 }] })} />
          {f.bevels.map((b, i) => (
            <div key={i} className="grid grid-cols-[1.4fr_1fr_auto] gap-1">
              <WRGJSelect value={b.edge} options={wrgjEdgeKeyOpts} onChange={(v) => setF({ bevels: f.bevels.map((x, j) => (j === i ? { ...x, edge: v as WRGJEdgeKey } : x)) })} />
              <WRGJNumberField length={false} suffix="°" min={0} max={75} value={b.angle} onChange={(v) => setF({ bevels: f.bevels.map((x, j) => (j === i ? { ...x, angle: v } : x)) })} />
              <WRGJDelBtn onClick={() => setF({ bevels: f.bevels.filter((_, j) => j !== i) })} />
            </div>
          ))}

          <WRGJListHeader
            title="Huecos / calados internos"
            onAdd={() =>
              setF({
                holes: [...f.holes, { id: wrgjUid('h'), shape: 'rect', x: piece.length / 2, y: piece.width / 2, w: Math.min(200, piece.length / 3), h: Math.min(100, piece.width / 3), r: 0 }],
              })
            }
          />
          {f.holes.map((h, i) => {
            const upd = (patch: Partial<WRGJHole>) => setF({ holes: f.holes.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
            return (
              <div key={h.id} className="space-y-1 rounded border border-line p-1.5">
                <div className="flex gap-1">
                  <WRGJSelect
                    value={h.shape}
                    options={[{ value: 'rect', label: 'Rectangular' }, { value: 'circle', label: 'Circular' }]}
                    onChange={(v) => upd({ shape: v as WRGJHole['shape'], r: v === 'circle' ? Math.max(h.r, 20) : 0 })}
                  />
                  <WRGJDelBtn onClick={() => setF({ holes: f.holes.filter((_, j) => j !== i) })} />
                </div>
                <div className="grid grid-cols-2 gap-1 text-[10px] text-zinc-500">
                  <label>Centro X<WRGJNumberField value={h.x} onChange={(v) => upd({ x: v })} /></label>
                  <label>Centro Y<WRGJNumberField value={h.y} onChange={(v) => upd({ y: v })} /></label>
                  {h.shape === 'rect' ? (
                    <>
                      <label>Ancho<WRGJNumberField value={h.w} min={1} onChange={(v) => upd({ w: v })} /></label>
                      <label>Alto<WRGJNumberField value={h.h} min={1} onChange={(v) => upd({ h: v })} /></label>
                      <label>Radio esq.<WRGJNumberField value={h.r} min={0} onChange={(v) => upd({ r: v })} /></label>
                    </>
                  ) : (
                    <label>Radio<WRGJNumberField value={h.r} min={1} onChange={(v) => upd({ r: v })} /></label>
                  )}
                </div>
              </div>
            );
          })}

          <WRGJListHeader title="Espigas" onAdd={() => setF({ tenons: [...f.tenons, { id: wrgjUid('t'), edge: 'w1', length: 25, size: Math.min(60, piece.width * 0.6), thickness: Math.max(4, piece.thickness / 3) }] })} />
          {f.tenons.map((t, i) => {
            const upd = (patch: Partial<typeof t>) => setF({ tenons: f.tenons.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
            return (
              <div key={t.id} className="space-y-1 rounded border border-line p-1.5">
                <div className="flex gap-1">
                  <WRGJSelect value={t.edge} options={wrgjEdgeKeyOpts} onChange={(v) => upd({ edge: v as WRGJEdgeKey })} />
                  <WRGJDelBtn onClick={() => setF({ tenons: f.tenons.filter((_, j) => j !== i) })} />
                </div>
                <div className="grid grid-cols-3 gap-1 text-[10px] text-zinc-500">
                  <label>Saliente<WRGJNumberField value={t.length} min={1} onChange={(v) => upd({ length: v })} /></label>
                  <label>Ancho<WRGJNumberField value={t.size} min={1} onChange={(v) => upd({ size: v })} /></label>
                  <label>Grosor<WRGJNumberField value={t.thickness} min={1} onChange={(v) => upd({ thickness: v })} /></label>
                </div>
              </div>
            );
          })}
          <div className="text-[10px] text-zinc-500">Las espigas se suman a la medida de corte. Los calados se miden desde la esquina inferior izquierda de la pieza.</div>
        </WRGJSection>
      )}
    </>
  );
}

function WRGJListHeader({ title, onAdd }: { title: string; onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between pt-1">
      <span className="text-[11px] font-semibold text-zinc-700">{title}</span>
      <WRGJBtn size="sm" variant="ghost" onClick={onAdd}>
        <Plus size={12} /> Agregar
      </WRGJBtn>
    </div>
  );
}

function WRGJDelBtn({ onClick }: { onClick: () => void }) {
  return (
    <WRGJBtn size="sm" variant="ghost" onClick={onClick} className="text-red-700">
      <Trash2 size={12} />
    </WRGJBtn>
  );
}

/** Esquema de la pieza con sus 4 cantos coloreados según grosor */
function WRGJEdgeDiagram({ piece }: { piece: { length: number; width: number; edges: Record<WRGJEdgeKey, number>; grain: boolean } }) {
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
