/*
 * Proyecto:    Tayser 1.0.0
 * Archivo:     src/components/CalculatorsView.tsx
 * Autores:     LWYC, RCO, GDMS, JDAP
 * Descripción: Modo Calculadoras.
 */
import { useState, type ReactNode } from 'react';
import { ArrowLeftRight, Grip, Hand, Layers3, PanelsTopLeft, Rows3 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { wrgjCalcDrawer, wrgjCalcDrawerFronts, wrgjCalcHandle, wrgjCalcHinges, wrgjCalcShelves, wrgjConvertLength, type WRGJHandlePosition } from '../core/calculators';
import { wrgjFmtLen, wrgjTrimNum } from '../core/units';
import { WRGJNumberField, WRGJRow, WRGJSelect, WRGJToggle, wrgjCx } from './ui';

type WRGJCalcId = 'drawer' | 'shelves' | 'fronts' | 'handle' | 'hinge' | 'units';
const WRGJ_CALCS: { id: WRGJCalcId; name: string; icon: typeof Grip; desc: string }[] = [
  { id: 'drawer', name: 'Gavetas y cajones', icon: Rows3, desc: 'Laterales, frente interior, trasera y fondo con descuento de correderas.' },
  { id: 'shelves', name: 'Distribución de repisas', icon: Layers3, desc: 'Separación exacta entre repisas o perforaciones sistema 32.' },
  { id: 'fronts', name: 'Frentes de cajones', icon: PanelsTopLeft, desc: 'Alturas y anchos de múltiples frentes con luces uniformes.' },
  { id: 'handle', name: 'Manijas / tiradores', icon: Hand, desc: 'Coordenadas de perforación para tiradores y pomos.' },
  { id: 'hinge', name: 'Bisagras de cazoleta', icon: Grip, desc: 'Cantidad y posición de bisagras de 35 mm.' },
  { id: 'units', name: 'Conversor de unidades', icon: ArrowLeftRight, desc: 'mm ↔ cm ↔ pulgadas (decimal y fracción).' },
];

export default function WRGJCalculatorsView() {
  const [id, setId] = useState<WRGJCalcId>('drawer');
  const cur = WRGJ_CALCS.find((c) => c.id === id)!;
  return (
    <div className="flex h-full">
      <nav className="w-64 shrink-0 space-y-1 border-r border-line bg-panel p-2">
        <div className="px-2 py-2 text-xs font-semibold text-zinc-800">Calculadoras de taller</div>
        {WRGJ_CALCS.map((c) => (
          <button key={c.id} onClick={() => setId(c.id)} className={wrgjCx('flex w-full items-start gap-2 rounded-md px-2 py-2 text-left', id === c.id ? 'bg-accent/15 text-zinc-900' : 'text-zinc-700 hover:bg-line/50')}>
            <c.icon size={16} className="mt-0.5 shrink-0 text-accent" />
            <span>
              <span className="block text-sm">{c.name}</span>
              <span className="block text-[11px] leading-tight text-zinc-500">{c.desc}</span>
            </span>
          </button>
        ))}
      </nav>
      <div className="scroll-thin flex-1 overflow-y-auto p-6">
        <h2 className="mb-1 text-lg font-semibold">{cur.name}</h2>
        <p className="mb-5 text-sm text-zinc-600">{cur.desc} Todas las medidas se muestran en la unidad activa de la barra superior.</p>
        {id === 'drawer' && <WRGJDrawerCalc />}
        {id === 'shelves' && <WRGJShelvesCalc />}
        {id === 'fronts' && <WRGJFrontsCalc />}
        {id === 'handle' && <WRGJHandleCalc />}
        {id === 'hinge' && <WRGJHingeCalc />}
        {id === 'units' && <WRGJUnitsCalc />}
      </div>
    </div>
  );
}

function WRGJLayout({ form, result }: { form: ReactNode; result: ReactNode }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <div className="space-y-2 rounded-lg border border-line bg-panel p-4">{form}</div>
      <div className="space-y-4">{result}</div>
    </div>
  );
}

function WRGJTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <table className="cut w-full">
        <thead>
          <tr>{head.map((h) => <th key={h}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>{r.map((c, j) => <td key={j} className={j > 0 ? 'font-mono' : ''}>{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WRGJNotes({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1 rounded-lg border border-line bg-panel2 p-3 text-xs text-zinc-700">
      {items.map((n, i) => (
        <li key={i}>• {n}</li>
      ))}
    </ul>
  );
}

function wrgjUseL() {
  const unit = useStore((s) => s.unit);
  return (v: number) => wrgjFmtLen(v, unit);
}

// Gavetas
function WRGJDrawerCalc() {
  const L = wrgjUseL();
  const [v, setV] = useState({ openingWidth: 564, depth: 540, boxHeight: 150, sideThickness: 15, bottomThickness: 5.5, slideClearance: 12.7, grooveDepth: 8, rearClearance: 10, bottomMode: 'clavado' as 'clavado' | 'ranura' });
  const set = (k: keyof typeof v) => (x: number) => setV({ ...v, [k]: x });
  const r = wrgjCalcDrawer(v);
  return (
    <WRGJLayout
      form={
        <>
          <WRGJRow label="Ancho libre del hueco"><WRGJNumberField value={v.openingWidth} onChange={set('openingWidth')} /></WRGJRow>
          <WRGJRow label="Profundidad interior"><WRGJNumberField value={v.depth} onChange={set('depth')} /></WRGJRow>
          <WRGJRow label="Alto de la caja"><WRGJNumberField value={v.boxHeight} onChange={set('boxHeight')} /></WRGJRow>
          <WRGJRow label="Espesor laterales"><WRGJNumberField value={v.sideThickness} onChange={set('sideThickness')} /></WRGJRow>
          <WRGJRow label="Espesor fondo"><WRGJNumberField value={v.bottomThickness} onChange={set('bottomThickness')} /></WRGJRow>
          <WRGJRow label="Descuento corredera / lado"><WRGJNumberField value={v.slideClearance} onChange={set('slideClearance')} /></WRGJRow>
          <WRGJRow label="Holgura trasera"><WRGJNumberField value={v.rearClearance} onChange={set('rearClearance')} /></WRGJRow>
          <WRGJRow label="Fondo">
            <WRGJSelect value={v.bottomMode} options={[{ value: 'clavado', label: 'Clavado por debajo' }, { value: 'ranura', label: 'En ranura' }]} onChange={(x) => setV({ ...v, bottomMode: x as 'clavado' | 'ranura' })} />
          </WRGJRow>
          {v.bottomMode === 'ranura' && <WRGJRow label="Profundidad de ranura"><WRGJNumberField value={v.grooveDepth} onChange={set('grooveDepth')} /></WRGJRow>}
        </>
      }
      result={
        <>
          <div className="grid grid-cols-3 gap-2">
            <WRGJBig label="Corredera" value={L(r.slideLength)} />
            <WRGJBig label="Ancho exterior caja" value={L(r.outerWidth)} />
            <WRGJBig label="Descuento total" value={L(r.totalDiscount)} />
          </div>
          <WRGJTable head={['Pieza', 'Cant.', 'Largo', 'Ancho', 'Espesor', 'Nota']} rows={r.parts.map((p) => [p.name, p.qty, L(p.length), L(p.width), L(p.thickness), p.note ?? ''])} />
          <WRGJNotes items={r.notes} />
        </>
      }
    />
  );
}

// Repisas
function WRGJShelvesCalc() {
  const L = wrgjUseL();
  const [v, setV] = useState({ innerHeight: 1764, spaces: 5, shelfThickness: 18, system32: true, firstHole: 37 });
  const r = wrgjCalcShelves(v);
  const H = v.innerHeight;
  return (
    <WRGJLayout
      form={
        <>
          <WRGJRow label="Luz interna (alto libre)"><WRGJNumberField value={v.innerHeight} onChange={(x) => setV({ ...v, innerHeight: x })} /></WRGJRow>
          <WRGJRow label="Cantidad de espacios"><WRGJNumberField length={false} min={1} max={30} value={v.spaces} onChange={(x) => setV({ ...v, spaces: Math.round(x) })} /></WRGJRow>
          <WRGJRow label="Espesor de repisa"><WRGJNumberField value={v.shelfThickness} onChange={(x) => setV({ ...v, shelfThickness: x })} /></WRGJRow>
          <WRGJRow label="Perforaciones sistema 32"><WRGJToggle value={v.system32} onChange={(x) => setV({ ...v, system32: x })} /></WRGJRow>
          {v.system32 && <WRGJRow label="Primer agujero desde abajo"><WRGJNumberField value={v.firstHole} onChange={(x) => setV({ ...v, firstHole: x })} /></WRGJRow>}
        </>
      }
      result={
        <>
          <div className="grid grid-cols-2 gap-2">
            <WRGJBig label="Espacio libre entre repisas" value={L(r.gap)} />
            <WRGJBig label="Repisas" value={String(r.shelves.length)} />
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_180px]">
            <WRGJTable
              head={['Repisa', 'Cara inferior', 'Centro', 'Cara superior', ...(v.system32 ? ['Agujero (sist. 32)'] : [])]}
              rows={r.shelves.map((s) => [`Repisa ${s.index}`, L(s.bottom), L(s.center), L(s.top), ...(v.system32 ? [s.hole !== undefined ? L(s.hole) : '—'] : [])])}
            />
            <svg viewBox={`-20 -10 140 ${H / 8 + 20}`} className="max-h-96 w-full rounded border border-line bg-panel2">
              <rect x={0} y={0} width={100} height={H / 8} fill="none" stroke="#7a807a" />
              {r.shelves.map((s) => (
                <rect key={s.index} x={0} y={(H - s.top) / 8} width={100} height={Math.max(1, v.shelfThickness / 8)} fill="#f59e0b" />
              ))}
              {r.holes.map((h) => (
                <circle key={h} cx={108} cy={(H - h) / 8} r={1.2} fill="#38bdf8" />
              ))}
            </svg>
          </div>
          <WRGJNotes items={[`Medidas desde la cara superior de la base interior.`, v.system32 ? `${r.holes.length} perforaciones Ø5 cada 32 mm por columna (4 columnas: 37 mm del frente y del fondo).` : 'Repisas fijas: perfore los laterales en las caras inferiores indicadas.']} />
        </>
      }
    />
  );
}

// Frentes
function WRGJFrontsCalc() {
  const L = wrgjUseL();
  const [v, setV] = useState({ totalHeight: 770, totalWidth: 600, count: 4, gap: 3, topGap: 1.5, bottomGap: 1.5, sideGap: 1.5, mode: 'iguales' as 'iguales' | 'progresivo', ratio: 1.25 });
  const set = (k: keyof typeof v) => (x: number) => setV({ ...v, [k]: x });
  const r = wrgjCalcDrawerFronts(v);
  const sc = 220 / Math.max(v.totalHeight, v.totalWidth);
  return (
    <WRGJLayout
      form={
        <>
          <WRGJRow label="Alto total del hueco"><WRGJNumberField value={v.totalHeight} onChange={set('totalHeight')} /></WRGJRow>
          <WRGJRow label="Ancho total"><WRGJNumberField value={v.totalWidth} onChange={set('totalWidth')} /></WRGJRow>
          <WRGJRow label="Cantidad de frentes"><WRGJNumberField length={false} min={1} max={12} value={v.count} onChange={(x) => setV({ ...v, count: Math.round(x) })} /></WRGJRow>
          <WRGJRow label="Luz entre frentes"><WRGJNumberField value={v.gap} onChange={set('gap')} /></WRGJRow>
          <WRGJRow label="Luz superior"><WRGJNumberField value={v.topGap} onChange={set('topGap')} /></WRGJRow>
          <WRGJRow label="Luz inferior"><WRGJNumberField value={v.bottomGap} onChange={set('bottomGap')} /></WRGJRow>
          <WRGJRow label="Luz lateral (c/lado)"><WRGJNumberField value={v.sideGap} onChange={set('sideGap')} /></WRGJRow>
          <WRGJRow label="Distribución">
            <WRGJSelect value={v.mode} options={[{ value: 'iguales', label: 'Iguales' }, { value: 'progresivo', label: 'Progresiva' }]} onChange={(x) => setV({ ...v, mode: x as 'iguales' | 'progresivo' })} />
          </WRGJRow>
          {v.mode === 'progresivo' && <WRGJRow label="Factor de progresión"><WRGJNumberField length={false} step={0.05} min={1} max={3} value={v.ratio} onChange={set('ratio')} /></WRGJRow>}
        </>
      }
      result={
        <>
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <WRGJTable head={['Frente (de abajo a arriba)', 'Alto', 'Ancho', 'Borde inferior']} rows={r.fronts.map((f) => [`Frente ${f.index}`, L(f.height), L(f.width), L(f.y)])} />
            <svg width={v.totalWidth * sc + 20} height={v.totalHeight * sc + 20} className="rounded border border-line bg-panel2">
              <rect x={10} y={10} width={v.totalWidth * sc} height={v.totalHeight * sc} fill="none" stroke="#71717a" strokeDasharray="4 3" />
              {r.fronts.map((f) => (
                <g key={f.index}>
                  <rect x={10 + v.sideGap * sc} y={10 + (v.totalHeight - f.y - f.height) * sc} width={f.width * sc} height={f.height * sc} fill="#c8a27a" stroke="#27272a" />
                  <text x={10 + (v.totalWidth * sc) / 2} y={10 + (v.totalHeight - f.y - f.height / 2) * sc + 4} fontSize="11" textAnchor="middle" fill="#27272a">
                    {wrgjTrimNum(f.height)}
                  </text>
                </g>
              ))}
            </svg>
          </div>
          <WRGJNotes items={[`Altura útil repartida: ${L(r.available)}.`, 'Use estas medidas también para los frentes de la cajonera del catálogo.']} />
        </>
      }
    />
  );
}

// Manijas
function WRGJHandleCalc() {
  const L = wrgjUseL();
  const [v, setV] = useState({ frontWidth: 597, frontHeight: 180, centers: 128, position: 'centro' as WRGJHandlePosition, orientation: 'horizontal' as 'horizontal' | 'vertical', edgeOffset: 40 });
  const set = (k: keyof typeof v) => (x: number) => setV({ ...v, [k]: x });
  const r = wrgjCalcHandle(v);
  const sc = 300 / Math.max(v.frontWidth, v.frontHeight);
  const W = v.frontWidth * sc;
  const H = v.frontHeight * sc;
  return (
    <WRGJLayout
      form={
        <>
          <WRGJRow label="Ancho del frente/puerta"><WRGJNumberField value={v.frontWidth} onChange={set('frontWidth')} /></WRGJRow>
          <WRGJRow label="Alto del frente/puerta"><WRGJNumberField value={v.frontHeight} onChange={set('frontHeight')} /></WRGJRow>
          <WRGJRow label="Distancia entre centros">
            <WRGJSelect value={String(v.centers)} options={[0, 32, 64, 96, 128, 160, 192, 224, 256, 320].map((c) => ({ value: String(c), label: c === 0 ? 'Pomo (1 agujero)' : `${c} mm` }))} onChange={(x) => setV({ ...v, centers: Number(x) })} />
          </WRGJRow>
          <WRGJRow label="Posición">
            <WRGJSelect
              value={v.position}
              options={[
                ['centro', 'Centrado'], ['superior', 'Superior centrado'], ['inferior', 'Inferior centrado'], ['izquierda', 'Lateral izquierdo'], ['derecha', 'Lateral derecho'],
                ['sup-izq', 'Esquina sup. izq.'], ['sup-der', 'Esquina sup. der.'], ['inf-izq', 'Esquina inf. izq.'], ['inf-der', 'Esquina inf. der.'],
              ].map(([value, label]) => ({ value, label }))}
              onChange={(x) => setV({ ...v, position: x as WRGJHandlePosition })}
            />
          </WRGJRow>
          <WRGJRow label="Orientación">
            <WRGJSelect value={v.orientation} options={[{ value: 'horizontal', label: 'Horizontal' }, { value: 'vertical', label: 'Vertical' }]} onChange={(x) => setV({ ...v, orientation: x as 'horizontal' | 'vertical' })} />
          </WRGJRow>
          <WRGJRow label="Distancia al borde"><WRGJNumberField value={v.edgeOffset} onChange={set('edgeOffset')} /></WRGJRow>
        </>
      }
      result={
        <>
          <WRGJTable head={['Perforación', 'X (desde izquierda)', 'Y (desde abajo)']} rows={r.holes.map((h, i) => [`Agujero ${i + 1}`, L(h.x), L(h.y)])} />
          <svg width={W + 40} height={H + 40} className="rounded border border-line bg-panel2">
            <rect x={20} y={20} width={W} height={H} fill="#c8a27a" stroke="#27272a" />
            {r.holes.length === 2 && <line x1={20 + r.holes[0].x * sc} y1={20 + H - r.holes[0].y * sc} x2={20 + r.holes[1].x * sc} y2={20 + H - r.holes[1].y * sc} stroke="#3f3f46" strokeWidth={6} strokeLinecap="round" />}
            {r.holes.map((h, i) => (
              <circle key={i} cx={20 + h.x * sc} cy={20 + H - h.y * sc} r={4} fill="#ef4444" stroke="white" />
            ))}
          </svg>
          <WRGJNotes items={['Origen (0,0): esquina inferior izquierda vista de frente.', 'Broca típica Ø5 mm para tornillo M4.', ...r.warnings]} />
        </>
      }
    />
  );
}

// Bisagras
function WRGJHingeCalc() {
  const L = wrgjUseL();
  const [v, setV] = useState({ doorHeight: 1800, doorWidth: 450, weight: 9, edgeDistance: 100, cupDiameter: 35, cupK: 4, cupDepth: 13 });
  const set = (k: keyof typeof v) => (x: number) => setV({ ...v, [k]: x });
  const r = wrgjCalcHinges(v);
  const sc = 300 / v.doorHeight;
  return (
    <WRGJLayout
      form={
        <>
          <WRGJRow label="Alto de puerta"><WRGJNumberField value={v.doorHeight} onChange={set('doorHeight')} /></WRGJRow>
          <WRGJRow label="Ancho de puerta"><WRGJNumberField value={v.doorWidth} onChange={set('doorWidth')} /></WRGJRow>
          <WRGJRow label="Peso de puerta"><WRGJNumberField length={false} suffix="kg" value={v.weight} onChange={set('weight')} /></WRGJRow>
          <WRGJRow label="Distancia a bordes sup/inf"><WRGJNumberField value={v.edgeDistance} onChange={set('edgeDistance')} /></WRGJRow>
          <WRGJRow label="Diámetro de cazoleta"><WRGJNumberField value={v.cupDiameter} onChange={set('cupDiameter')} /></WRGJRow>
          <WRGJRow label="Distancia K (canto→cazoleta)"><WRGJNumberField value={v.cupK} onChange={set('cupK')} /></WRGJRow>
          <WRGJRow label="Profundidad de cazoleta"><WRGJNumberField value={v.cupDepth} onChange={set('cupDepth')} /></WRGJRow>
        </>
      }
      result={
        <>
          <div className="grid grid-cols-3 gap-2">
            <WRGJBig label="Bisagras" value={String(r.count)} />
            <WRGJBig label="Eje de cazoleta desde el canto" value={L(r.cupCenterX)} />
            <WRGJBig label="Profundidad" value={L(v.cupDepth)} />
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <WRGJTable head={['Bisagra', 'Centro desde abajo', 'Centro desde arriba']} rows={r.positions.map((p, i) => [`Bisagra ${i + 1}`, L(p), L(v.doorHeight - p)])} />
            <svg width={v.doorWidth * sc + 40} height={v.doorHeight * sc + 20} className="rounded border border-line bg-panel2">
              <rect x={20} y={10} width={v.doorWidth * sc} height={v.doorHeight * sc} fill="#c8a27a" stroke="#27272a" />
              {r.positions.map((p, i) => (
                <circle key={i} cx={20 + r.cupCenterX * sc} cy={10 + (v.doorHeight - p) * sc} r={Math.max(3, (v.cupDiameter / 2) * sc)} fill="#0ea5e9" stroke="white" />
              ))}
            </svg>
          </div>
          <WRGJNotes items={r.reasons} />
        </>
      }
    />
  );
}

// Conversor
function WRGJUnitsCalc() {
  const [val, setVal] = useState(18);
  const [from, setFrom] = useState<'mm' | 'cm' | 'in'>('mm');
  const r = wrgjConvertLength(val, from);
  return (
    <WRGJLayout
      form={
        <>
          <WRGJRow label="Valor"><WRGJNumberField length={false} value={val} onChange={setVal} suffix={from} /></WRGJRow>
          <WRGJRow label="Unidad de origen">
            <WRGJSelect value={from} options={[{ value: 'mm', label: 'Milímetros' }, { value: 'cm', label: 'Centímetros' }, { value: 'in', label: 'Pulgadas' }]} onChange={(x) => setFrom(x as 'mm' | 'cm' | 'in')} />
          </WRGJRow>
          <div className="text-[11px] text-zinc-500">Puede escribir fracciones: 3/4, 1 1/2.</div>
        </>
      }
      result={
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <WRGJBig label="Milímetros" value={`${wrgjTrimNum(r.mm, 2)} mm`} />
          <WRGJBig label="Centímetros" value={`${wrgjTrimNum(r.cm, 3)} cm`} />
          <WRGJBig label="Metros" value={`${wrgjTrimNum(r.m, 4)} m`} />
          <WRGJBig label="Pulgadas (decimal)" value={`${wrgjTrimNum(r.in, 4)}"`} />
          <WRGJBig label="Fracción 1/16" value={r.frac16} />
          <WRGJBig label="Fracción 1/32" value={r.frac32} />
          <WRGJBig label="Fracción 1/64" value={r.frac64} />
          <WRGJBig label="Pies" value={`${wrgjTrimNum(r.ft, 4)}'`} />
        </div>
      }
    />
  );
}

function WRGJBig({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel2 px-3 py-2">
      <div className="text-[11px] font-medium text-zinc-500">{label}</div>
      <div className="font-mono text-lg font-semibold text-accent">{value}</div>
    </div>
  );
}
