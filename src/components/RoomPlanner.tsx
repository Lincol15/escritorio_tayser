import { useMemo, useRef, useState } from 'react';
import { create } from 'zustand';
import { Crosshair, DoorOpen, ImagePlus, MousePointerClick, Ruler, Send, Sparkles, SquareDashed, Trash2, AppWindow, RotateCcw, Plus } from 'lucide-react';
import { useStore } from '../store/useStore';
import { applyH, computeHomography, type H3, type Pt } from '../core/homography';
import {
  FURNITURE_INFO, WALL_LABEL, WALLS, defaultFurniture, doorSwing, planRoom, roomToScene,
  type FurnitureReq, type Obstacle, type ObstacleType, type PlanResult, type RoomSpec, type WallId,
} from '../core/roomPlanner';
import { uid } from '../core/ids';
import { fmtLen } from '../core/units';
import { pickFile } from '../core/persistence';
import { Btn, NumberField, Row, Section, Select, Toggle, cx } from './ui';

type Tool = 'none' | 'corners' | 'puerta' | 'ventana' | 'otro' | 'measure';
interface Measure {
  id: string;
  a: Pt;
  b: Pt;
  mm: number;
}

interface RoomState {
  image: string | null;
  imgW: number;
  imgH: number;
  corners: Pt[];
  room: RoomSpec;
  furniture: FurnitureReq[];
  measures: Measure[];
  plan: PlanResult | null;
  set: (p: Partial<Omit<RoomState, 'set'>>) => void;
}

const useRoom = create<RoomState>()((set) => ({
  image: null,
  imgW: 0,
  imgH: 0,
  corners: [],
  room: { width: 3200, depth: 3000, height: 2500, obstacles: [] },
  furniture: defaultFurniture(),
  measures: [],
  plan: null,
  set: (p) => set(p),
}));

const OBS_COLOR: Record<ObstacleType, string> = { puerta: '#f97316', ventana: '#38bdf8', otro: '#a855f7' };
const FURN_COLOR: Record<string, string> = { ropero: '#22c55e', cama: '#e879f9', escritorio: '#facc15', comoda: '#fb7185', estante: '#2dd4bf', velador: '#a3e635' };
const CORNER_NAMES = ['superior izquierda', 'superior derecha', 'inferior derecha', 'inferior izquierda'];

