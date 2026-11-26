import { useState, type ReactNode } from 'react';
import { ArrowLeftRight, Grip, Hand, Layers3, PanelsTopLeft, Rows3 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { calcDrawer, calcDrawerFronts, calcHandle, calcHinges, calcShelves, convertLength, type HandlePosition } from '../core/calculators';
import { fmtLen, trimNum } from '../core/units';
import { NumberField, Row, Select, Toggle, cx } from './ui';

type CalcId = 'drawer' | 'shelves' | 'fronts' | 'handle' | 'hinge' | 'units';
const CALCS: { id: CalcId; name: string; icon: typeof Grip; desc: string }[] = [
  { id: 'drawer', name: 'Gavetas y cajones', icon: Rows3, desc: 'Laterales, frente interior, trasera y fondo con descuento de correderas.' },
  { id: 'shelves', name: 'Distribución de repisas', icon: Layers3, desc: 'Separación exacta entre repisas o perforaciones sistema 32.' },
  { id: 'fronts', name: 'Frentes de cajones', icon: PanelsTopLeft, desc: 'Alturas y anchos de múltiples frentes con luces uniformes.' },
  { id: 'handle', name: 'Manijas / tiradores', icon: Hand, desc: 'Coordenadas de perforación para tiradores y pomos.' },
  { id: 'hinge', name: 'Bisagras de cazoleta', icon: Grip, desc: 'Cantidad y posición de bisagras de 35 mm.' },
  { id: 'units', name: 'Conversor de unidades', icon: ArrowLeftRight, desc: 'mm ↔ cm ↔ pulgadas (decimal y fracción).' },
];

export default function CalculatorsView() {
  const [id, setId] = useState<CalcId>('drawer');
  const cur = CALCS.find((c) => c.id === id)!;
  return (
    <div className="flex h-full">
      <nav className="w-64 shrink-0 space-y-1 border-r border-line bg-panel p-2">
        <div className="px-2 py-2 text-xs font-semibold text-zinc-800">Calculadoras de taller</div>
        {CALCS.map((c) => (
          <button key={c.id} onClick={() => setId(c.id)} className={cx('flex w-full items-start gap-2 rounded-md px-2 py-2 text-left', id === c.id ? 'bg-accent/15 text-zinc-900' : 'text-zinc-700 hover:bg-line/50')}>
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
        {id === 'drawer' && <DrawerCalc />}
        {id === 'shelves' && <ShelvesCalc />}
        {id === 'fronts' && <FrontsCalc />}
        {id === 'handle' && <HandleCalc />}
        {id === 'hinge' && <HingeCalc />}
        {id === 'units' && <UnitsCalc />}
      </div>
    </div>
  );
}

function Layout({ form, result }: { form: ReactNode; result: ReactNode }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <div className="space-y-2 rounded-lg border border-line bg-panel p-4">{form}</div>
      <div className="space-y-4">{result}</div>
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
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

function Notes({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1 rounded-lg border border-line bg-panel2 p-3 text-xs text-zinc-700">
      {items.map((n, i) => (
        <li key={i}>• {n}</li>
      ))}
    </ul>
  );
}

function useL() {
  const unit = useStore((s) => s.unit);
  return (v: number) => fmtLen(v, unit);
}

// Gavetas
function DrawerCalc() {
  const L = useL();
  const [v, setV] = useState({ openingWidth: 564, depth: 540, boxHeight: 150, sideThickness: 15, bottomThickness: 5.5, slideClearance: 12.7, grooveDepth: 8, rearClearance: 10, bottomMode: 'clavado' as 'clavado' | 'ranura' });
  const set = (k: keyof typeof v) => (x: number) => setV({ ...v, [k]: x });
  const r = calcDrawer(v);
  return (
    <Layout
      form={
        <>
          <Row label="Ancho libre del hueco"><NumberField value={v.openingWidth} onChange={set('openingWidth')} /></Row>
          <Row label="Profundidad interior"><NumberField value={v.depth} onChange={set('depth')} /></Row>
          <Row label="Alto de la caja"><NumberField value={v.boxHeight} onChange={set('boxHeight')} /></Row>
          <Row label="Espesor laterales"><NumberField value={v.sideThickness} onChange={set('sideThickness')} /></Row>
          <Row label="Espesor fondo"><NumberField value={v.bottomThickness} onChange={set('bottomThickness')} /></Row>
          <Row label="Descuento corredera / lado"><NumberField value={v.slideClearance} onChange={set('slideClearance')} /></Row>
          <Row label="Holgura trasera"><NumberField value={v.rearClearance} onChange={set('rearClearance')} /></Row>
          <Row label="Fondo">
            <Select value={v.bottomMode} options={[{ value: 'clavado', label: 'Clavado por debajo' }, { value: 'ranura', label: 'En ranura' }]} onChange={(x) => setV({ ...v, bottomMode: x as 'clavado' | 'ranura' })} />
          </Row>
          {v.bottomMode === 'ranura' && <Row label="Profundidad de ranura"><NumberField value={v.grooveDepth} onChange={set('grooveDepth')} /></Row>}
        </>
      }
      result={
        <>
          <div className="grid grid-cols-3 gap-2">
            <Big label="Corredera" value={L(r.slideLength)} />
            <Big label="Ancho exterior caja" value={L(r.outerWidth)} />
            <Big label="Descuento total" value={L(r.totalDiscount)} />
          </div>
          <Table head={['Pieza', 'Cant.', 'Largo', 'Ancho', 'Espesor', 'Nota']} rows={r.parts.map((p) => [p.name, p.qty, L(p.length), L(p.width), L(p.thickness), p.note ?? ''])} />
          <Notes items={r.notes} />
        </>
      }
    />
  );
}

// Repisas
function ShelvesCalc() {
  const L = useL();
  const [v, setV] = useState({ innerHeight: 1764, spaces: 5, shelfThickness: 18, system32: true, firstHole: 37 });
  const r = calcShelves(v);
  const H = v.innerHeight;
  return (
    <Layout
      form={
        <>
          <Row label="Luz interna (alto libre)"><NumberField value={v.innerHeight} onChange={(x) => setV({ ...v, innerHeight: x })} /></Row>
          <Row label="Cantidad de espacios"><NumberField length={false} min={1} max={30} value={v.spaces} onChange={(x) => setV({ ...v, spaces: Math.round(x) })} /></Row>
          <Row label="Espesor de repisa"><NumberField value={v.shelfThickness} onChange={(x) => setV({ ...v, shelfThickness: x })} /></Row>
          <Row label="Perforaciones sistema 32"><Toggle value={v.system32} onChange={(x) => setV({ ...v, system32: x })} /></Row>
          {v.system32 && <Row label="Primer agujero desde abajo"><NumberField value={v.firstHole} onChange={(x) => setV({ ...v, firstHole: x })} /></Row>}
        </>
      }
      result={
        <>
          <div className="grid grid-cols-2 gap-2">
            <Big label="Espacio libre entre repisas" value={L(r.gap)} />
            <Big label="Repisas" value={String(r.shelves.length)} />
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_180px]">
            <Table
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
          <Notes items={[`Medidas desde la cara superior de la base interior.`, v.system32 ? `${r.holes.length} perforaciones Ø5 cada 32 mm por columna (4 columnas: 37 mm del frente y del fondo).` : 'Repisas fijas: perfore los laterales en las caras inferiores indicadas.']} />
        </>
      }
    />
  );
}

// Frentes
function FrontsCalc() {
  const L = useL();
  const [v, setV] = useState({ totalHeight: 770, totalWidth: 600, count: 4, gap: 3, topGap: 1.5, bottomGap: 1.5, sideGap: 1.5, mode: 'iguales' as 'iguales' | 'progresivo', ratio: 1.25 });
  const set = (k: keyof typeof v) => (x: number) => setV({ ...v, [k]: x });
  const r = calcDrawerFronts(v);
  const sc = 220 / Math.max(v.totalHeight, v.totalWidth);
  return (
    <Layout
      form={
        <>
          <Row label="Alto total del hueco"><NumberField value={v.totalHeight} onChange={set('totalHeight')} /></Row>
          <Row label="Ancho total"><NumberField value={v.totalWidth} onChange={set('totalWidth')} /></Row>
          <Row label="Cantidad de frentes"><NumberField length={false} min={1} max={12} value={v.count} onChange={(x) => setV({ ...v, count: Math.round(x) })} /></Row>
          <Row label="Luz entre frentes"><NumberField value={v.gap} onChange={set('gap')} /></Row>
          <Row label="Luz superior"><NumberField value={v.topGap} onChange={set('topGap')} /></Row>
          <Row label="Luz inferior"><NumberField value={v.bottomGap} onChange={set('bottomGap')} /></Row>
          <Row label="Luz lateral (c/lado)"><NumberField value={v.sideGap} onChange={set('sideGap')} /></Row>
          <Row label="Distribución">
            <Select value={v.mode} options={[{ value: 'iguales', label: 'Iguales' }, { value: 'progresivo', label: 'Progresiva' }]} onChange={(x) => setV({ ...v, mode: x as 'iguales' | 'progresivo' })} />
          </Row>
          {v.mode === 'progresivo' && <Row label="Factor de progresión"><NumberField length={false} step={0.05} min={1} max={3} value={v.ratio} onChange={set('ratio')} /></Row>}
        </>
      }
      result={
        <>
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <Table head={['Frente (de abajo a arriba)', 'Alto', 'Ancho', 'Borde inferior']} rows={r.fronts.map((f) => [`Frente ${f.index}`, L(f.height), L(f.width), L(f.y)])} />
            <svg width={v.totalWidth * sc + 20} height={v.totalHeight * sc + 20} className="rounded border border-line bg-panel2">
              <rect x={10} y={10} width={v.totalWidth * sc} height={v.totalHeight * sc} fill="none" stroke="#71717a" strokeDasharray="4 3" />
              {r.fronts.map((f) => (
                <g key={f.index}>
                  <rect x={10 + v.sideGap * sc} y={10 + (v.totalHeight - f.y - f.height) * sc} width={f.width * sc} height={f.height * sc} fill="#c8a27a" stroke="#27272a" />
                  <text x={10 + (v.totalWidth * sc) / 2} y={10 + (v.totalHeight - f.y - f.height / 2) * sc + 4} fontSize="11" textAnchor="middle" fill="#27272a">
                    {trimNum(f.height)}
                  </text>
                </g>
              ))}
            </svg>
          </div>
          <Notes items={[`Altura útil repartida: ${L(r.available)}.`, 'Use estas medidas también para los frentes de la cajonera del catálogo.']} />
        </>
      }
    />
  );
}

// Manijas
function HandleCalc() {
  const L = useL();
  const [v, setV] = useState({ frontWidth: 597, frontHeight: 180, centers: 128, position: 'centro' as HandlePosition, orientation: 'horizontal' as 'horizontal' | 'vertical', edgeOffset: 40 });
  const set = (k: keyof typeof v) => (x: number) => setV({ ...v, [k]: x });
  const r = calcHandle(v);
  const sc = 300 / Math.max(v.frontWidth, v.frontHeight);
  const W = v.frontWidth * sc;
  const H = v.frontHeight * sc;
  return (
    <Layout
      form={
        <>
          <Row label="Ancho del frente/puerta"><NumberField value={v.frontWidth} onChange={set('frontWidth')} /></Row>
          <Row label="Alto del frente/puerta"><NumberField value={v.frontHeight} onChange={set('frontHeight')} /></Row>
          <Row label="Distancia entre centros">
            <Select value={String(v.centers)} options={[0, 32, 64, 96, 128, 160, 192, 224, 256, 320].map((c) => ({ value: String(c), label: c === 0 ? 'Pomo (1 agujero)' : `${c} mm` }))} onChange={(x) => setV({ ...v, centers: Number(x) })} />
          </Row>
          <Row label="Posición">
            <Select
              value={v.position}
              options={[
                ['centro', 'Centrado'], ['superior', 'Superior centrado'], ['inferior', 'Inferior centrado'], ['izquierda', 'Lateral izquierdo'], ['derecha', 'Lateral derecho'],
                ['sup-izq', 'Esquina sup. izq.'], ['sup-der', 'Esquina sup. der.'], ['inf-izq', 'Esquina inf. izq.'], ['inf-der', 'Esquina inf. der.'],
              ].map(([value, label]) => ({ value, label }))}
              onChange={(x) => setV({ ...v, position: x as HandlePosition })}
            />
          </Row>
          <Row label="Orientación">
            <Select value={v.orientation} options={[{ value: 'horizontal', label: 'Horizontal' }, { value: 'vertical', label: 'Vertical' }]} onChange={(x) => setV({ ...v, orientation: x as 'horizontal' | 'vertical' })} />
          </Row>
          <Row label="Distancia al borde"><NumberField value={v.edgeOffset} onChange={set('edgeOffset')} /></Row>
        </>
      }
      result={
        <>
          <Table head={['Perforación', 'X (desde izquierda)', 'Y (desde abajo)']} rows={r.holes.map((h, i) => [`Agujero ${i + 1}`, L(h.x), L(h.y)])} />
          <svg width={W + 40} height={H + 40} className="rounded border border-line bg-panel2">
            <rect x={20} y={20} width={W} height={H} fill="#c8a27a" stroke="#27272a" />
            {r.holes.length === 2 && <line x1={20 + r.holes[0].x * sc} y1={20 + H - r.holes[0].y * sc} x2={20 + r.holes[1].x * sc} y2={20 + H - r.holes[1].y * sc} stroke="#3f3f46" strokeWidth={6} strokeLinecap="round" />}
            {r.holes.map((h, i) => (
              <circle key={i} cx={20 + h.x * sc} cy={20 + H - h.y * sc} r={4} fill="#ef4444" stroke="white" />
            ))}
          </svg>
          <Notes items={['Origen (0,0): esquina inferior izquierda vista de frente.', 'Broca típica Ø5 mm para tornillo M4.', ...r.warnings]} />
        </>
      }
    />
  );
}

// Bisagras
function HingeCalc() {
  const L = useL();
  const [v, setV] = useState({ doorHeight: 1800, doorWidth: 450, weight: 9, edgeDistance: 100, cupDiameter: 35, cupK: 4, cupDepth: 13 });
  const set = (k: keyof typeof v) => (x: number) => setV({ ...v, [k]: x });
  const r = calcHinges(v);
  const sc = 300 / v.doorHeight;
  return (
    <Layout
      form={
        <>
          <Row label="Alto de puerta"><NumberField value={v.doorHeight} onChange={set('doorHeight')} /></Row>
          <Row label="Ancho de puerta"><NumberField value={v.doorWidth} onChange={set('doorWidth')} /></Row>
          <Row label="Peso de puerta"><NumberField length={false} suffix="kg" value={v.weight} onChange={set('weight')} /></Row>
          <Row label="Distancia a bordes sup/inf"><NumberField value={v.edgeDistance} onChange={set('edgeDistance')} /></Row>
          <Row label="Diámetro de cazoleta"><NumberField value={v.cupDiameter} onChange={set('cupDiameter')} /></Row>
          <Row label="Distancia K (canto→cazoleta)"><NumberField value={v.cupK} onChange={set('cupK')} /></Row>
          <Row label="Profundidad de cazoleta"><NumberField value={v.cupDepth} onChange={set('cupDepth')} /></Row>
        </>
      }
      result={
        <>
          <div className="grid grid-cols-3 gap-2">
            <Big label="Bisagras" value={String(r.count)} />
            <Big label="Eje de cazoleta desde el canto" value={L(r.cupCenterX)} />
            <Big label="Profundidad" value={L(v.cupDepth)} />
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <Table head={['Bisagra', 'Centro desde abajo', 'Centro desde arriba']} rows={r.positions.map((p, i) => [`Bisagra ${i + 1}`, L(p), L(v.doorHeight - p)])} />
            <svg width={v.doorWidth * sc + 40} height={v.doorHeight * sc + 20} className="rounded border border-line bg-panel2">
              <rect x={20} y={10} width={v.doorWidth * sc} height={v.doorHeight * sc} fill="#c8a27a" stroke="#27272a" />
              {r.positions.map((p, i) => (
                <circle key={i} cx={20 + r.cupCenterX * sc} cy={10 + (v.doorHeight - p) * sc} r={Math.max(3, (v.cupDiameter / 2) * sc)} fill="#0ea5e9" stroke="white" />
              ))}
            </svg>
          </div>
          <Notes items={r.reasons} />
        </>
      }
    />
  );
}

// Conversor
function UnitsCalc() {
  const [val, setVal] = useState(18);
  const [from, setFrom] = useState<'mm' | 'cm' | 'in'>('mm');
  const r = convertLength(val, from);
  return (
    <Layout
      form={
        <>
          <Row label="Valor"><NumberField length={false} value={val} onChange={setVal} suffix={from} /></Row>
          <Row label="Unidad de origen">
            <Select value={from} options={[{ value: 'mm', label: 'Milímetros' }, { value: 'cm', label: 'Centímetros' }, { value: 'in', label: 'Pulgadas' }]} onChange={(x) => setFrom(x as 'mm' | 'cm' | 'in')} />
          </Row>
          <div className="text-[11px] text-zinc-500">Puede escribir fracciones: 3/4, 1 1/2.</div>
        </>
      }
      result={
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Big label="Milímetros" value={`${trimNum(r.mm, 2)} mm`} />
          <Big label="Centímetros" value={`${trimNum(r.cm, 3)} cm`} />
          <Big label="Metros" value={`${trimNum(r.m, 4)} m`} />
          <Big label="Pulgadas (decimal)" value={`${trimNum(r.in, 4)}"`} />
          <Big label="Fracción 1/16" value={r.frac16} />
          <Big label="Fracción 1/32" value={r.frac32} />
          <Big label="Fracción 1/64" value={r.frac64} />
          <Big label="Pies" value={`${trimNum(r.ft, 4)}'`} />
        </div>
      }
    />
  );
}

function Big({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel2 px-3 py-2">
      <div className="text-[11px] font-medium text-zinc-500">{label}</div>
      <div className="font-mono text-lg font-semibold text-accent">{value}</div>
    </div>
  );
}
