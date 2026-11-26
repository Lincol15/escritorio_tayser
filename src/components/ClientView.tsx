/*
 * Proyecto:    Tayser 1.0.0
 * Archivo:     src/components/ClientView.tsx
 * Autor:       LRGJ
 * Descripción: Modo Vista cliente.
 */
import { useMemo, useRef, useState } from 'react';
import { Camera, Maximize, Palette } from 'lucide-react';
import { useStore, type ViewName } from '../store/useStore';
import Viewer3D from './Viewer3D';
import { itemAABB, buildItem } from '../core/items';
import { BOARD_MATERIALS, type Material } from '../core/materials';
import { swatchDataUrl } from '../three/textures';
import { fmtLen } from '../core/units';
import { Btn, cx } from './ui';
import { captureViewer, toggleFullscreen } from './ViewerOverlay';

function Swatch({ m, active, onClick }: { m: Material; active: boolean; onClick: () => void }) {
  const url = useMemo(() => swatchDataUrl(m), [m]);
  return (
    <button title={m.name} onClick={onClick} className={cx('flex w-16 flex-col items-center gap-1 rounded-md p-1 text-[10px] leading-tight', active ? 'bg-emerald-500/20 ring-2 ring-emerald-400' : 'hover:bg-white/5')}>
      <span className="h-10 w-10 rounded-full border border-white/20 shadow" style={{ background: url ? `url(${url}) center/cover` : m.color }} />
      <span className="text-center text-zinc-300">{m.name.replace('Melamina ', '')}</span>
    </button>
  );
}

export default function ClientView() {
  const project = useStore((s) => s.project);
  const unit = useStore((s) => s.unit);
  const st = useStore.getState();
  const ref = useRef<HTMLDivElement>(null);
  const [panel, setPanel] = useState(true);
  const modules = project.items.filter((i) => i.category === 'module' && !i.hidden);
  const finishes = BOARD_MATERIALS.filter((m) => m.kind === 'board' && m.id !== 'hdf-blanco' && m.id !== 'mdf-crudo');
  const carcass = modules[0]?.materialId;
  const front = modules[0]?.frontMaterialId;

  const total = useMemo(() => {
    if (!modules.length) return null;
    const boxes = modules.map(itemAABB);
    return {
      w: Math.max(...boxes.map((b) => b.maxX)) - Math.min(...boxes.map((b) => b.minX)),
      d: Math.max(...boxes.map((b) => b.maxZ)) - Math.min(...boxes.map((b) => b.minZ)),
      h: Math.max(...boxes.map((b) => b.maxY)) - Math.min(...boxes.map((b) => b.minY)),
    };
  }, [modules]);

  return (
    <div ref={ref} className="relative h-full w-full bg-[#20242c]">
      <Viewer3D presentation />
      <div className="absolute left-5 top-5 rounded-xl border border-white/10 bg-black/40 px-5 py-4 backdrop-blur-md">
        <div className="text-xs font-medium text-emerald-300">Propuesta de diseño</div>
        <div className="text-2xl font-semibold">{project.name}</div>
        {project.client && <div className="text-sm text-zinc-300">Cliente: {project.client}</div>}
      </div>

      <div className="absolute bottom-5 left-5 w-80 rounded-xl border border-white/10 bg-black/45 p-4 backdrop-blur-md">
        <div className="mb-2 text-xs font-medium text-zinc-400">Dimensiones totales</div>
        {total ? (
          <div className="grid grid-cols-3 gap-2 text-center">
            {[['Ancho', total.w], ['Alto', total.h], ['Fondo', total.d]].map(([l, v]) => (
              <div key={l as string} className="rounded-lg bg-white/5 py-2">
                <div className="text-[10px] text-zinc-400">{l}</div>
                <div className="font-mono text-sm font-semibold">{fmtLen(v as number, unit)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-zinc-400">Sin muebles en la escena.</div>
        )}
        <div className="scroll-thin mt-3 max-h-40 space-y-1 overflow-y-auto text-xs">
          {modules.map((m) => {
            const s = buildItem(m).size;
            return (
              <div key={m.id} className="flex justify-between gap-2 text-zinc-300">
                <span className="truncate">{m.name}</span>
                <span className="font-mono text-zinc-400">
                  {fmtLen(s.w, unit, false)}×{fmtLen(s.h, unit, false)}×{fmtLen(s.d, unit, false)}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-2 text-[10px] text-zinc-500">{modules.length} mueble(s) · medidas en {unit}</div>
      </div>

      <div className="absolute right-5 top-5 flex gap-1">
        {(['front', 'side', 'iso', 'top'] as ViewName[]).map((v) => (
          <Btn key={v} size="sm" className="bg-black/40! border-white/10!" onClick={() => st.requestView(v)}>
            {{ front: 'Frente', side: 'Lateral', iso: '3/4', top: 'Planta' }[v]}
          </Btn>
        ))}
        <Btn size="sm" className="bg-black/40! border-white/10!" onClick={() => setPanel(!panel)} title="Acabados">
          <Palette size={14} />
        </Btn>
        <Btn size="sm" className="bg-black/40! border-white/10!" onClick={() => captureViewer(`${project.name}_cliente`)} title="Guardar imagen">
          <Camera size={14} />
        </Btn>
        <Btn size="sm" className="bg-black/40! border-white/10!" onClick={() => toggleFullscreen(ref.current)} title="Pantalla completa">
          <Maximize size={14} />
        </Btn>
      </div>

      {panel && (
        <div className="absolute bottom-5 right-5 w-[420px] rounded-xl border border-white/10 bg-black/45 p-4 backdrop-blur-md">
          <div className="mb-2 text-xs font-medium text-zinc-400">Acabado de estructura</div>
          <div className="flex flex-wrap gap-1">
            {finishes.map((m) => (
              <Swatch key={m.id} m={m} active={carcass === m.id} onClick={() => st.setAllFinishes(m.id, undefined)} />
            ))}
          </div>
          <div className="mb-2 mt-3 text-xs font-medium text-zinc-400">Puertas y frentes</div>
          <div className="flex flex-wrap gap-1">
            {finishes.map((m) => (
              <Swatch key={m.id} m={m} active={front === m.id} onClick={() => st.setAllFinishes(undefined, m.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