export default function RoomPlanner() {
  const r = useRoom();
  const unit = useStore((s) => s.unit);
  const [tool, setTool] = useState<Tool>('none');
  const [pending, setPending] = useState<Pt | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const L = (v: number) => fmtLen(v, unit);
  const room = r.room;

  // Homografías: pared (mm, y hacia arriba) <-> foto (px)
  const { H, Hinv } = useMemo(() => {
    if (r.corners.length !== 4) return { H: null as H3 | null, Hinv: null as H3 | null };
    const wallPts: Pt[] = [{ x: 0, y: room.height }, { x: room.width, y: room.height }, { x: room.width, y: 0 }, { x: 0, y: 0 }];
    return { H: computeHomography(wallPts, r.corners), Hinv: computeHomography(r.corners, wallPts) };
  }, [r.corners, room.width, room.height]);

  const setRoom = (patch: Partial<RoomSpec>) => r.set({ room: { ...room, ...patch }, plan: null });
  const setObs = (obstacles: Obstacle[]) => setRoom({ obstacles });

  const loadImage = async () => {
    const f = await pickFile('image/*');
    if (!f) return;
    const url = await new Promise<string>((res) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result));
      fr.readAsDataURL(f);
    });
    const img = new Image();
    img.onload = () => {
      r.set({ image: url, imgW: img.naturalWidth, imgH: img.naturalHeight, corners: [], measures: [], plan: null });
      setTool('corners');
    };
    img.src = url;
  };

  const toImg = (e: React.MouseEvent): Pt | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: Math.max(0, Math.min(r.imgW, p.x)), y: Math.max(0, Math.min(r.imgH, p.y)) };
  };

  const onPhotoClick = (e: React.MouseEvent) => {
    const p = toImg(e);
    if (!p) return;
    if (tool === 'corners') {
      const c = [...r.corners, p].slice(0, 4);
      r.set({ corners: c, plan: null });
      if (c.length === 4) setTool('none');
      return;
    }
    if (!Hinv || tool === 'none') return;
    if (!pending) {
      setPending(p);
      return;
    }
    const a = applyH(Hinv, pending);
    const b = applyH(Hinv, p);
    setPending(null);
    if (tool === 'measure') {
      r.set({ measures: [...r.measures, { id: uid('m'), a: pending, b: p, mm: Math.hypot(b.x - a.x, b.y - a.y) }] });
      return;
    }
    const type = tool as ObstacleType;
    const x0 = Math.max(0, Math.min(a.x, b.x));
    const x1 = Math.min(room.width, Math.max(a.x, b.x));
    let y0 = Math.max(0, Math.min(a.y, b.y));
    const y1 = Math.min(room.height, Math.max(a.y, b.y));
    if (type === 'puerta') y0 = 0;
    setObs([...room.obstacles, { id: uid('o'), type, wall: 'fondo', x: Math.round(x0), y: Math.round(y0), w: Math.round(x1 - x0), h: Math.round(y1 - y0) }]);
    setTool('none');
  };

  const propose = () => r.set({ plan: planRoom(room, r.furniture) });
  const sendTo3D = () => {
    if (!r.plan) return;
    const st = useStore.getState();
    st.replaceItems(roomToScene(room, r.plan.placements));
    st.updateProject({ name: st.project.name === 'Cocina de ejemplo' ? 'Mi dormitorio' : st.project.name });
    st.setMode('build');
    st.notify('Distribución enviada a Build 3D (Ctrl+Z para deshacer).');
  };

  const proj = (x: number, y: number) => (H ? applyH(H, { x, y }) : { x: 0, y: 0 });
  const poly = (x0: number, y0: number, x1: number, y1: number) => [proj(x0, y0), proj(x1, y0), proj(x1, y1), proj(x0, y1)].map((p) => `${p.x},${p.y}`).join(' ');
  const sw = Math.max(1.5, r.imgW / 500);
  const fs = Math.max(10, r.imgW / 70);

  const hint =
    tool === 'corners' ? `Clic en la esquina ${CORNER_NAMES[r.corners.length]} de la pared del fondo (${r.corners.length}/4)`
      : tool === 'measure' ? (pending ? 'Clic en el segundo punto' : 'Clic en el primer punto a medir sobre la pared')
        : tool !== 'none' ? (pending ? 'Clic en la esquina opuesta' : `Clic en una esquina de la ${tool}`)
          : '';

  return (
    <div className="flex h-full">
      <aside className="scroll-thin w-96 shrink-0 overflow-y-auto border-r border-line bg-panel">
        <div className="border-b border-line px-3 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold"><Sparkles size={16} className="text-emerald-700" /> Diseño desde una foto de tu cuarto</div>
          <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">
            Todo se procesa en tu equipo, sin internet. Marcas la pared en la foto, ingresas sus medidas reales con una wincha, y Tayser calcula la perspectiva para medir sobre la foto y proponer dónde ubicar cada mueble respetando puertas, ventanas y zonas de paso.
          </p>
        </div>

        <Section title="1 · Foto">
          <Btn className="w-full" variant="primary" onClick={loadImage}><ImagePlus size={15} /> {r.image ? 'Cambiar foto' : 'Subir foto del cuarto'}</Btn>
          <div className="text-[11px] text-zinc-500">Toma la foto de frente a la pared principal, con las 4 esquinas visibles. La foto es opcional: también puedes ingresar todo a mano.</div>
        </Section>

        <Section title="2 · Medidas reales de la habitación">
          <Row label="Ancho (pared del fondo)"><NumberField value={room.width} min={800} onChange={(v) => setRoom({ width: v })} /></Row>
          <Row label="Profundidad (paredes laterales)"><NumberField value={room.depth} min={800} onChange={(v) => setRoom({ depth: v })} /></Row>
          <Row label="Alto (piso a techo)"><NumberField value={room.height} min={1800} onChange={(v) => setRoom({ height: v })} /></Row>
          {r.image && (
            <div className="flex gap-1">
              <Btn size="sm" variant={tool === 'corners' ? 'primary' : 'default'} onClick={() => { r.set({ corners: [], plan: null }); setTool('corners'); }}>
                <Crosshair size={13} /> Marcar 4 esquinas
              </Btn>
              {r.corners.length === 4 && <span className="self-center text-[11px] text-emerald-700">✓ Pared calibrada</span>}
            </div>
          )}
        </Section>

        <Section title="3 · Puertas, ventanas y obstáculos">
          {r.image && (
            <div className="grid grid-cols-3 gap-1">
              <Btn size="sm" disabled={!H} variant={tool === 'ventana' ? 'primary' : 'default'} onClick={() => { setPending(null); setTool('ventana'); }}><AppWindow size={13} /> Ventana</Btn>
              <Btn size="sm" disabled={!H} variant={tool === 'puerta' ? 'primary' : 'default'} onClick={() => { setPending(null); setTool('puerta'); }}><DoorOpen size={13} /> Puerta</Btn>
              <Btn size="sm" disabled={!H} variant={tool === 'otro' ? 'primary' : 'default'} onClick={() => { setPending(null); setTool('otro'); }}><SquareDashed size={13} /> Otro</Btn>
            </div>
          )}
          {room.obstacles.map((o) => {
            const upd = (p: Partial<Obstacle>) => setObs(room.obstacles.map((x) => (x.id === o.id ? { ...x, ...p } : x)));
            return (
              <div key={o.id} className="space-y-1 rounded border border-line p-1.5" style={{ borderLeft: `3px solid ${OBS_COLOR[o.type]}` }}>
                <div className="flex gap-1">
                  <Select value={o.type} options={[{ value: 'ventana', label: 'Ventana' }, { value: 'puerta', label: 'Puerta' }, { value: 'otro', label: 'Otro (columna, tablero eléctrico…)' }]} onChange={(v) => upd({ type: v as ObstacleType })} />
                  <Select value={o.wall} options={WALLS.map((w) => ({ value: w, label: WALL_LABEL[w] }))} onChange={(v) => upd({ wall: v as WallId })} />
                  <Btn size="sm" variant="ghost" onClick={() => setObs(room.obstacles.filter((x) => x.id !== o.id))}><Trash2 size={12} /></Btn>
                </div>
                <div className="grid grid-cols-4 gap-1 text-[10px] text-zinc-500">
                  <label>Desde esquina<NumberField value={o.x} min={0} onChange={(v) => upd({ x: v })} /></label>
                  <label>Ancho<NumberField value={o.w} min={10} onChange={(v) => upd({ w: v })} /></label>
                  <label>{o.type === 'ventana' ? 'Alféizar' : 'Desde piso'}<NumberField value={o.y} min={0} onChange={(v) => upd({ y: v })} /></label>
                  <label>Alto<NumberField value={o.h} min={10} onChange={(v) => upd({ h: v })} /></label>
                </div>
              </div>
            );
          })}
          <Btn size="sm" variant="ghost" onClick={() => setObs([...room.obstacles, { id: uid('o'), type: 'puerta', wall: 'frente', x: 200, y: 0, w: 800, h: 2000 }])}>
            <Plus size={12} /> Agregar a mano (otras paredes)
          </Btn>
          <div className="text-[10px] text-zinc-500">En las paredes laterales la distancia se mide desde la esquina con la pared del fondo; en la frontal, desde la izquierda.</div>
        </Section>

        {r.image && (
          <Section title="Medir sobre la foto" defaultOpen={false}>
            <Btn size="sm" disabled={!H} variant={tool === 'measure' ? 'primary' : 'default'} onClick={() => { setPending(null); setTool('measure'); }}><Ruler size={13} /> Medir dos puntos de la pared</Btn>
            {r.measures.map((m, i) => (
              <div key={m.id} className="flex items-center justify-between text-xs">
                <span>Medida {i + 1}: <b className="font-mono text-amber-700">{L(m.mm)}</b></span>
                <Btn size="sm" variant="ghost" onClick={() => r.set({ measures: r.measures.filter((x) => x.id !== m.id) })}><Trash2 size={12} /></Btn>
              </div>
            ))}
          </Section>
        )}

        <Section title="4 · ¿Qué muebles quieres?">
          {r.furniture.map((f, i) => {
            const upd = (p: Partial<FurnitureReq>) => r.set({ furniture: r.furniture.map((x, j) => (j === i ? { ...x, ...p } : x)), plan: null });
            return (
              <div key={f.kind} className={cx('rounded border p-1.5', f.enabled ? 'border-line' : 'border-line/40 opacity-60')}>
                <div className="flex items-center justify-between">
                  <Toggle value={f.enabled} onChange={(v) => upd({ enabled: v })} label={FURNITURE_INFO[f.kind].label} />
                  {f.kind === 'velador' && <Select className="w-16!" value={String(f.qty)} options={[{ value: '1', label: '×1' }, { value: '2', label: '×2' }]} onChange={(v) => upd({ qty: Number(v) })} />}
                </div>
                {f.enabled && (
                  <div className="mt-1 grid grid-cols-4 gap-1 text-[10px] text-zinc-500">
                    <label>Ancho<NumberField value={f.w} min={300} onChange={(v) => upd({ w: v, minW: Math.min(f.minW, v) })} /></label>
                    <label>{f.kind === 'cama' ? 'Largo' : 'Fondo'}<NumberField value={f.d} min={200} onChange={(v) => upd({ d: v })} /></label>
                    <label>Alto<NumberField value={f.h} min={300} onChange={(v) => upd({ h: v })} /></label>
                    <label>Ancho mín.<NumberField value={f.minW} min={300} max={f.w} onChange={(v) => upd({ minW: v })} /></label>
                  </div>
                )}
              </div>
            );
          })}
          <Btn className="w-full" variant="accent" onClick={propose}><Sparkles size={15} /> Proponer distribución</Btn>
        </Section>

        {r.plan && (
          <Section title="5 · Propuesta">
            {r.plan.warnings.map((w) => <div key={w} className="text-xs text-amber-700">⚠ {w}</div>)}
            {r.plan.placements.map((p) => (
              <div key={p.id} className="rounded border border-line bg-panel2 p-2 text-xs" style={{ borderLeft: `3px solid ${FURN_COLOR[p.kind]}` }}>
                <div className="font-semibold">{p.label}</div>
                <div className="font-mono text-accent">{L(p.w)} × {L(p.h)} alto × {L(p.d)} {p.kind === 'cama' ? 'largo' : 'fondo'}</div>
                <div className="text-zinc-600">
                  {WALL_LABEL[p.wall]} · desde {L(p.along)} hasta {L(p.along + p.w)}
                  {p.wall === 'izquierda' || p.wall === 'derecha' ? ' (medido desde la pared del fondo)' : ' (desde la esquina izquierda)'}
                </div>
                {p.notes.map((n) => <div key={n} className="text-[11px] text-emerald-700/90">✓ {n}</div>)}
              </div>
            ))}
            {r.plan.failed.map((f) => (
              <div key={f.label} className="rounded border border-red-300 bg-red-500/10 p-2 text-xs text-red-700"><b>{f.label}:</b> {f.reason}</div>
            ))}
            <Btn className="w-full" variant="primary" disabled={!r.plan.placements.length} onClick={sendTo3D}><Send size={15} /> Enviar a Build 3D (paredes + muebles)</Btn>
            <div className="text-[10px] text-zinc-500">Reemplaza la escena actual por la habitación propuesta. Luego puedes ajustar cada mueble en el inspector y obtener su despiece.</div>
          </Section>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="relative min-h-0 flex-1 bg-[#121315]">
          {r.image ? (
            <>
              <svg ref={svgRef} viewBox={`0 0 ${r.imgW} ${r.imgH}`} preserveAspectRatio="xMidYMid meet" className={cx('h-full w-full', tool !== 'none' && 'cursor-crosshair')} onClick={onPhotoClick}>
                <image href={r.image} x={0} y={0} width={r.imgW} height={r.imgH} />
                {H && (
                  <g>
                    <polygon points={poly(0, 0, room.width, room.height)} fill="#22c55e10" stroke="#22c55e" strokeWidth={sw * 1.5} />
                    {Array.from({ length: Math.floor(room.width / 500) + 1 }, (_, i) => i * 500).map((x) => {
                      const a = proj(x, 0);
                      const b = proj(x, room.height);
                      return (
                        <g key={`gx${x}`}>
                          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#ffffff40" strokeWidth={sw * 0.6} />
                          <text x={a.x} y={a.y + fs * 1.1} fontSize={fs * 0.8} fill="#fff" textAnchor="middle" stroke="#000" strokeWidth={sw * 0.4} paintOrder="stroke">{fmtLen(x, unit, false)}</text>
                        </g>
                      );
                    })}
                    {Array.from({ length: Math.floor(room.height / 500) + 1 }, (_, i) => i * 500).map((y) => {
                      const a = proj(0, y);
                      const b = proj(room.width, y);
                      return <line key={`gy${y}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#ffffff30" strokeWidth={sw * 0.6} />;
                    })}
                    {room.obstacles.filter((o) => o.wall === 'fondo').map((o) => {
                      const c = proj(o.x + o.w / 2, o.y + o.h / 2);
                      return (
                        <g key={o.id}>
                          <polygon points={poly(o.x, o.y, o.x + o.w, o.y + o.h)} fill={`${OBS_COLOR[o.type]}33`} stroke={OBS_COLOR[o.type]} strokeWidth={sw * 1.5} />
                          <text x={c.x} y={c.y} fontSize={fs * 0.85} fill="#fff" textAnchor="middle" stroke="#000" strokeWidth={sw * 0.5} paintOrder="stroke">{o.type} {fmtLen(o.w, unit, false)}×{fmtLen(o.h, unit, false)}</text>
                        </g>
                      );
                    })}
                    {r.plan?.placements.filter((p) => p.wall === 'fondo').map((p) => {
                      const c = proj(p.along + p.w / 2, Math.min(p.h, room.height) / 2);
                      return (
                        <g key={p.id}>
                          <polygon points={poly(p.along, 0, p.along + p.w, Math.min(p.h, room.height))} fill={`${FURN_COLOR[p.kind]}40`} stroke={FURN_COLOR[p.kind]} strokeWidth={sw * 2} strokeDasharray={`${sw * 6} ${sw * 3}`} />
                          <text x={c.x} y={c.y} fontSize={fs} fontWeight="700" fill="#fff" textAnchor="middle" stroke="#000" strokeWidth={sw * 0.6} paintOrder="stroke">{p.label}</text>
                          <text x={c.x} y={c.y + fs * 1.15} fontSize={fs * 0.8} fill="#fff" textAnchor="middle" stroke="#000" strokeWidth={sw * 0.5} paintOrder="stroke">{fmtLen(p.w, unit)} × {fmtLen(p.h, unit)}</text>
                        </g>
                      );
                    })}
                  </g>
                )}
                {r.measures.map((m) => (
                  <g key={m.id}>
                    <line x1={m.a.x} y1={m.a.y} x2={m.b.x} y2={m.b.y} stroke="#fbbf24" strokeWidth={sw * 1.6} />
                    <text x={(m.a.x + m.b.x) / 2} y={(m.a.y + m.b.y) / 2 - fs * 0.4} fontSize={fs} fill="#fbbf24" textAnchor="middle" stroke="#000" strokeWidth={sw * 0.6} paintOrder="stroke">{fmtLen(m.mm, unit)}</text>
                  </g>
                ))}
                {r.corners.map((c, i) => (
                  <g key={i}>
                    <circle cx={c.x} cy={c.y} r={sw * 4} fill="#22c55e" stroke="#fff" strokeWidth={sw} />
                    <text x={c.x + sw * 6} y={c.y - sw * 4} fontSize={fs * 0.8} fill="#22c55e" stroke="#000" strokeWidth={sw * 0.4} paintOrder="stroke">{i + 1}</text>
                  </g>
                ))}
                {pending && <circle cx={pending.x} cy={pending.y} r={sw * 4} fill="#fbbf24" stroke="#fff" strokeWidth={sw} />}
              </svg>
              {hint && (
                <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/70 px-4 py-1.5 text-sm text-white">
                  <MousePointerClick size={14} className="mr-1 inline" /> {hint}
                </div>
              )}
              {tool !== 'none' && (
                <Btn size="sm" className="absolute right-3 top-3" onClick={() => { setTool('none'); setPending(null); }}><RotateCcw size={13} /> Cancelar</Btn>
              )}
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-zinc-600">
              <ImagePlus size={42} className="text-emerald-700" />
              <div className="text-sm">Sube una foto de tu cuarto (frente a la pared principal)</div>
              <Btn variant="primary" onClick={loadImage}>Elegir foto</Btn>
              <div className="text-xs text-zinc-500">…o ingresa las medidas a la izquierda y pulsa «Proponer distribución».</div>
            </div>
          )}
        </div>
        <div className="h-[42%] min-h-56 border-t border-line bg-panel">
          <FloorPlan room={room} plan={r.plan} unit={unit} />
        </div>
      </div>
    </div>
  );
}

function FloorPlan({ room, plan, unit }: { room: RoomSpec; plan: PlanResult | null; unit: 'mm' | 'cm' | 'in' }) {
  const W = room.width;
  const D = room.depth;
  const T = 120;
  const pad = 450;
  const fs = Math.max(W, D) / 38;
  const seg = (o: Obstacle) => {
    switch (o.wall) {
      case 'fondo': return { x1: o.x, y1: -T / 2, x2: o.x + o.w, y2: -T / 2 };
      case 'frente': return { x1: o.x, y1: D + T / 2, x2: o.x + o.w, y2: D + T / 2 };
      case 'izquierda': return { x1: -T / 2, y1: o.x, x2: -T / 2, y2: o.x + o.w };
      case 'derecha': return { x1: W + T / 2, y1: o.x, x2: W + T / 2, y2: o.x + o.w };
    }
  };
  return (
    <svg viewBox={`${-pad} ${-pad} ${W + 2 * pad} ${D + 2 * pad}`} className="h-full w-full">
      <text x={-pad + 40} y={-pad + fs * 1.4} fontSize={fs} fill="#a1a1aa">Planta (vista superior) · la pared del fondo está arriba</text>
      <rect x={-T} y={-T} width={W + 2 * T} height={D + 2 * T} fill="#52525b" />
      <rect x={0} y={0} width={W} height={D} fill="#27272a" />
      {room.obstacles.map((o) => {
        const s = seg(o);
        const swing = doorSwing(room, o);
        return (
          <g key={o.id}>
            <line {...s} stroke={OBS_COLOR[o.type]} strokeWidth={T * 1.05} />
            {o.type === 'puerta' && <rect x={swing.x} y={swing.z} width={swing.w} height={swing.d} fill="#f9731618" stroke="#f97316" strokeDasharray="30 20" strokeWidth={8} />}
          </g>
        );
      })}
      {plan?.placements.map((p) => (
        <g key={p.id}>
          <rect x={p.clear.x} y={p.clear.z} width={p.clear.w} height={p.clear.d} fill="none" stroke={FURN_COLOR[p.kind]} strokeOpacity={0.4} strokeDasharray="25 18" strokeWidth={8} />
          <rect x={p.rect.x} y={p.rect.z} width={p.rect.w} height={p.rect.d} fill={`${FURN_COLOR[p.kind]}55`} stroke={FURN_COLOR[p.kind]} strokeWidth={14} />
          <text x={p.rect.x + p.rect.w / 2} y={p.rect.z + p.rect.d / 2} fontSize={fs * 0.9} fill="#fff" textAnchor="middle" fontWeight={700}>{p.label}</text>
          <text x={p.rect.x + p.rect.w / 2} y={p.rect.z + p.rect.d / 2 + fs} fontSize={fs * 0.75} fill="#e4e4e7" textAnchor="middle">{fmtLen(p.w, unit, false)}×{fmtLen(p.d, unit, false)}</text>
        </g>
      ))}
      <line x1={0} y1={D + T + pad / 2.5} x2={W} y2={D + T + pad / 2.5} stroke="#fbbf24" strokeWidth={8} />
      <text x={W / 2} y={D + T + pad / 2.5 - fs * 0.4} fontSize={fs} fill="#fbbf24" textAnchor="middle">{fmtLen(W, unit)}</text>
      <line x1={W + T + pad / 2.5} y1={0} x2={W + T + pad / 2.5} y2={D} stroke="#fbbf24" strokeWidth={8} />
      <text x={W + T + pad / 2.5 + fs * 0.4} y={D / 2} fontSize={fs} fill="#fbbf24" transform={`rotate(90 ${W + T + pad / 2.5 + fs * 0.4} ${D / 2})`} textAnchor="middle">{fmtLen(D, unit)}</text>
      {!plan && <text x={W / 2} y={D / 2} fontSize={fs} fill="#71717a" textAnchor="middle">Pulsa «Proponer distribución» para ver la propuesta</text>}
    </svg>
  );
}
