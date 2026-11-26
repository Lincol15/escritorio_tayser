/*
 * Proyecto:    Tayser 1.0.0
 * Archivo:     src/components/QuickOptimizerView.tsx
 * Autores:     LWYC, RCO, GDMS, JDAP
 * Descripción: Modo Optimizar plancha.
 */
import { useEffect, useState } from 'react';
import { Copy, Play, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { wrgjPackItems, type WRGJGroupOptimization, type WRGJPackItem } from '../core/optimizer';
import { wrgjFmtLen } from '../core/units';
import type { WRGJPackAlgorithm, WRGJSheetConfig } from '../core/types';
import { WRGJBtn, WRGJNumberField, WRGJRow, WRGJSelect, WRGJStat, WRGJTextField, WRGJToggle } from './ui';
import WRGJSheetSvg from './SheetSvg';

const WRGJ_STORAGE_KEY = 'tayser-quick-optimizer';

type WRGJBoardKind = 'melamina' | 'mdf' | 'mdp' | 'otro';

interface WRGJQuickPiece {
  id: string;
  name: string;
  length: number;
  width: number;
  qty: number;
  grain: boolean;
}

interface WRGJQuickState {
  kind: WRGJBoardKind;
  thickness: number;
  sheet: WRGJSheetConfig;
  pieces: WRGJQuickPiece[];
}

const WRGJ_KINDS: { value: WRGJBoardKind; label: string }[] = [
  { value: 'melamina', label: 'Melamina' },
  { value: 'mdf', label: 'MDF' },
  { value: 'mdp', label: 'MDP / aglomerado' },
  { value: 'otro', label: 'Otro tablero' },
];

// Medidas comerciales habituales (largo × ancho en mm)
const WRGJ_SIZES: { value: string; label: string; length: number; width: number }[] = [
  { value: '2440x2150', label: '2440 × 2150 (melamina estándar)', length: 2440, width: 2150 },
  { value: '2440x1830', label: '2440 × 1830 (MDF / MDP)', length: 2440, width: 1830 },
  { value: '2440x1220', label: '2440 × 1220 (4 × 8 pies)', length: 2440, width: 1220 },
  { value: '2750x1830', label: '2750 × 1830', length: 2750, width: 1830 },
  { value: '2800x2070', label: '2800 × 2070', length: 2800, width: 2070 },
];

let wrgjSeq = 0;
const wrgjNewId = () => `q${Date.now().toString(36)}${(wrgjSeq++).toString(36)}`;

const WRGJ_DEFAULT_STATE: WRGJQuickState = {
  kind: 'melamina',
  thickness: 18,
  sheet: { length: 2440, width: 2150, kerf: 4, trim: 10, algorithm: 'auto' },
  pieces: [
    { id: wrgjNewId(), name: 'Lateral', length: 720, width: 560, qty: 2, grain: true },
    { id: wrgjNewId(), name: 'Base / techo', length: 764, width: 560, qty: 2, grain: true },
    { id: wrgjNewId(), name: 'Repisa', length: 762, width: 540, qty: 2, grain: false },
  ],
};

function wrgjLoadState(): WRGJQuickState {
  try {
    const raw = localStorage.getItem(WRGJ_STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as WRGJQuickState;
      if (s && s.sheet && Array.isArray(s.pieces)) return { ...WRGJ_DEFAULT_STATE, ...s, sheet: { ...WRGJ_DEFAULT_STATE.sheet, ...s.sheet } };
    }
  } catch {
    /* estado corrupto: se usa el predeterminado */
  }
  return WRGJ_DEFAULT_STATE;
}

function wrgjRunOptimization(s: WRGJQuickState): WRGJGroupOptimization {
  const items: WRGJPackItem[] = [];
  s.pieces.forEach((p, i) => {
    if (p.length <= 0 || p.width <= 0 || p.qty <= 0) return;
    const code = `P${i + 1}`;
    for (let q = 0; q < p.qty; q++) {
      items.push({ uid: `${code}-${q + 1}`, code, name: p.name || code, w: p.length, h: p.width, canRotate: !p.grain, grain: p.grain });
    }
  });
  const res = wrgjPackItems(items, s.sheet);
  const sheetArea = s.sheet.length * s.sheet.width;
  const usedArea = res.sheets.reduce((a, x) => a + x.usedArea, 0);
  const total = sheetArea * res.sheets.length;
  const kindLabel = WRGJ_KINDS.find((k) => k.value === s.kind)?.label ?? 'Tablero';
  return {
    key: 'quick', letter: 'Q', materialId: s.kind, materialName: kindLabel, thickness: s.thickness,
    sheets: res.sheets, unplaced: res.unplaced, utilization: total ? usedArea / total : 0, usedArea,
    sheetArea: total, wasteArea: total - usedArea, algorithm: res.label,
    sheetLength: s.sheet.length, sheetWidth: s.sheet.width, trim: s.sheet.trim,
  };
}

export default function WRGJQuickOptimizerView() {
  const unit = useStore((s) => s.unit);
  const [state, setState] = useState<WRGJQuickState>(wrgjLoadState);
  const [result, setResult] = useState<WRGJGroupOptimization | null>(null);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    localStorage.setItem(WRGJ_STORAGE_KEY, JSON.stringify(state));
    if (result) setStale(true);
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (patch: Partial<WRGJQuickState>) => setState((s) => ({ ...s, ...patch }));
  const setSheet = (patch: Partial<WRGJSheetConfig>) => setState((s) => ({ ...s, sheet: { ...s.sheet, ...patch } }));
  const setPiece = (id: string, patch: Partial<WRGJQuickPiece>) => setState((s) => ({ ...s, pieces: s.pieces.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  const addPiece = () => setState((s) => ({ ...s, pieces: [...s.pieces, { id: wrgjNewId(), name: `Pieza ${s.pieces.length + 1}`, length: 600, width: 400, qty: 1, grain: false }] }));
  const dupPiece = (id: string) =>
    setState((s) => {
      const i = s.pieces.findIndex((p) => p.id === id);
      const copy = { ...s.pieces[i], id: wrgjNewId() };
      return { ...s, pieces: [...s.pieces.slice(0, i + 1), copy, ...s.pieces.slice(i + 1)] };
    });
  const delPiece = (id: string) => setState((s) => ({ ...s, pieces: s.pieces.filter((p) => p.id !== id) }));
  const clearAll = () => {
    if (window.confirm('¿Borrar todas las piezas de la lista?')) setState((s) => ({ ...s, pieces: [] }));
  };

  const play = () => {
    setResult(wrgjRunOptimization(state));
    setStale(false);
  };

  const sizeValue = WRGJ_SIZES.find((z) => z.length === state.sheet.length && z.width === state.sheet.width)?.value ?? 'custom';
  const totalPieces = state.pieces.reduce((a, p) => a + (p.qty > 0 ? p.qty : 0), 0);
  const L = (v: number) => wrgjFmtLen(v, unit, false);

  return (
    <div className="flex h-full">
      {/* Formulario */}
      <aside className="scroll-thin w-[460px] shrink-0 space-y-4 overflow-y-auto border-r border-line bg-panel p-4">
        <div>
          <h2 className="text-lg font-semibold">Optimizar plancha</h2>
          <p className="text-xs text-zinc-600">Ingresa la plancha y tus piezas, luego presiona ▶ Optimizar para ver cómo se acomodan.</p>
        </div>

        <div className="space-y-2 rounded-lg border border-line bg-panel2 p-3">
          <div className="text-xs font-semibold text-zinc-800">1. Plancha</div>
          <WRGJRow label="Material">
            <WRGJSelect value={state.kind} options={WRGJ_KINDS} onChange={(v) => update({ kind: v as WRGJBoardKind })} />
          </WRGJRow>
          <WRGJRow label="Medida comercial">
            <WRGJSelect
              value={sizeValue}
              options={[...WRGJ_SIZES.map((z) => ({ value: z.value, label: z.label })), { value: 'custom', label: 'Personalizada' }]}
              onChange={(v) => {
                const z = WRGJ_SIZES.find((x) => x.value === v);
                if (z) setSheet({ length: z.length, width: z.width });
              }}
            />
          </WRGJRow>
          <WRGJRow label="Largo de plancha (veta)">
            <WRGJNumberField value={state.sheet.length} min={100} onChange={(v) => setSheet({ length: v })} />
          </WRGJRow>
          <WRGJRow label="Ancho de plancha">
            <WRGJNumberField value={state.sheet.width} min={100} onChange={(v) => setSheet({ width: v })} />
          </WRGJRow>
          <WRGJRow label="Espesor">
            <WRGJNumberField value={state.thickness} min={1} max={60} onChange={(v) => update({ thickness: v })} />
          </WRGJRow>
          <WRGJRow label="Espesor de sierra" hint="Lo que se come el disco en cada corte">
            <WRGJNumberField value={state.sheet.kerf} min={0} max={10} onChange={(v) => setSheet({ kerf: v })} />
          </WRGJRow>
          <WRGJRow label="Refilado por borde" hint="Margen que se recorta en cada borde de la plancha">
            <WRGJNumberField value={state.sheet.trim} min={0} max={50} onChange={(v) => setSheet({ trim: v })} />
          </WRGJRow>
          <WRGJRow label="Algoritmo">
            <WRGJSelect
              value={state.sheet.algorithm}
              options={[
                { value: 'auto', label: 'Automático (mejor)' },
                { value: 'guillotine', label: 'Guillotina (sierra)' },
                { value: 'maxrects', label: 'MaxRects' },
              ]}
              onChange={(v) => setSheet({ algorithm: v as WRGJPackAlgorithm })}
            />
          </WRGJRow>
        </div>

        <div className="space-y-2 rounded-lg border border-line bg-panel2 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-800">
              2. Piezas <span className="font-normal text-zinc-500">({totalPieces} en total)</span>
            </span>
            <WRGJBtn size="sm" variant="ghost" onClick={clearAll} disabled={!state.pieces.length} title="Borrar todas">
              <RotateCcw size={13} /> Limpiar
            </WRGJBtn>
          </div>
          <div className="grid grid-cols-[1fr_84px_84px_48px_34px_52px] items-center gap-1 text-[10px] font-medium text-zinc-500">
            <span>Nombre</span>
            <span>Largo</span>
            <span>Ancho</span>
            <span>Cant.</span>
            <span title="Con veta: no se gira la pieza">Veta</span>
            <span />
          </div>
          {state.pieces.map((p, i) => (
            <div key={p.id} className="grid grid-cols-[1fr_84px_84px_48px_34px_52px] items-center gap-1">
              <div className="flex items-center gap-1">
                <span className="w-6 shrink-0 font-mono text-[10px] font-semibold text-accent">P{i + 1}</span>
                <WRGJTextField value={p.name} onChange={(v) => setPiece(p.id, { name: v })} />
              </div>
              <WRGJNumberField value={p.length} min={1} onChange={(v) => setPiece(p.id, { length: v })} />
              <WRGJNumberField value={p.width} min={1} onChange={(v) => setPiece(p.id, { width: v })} />
              <WRGJNumberField value={p.qty} length={false} min={1} max={999} step={1} onChange={(v) => setPiece(p.id, { qty: Math.round(v) })} />
              <WRGJToggle value={p.grain} onChange={(v) => setPiece(p.id, { grain: v })} />
              <div className="flex">
                <WRGJBtn size="sm" variant="ghost" className="px-1" title="Duplicar" onClick={() => dupPiece(p.id)}>
                  <Copy size={13} />
                </WRGJBtn>
                <WRGJBtn size="sm" variant="ghost" className="px-1 text-red-600" title="Eliminar" onClick={() => delPiece(p.id)}>
                  <Trash2 size={13} />
                </WRGJBtn>
              </div>
            </div>
          ))}
          {!state.pieces.length && <div className="py-3 text-center text-xs text-zinc-500">Sin piezas. Agrega la primera.</div>}
          <WRGJBtn size="sm" className="w-full" onClick={addPiece}>
            <Plus size={14} /> Agregar pieza
          </WRGJBtn>
          <p className="text-[10px] leading-tight text-zinc-500">El largo va en el sentido de la veta de la plancha. Si activas «Veta», la pieza no se gira 90°. Los campos aceptan operaciones, p. ej. 1220/2-18.</p>
        </div>

        <WRGJBtn variant="primary" className="h-10 w-full text-base" onClick={play} disabled={!totalPieces}>
          <Play size={18} /> Optimizar
        </WRGJBtn>
      </aside>

      {/* Resultado */}
      <section className="scroll-thin min-w-0 flex-1 overflow-y-auto p-4">
        {!result ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-zinc-500">
            <Play size={40} className="mb-3 text-accent" />
            <div className="text-sm">Configura la plancha y las piezas, luego presiona <b>Optimizar</b>.</div>
          </div>
        ) : (
          <div className="space-y-4">
            {stale && (
              <div className="flex items-center justify-between rounded border border-amber-300 bg-amber-500/10 px-3 py-2 text-xs text-amber-800">
                Cambiaste datos después de optimizar. El plano mostrado no está actualizado.
                <WRGJBtn size="sm" variant="primary" onClick={play}>
                  <Play size={13} /> Volver a optimizar
                </WRGJBtn>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <WRGJStat label="Planchas necesarias" value={String(result.sheets.length)} sub={`${result.materialName} ${wrgjFmtLen(result.sheetLength, unit)} × ${wrgjFmtLen(result.sheetWidth, unit)} · ${wrgjFmtLen(result.thickness, unit)}`} />
              <WRGJStat label="Piezas colocadas" value={String(result.sheets.reduce((a, s) => a + s.placements.length, 0))} sub={result.unplaced.length ? `${result.unplaced.length} no caben` : 'todas colocadas'} tone={result.unplaced.length ? 'warn' : 'good'} />
              <WRGJStat label="Aprovechamiento" value={result.sheetArea ? `${(result.utilization * 100).toFixed(1)} %` : '—'} tone={result.utilization > 0.75 ? 'good' : 'warn'} sub={result.algorithm} />
              <WRGJStat label="Desperdicio" value={`${(result.wasteArea / 1e6).toFixed(2)} m²`} sub={`piezas: ${(result.usedArea / 1e6).toFixed(2)} m²`} />
            </div>
            {result.unplaced.length > 0 && (
              <div className="rounded border border-red-300 bg-red-500/10 p-2 text-xs text-red-700">
                {result.unplaced.length} pieza(s) no caben en la plancha: {result.unplaced.map((u) => `${u.code} ${u.name} (${L(u.w)}×${L(u.h)})`).join(', ')}
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
              {result.sheets.map((s, i) => (
                <WRGJSheetSvg key={i} opt={result} sheet={s} index={i} unit={unit} />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
