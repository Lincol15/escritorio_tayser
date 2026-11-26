/*
 * Proyecto:    Tayser 1.0.0
 * Archivo:     src/components/ViewerOverlay.tsx
 * Autores:     LWYC, RCO, GDMS, JDAP
 * Descripción: Herramientas del visor: vistas, cotas, mover, rotar y pasos de armado.
 */
import { useEffect, useMemo, useState } from 'react';
import { Box, Camera, Eye, Footprints, Maximize, Move3d, MousePointer2, Pause, Play, Rotate3d, Ruler, SkipBack, SkipForward, X } from 'lucide-react';
import { useStore, type ViewName } from '../store/useStore';
import { buildItem } from '../core/items';
import { Btn, cx } from './ui';
import { dataUrlToBytes, saveBinaryFile } from '../core/persistence';

const VIEWS: { v: ViewName; label: string }[] = [
  { v: 'front', label: 'Frontal' },
  { v: 'top', label: 'Superior' },
  { v: 'side', label: 'Lateral' },
  { v: 'iso', label: 'Isométrica' },
];

export async function captureViewer(name: string) {
  const canvas = document.querySelector('canvas');
  if (!canvas) return;
  const url = canvas.toDataURL('image/png');
  await saveBinaryFile(`${name || 'tayser'}.png`, dataUrlToBytes(url), 'image/png', [{ name: 'Imagen PNG', extensions: ['png'] }]);
}

export function toggleFullscreen(el?: HTMLElement | null) {
  if (document.fullscreenElement) document.exitFullscreen();
  else (el ?? document.documentElement).requestFullscreen?.();
}

export default function ViewerOverlay({ container }: { container: HTMLElement | null }) {
  const s = useStore();
  const items = s.project.items;
  const steps = useMemo(() => {
    const map = new Map<number, Set<string>>();
    for (const it of items) {
      if (it.hidden || (it.category !== 'module' && it.category !== 'piece')) continue;
      for (const p of buildItem(it).pieces) {
        if (!map.has(p.step)) map.set(p.step, new Set());
        map.get(p.step)!.add(p.name);
      }
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([n, names]) => ({ n, names: [...names] }));
  }, [items]);
  const [playing, setPlaying] = useState(false);
  const stepIdx = s.assemblyStep === null ? -1 : steps.findIndex((x) => x.n === s.assemblyStep);

  useEffect(() => {
    if (!playing || s.assemblyStep === null) return;
    const t = setInterval(() => {
      const st = useStore.getState();
      const idx = steps.findIndex((x) => x.n === st.assemblyStep);
      if (idx >= steps.length - 1) setPlaying(false);
      else st.setAssemblyStep(steps[idx + 1].n);
    }, 1500);
    return () => clearInterval(t);
  }, [playing, steps, s.assemblyStep]);

  const goto = (idx: number) => {
    if (!steps.length) return;
    const i = Math.max(0, Math.min(steps.length - 1, idx));
    s.setAssemblyStep(steps[i].n);
  };

  return (
    <>
      <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1 rounded-lg border border-line bg-panel/90 p-1 backdrop-blur">
        {VIEWS.map((v) => (
          <Btn key={v.v} size="sm" variant="ghost" onClick={() => s.requestView(v.v)}>
            {v.label}
          </Btn>
        ))}
        <span className="mx-1 h-5 w-px bg-line" />
        <Btn size="sm" variant={s.showDims ? 'primary' : 'ghost'} title="Acotaciones 3D" onClick={() => s.setShowDims(!s.showDims)}>
          <Ruler size={14} /> Cotas
        </Btn>
        <Btn size="sm" variant={s.dimsAll ? 'primary' : 'ghost'} disabled={!s.showDims} title="Cotas en todos los elementos (si no, solo en el seleccionado)" onClick={() => s.setDimsAll(!s.dimsAll)}>
          Todas
        </Btn>
        <span className="mx-1 h-5 w-px bg-line" />
        <Btn size="sm" variant={s.gizmo === 'none' ? 'primary' : 'ghost'} title="Solo seleccionar" onClick={() => s.setGizmo('none')}>
          <MousePointer2 size={14} />
        </Btn>
        <Btn size="sm" variant={s.gizmo === 'translate' ? 'primary' : 'ghost'} title="Mover (X/Y/Z, imán 10 mm)" onClick={() => s.setGizmo('translate')}>
          <Move3d size={14} />
        </Btn>
        <Btn size="sm" variant={s.gizmo === 'rotate' ? 'primary' : 'ghost'} title="Rotar en Y con imán" onClick={() => s.setGizmo('rotate')}>
          <Rotate3d size={14} />
        </Btn>
        <select className="field h-7! w-16" value={s.rotSnap} onChange={(e) => s.setRotSnap(Number(e.target.value))} title="Imán de rotación">
          {[5, 15, 45, 90].map((v) => (
            <option key={v} value={v}>
              {v}°
            </option>
          ))}
        </select>
      </div>

      <div className="absolute right-3 top-3 flex items-center gap-1 rounded-lg border border-line bg-panel/90 p-1 backdrop-blur">
        {(['dark', 'gray', 'light'] as const).map((b) => (
          <button
            key={b}
            title={`Fondo ${b}`}
            onClick={() => s.setSceneBg(b)}
            className={cx('h-5 w-5 rounded-full border', s.sceneBg === b ? 'border-accent' : 'border-line')}
            style={{ background: b === 'dark' ? '#17181b' : b === 'gray' ? '#3a3f47' : '#dfe3de' }}
          />
        ))}
        <span className="mx-1 h-5 w-px bg-line" />
        <Btn size="sm" variant="ghost" title="Guardar imagen PNG" onClick={() => captureViewer(s.project.name)}>
          <Camera size={14} />
        </Btn>
        <Btn size="sm" variant="ghost" title="Pantalla completa del visor" onClick={() => toggleFullscreen(container)}>
          <Maximize size={14} />
        </Btn>
      </div>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-lg border border-line bg-panel/90 px-2 py-1.5 backdrop-blur">
        {s.assemblyStep === null ? (
          <Btn size="sm" variant="ghost" onClick={() => goto(0)} disabled={!steps.length}>
            <Footprints size={14} /> Pasos de armado
          </Btn>
        ) : (
          <div className="flex items-center gap-2">
            <Btn size="sm" variant="ghost" onClick={() => goto(stepIdx - 1)}>
              <SkipBack size={14} />
            </Btn>
            <Btn size="sm" variant="primary" onClick={() => setPlaying(!playing)}>
              {playing ? <Pause size={14} /> : <Play size={14} />}
            </Btn>
            <Btn size="sm" variant="ghost" onClick={() => goto(stepIdx + 1)}>
              <SkipForward size={14} />
            </Btn>
            <input type="range" min={0} max={Math.max(0, steps.length - 1)} value={Math.max(0, stepIdx)} onChange={(e) => goto(Number(e.target.value))} className="w-44 accent-amber-400" />
            <div className="w-64 truncate text-xs">
              <span className="font-semibold text-amber-700">
                Paso {stepIdx + 1}/{steps.length}:
              </span>{' '}
              <span className="text-zinc-700">{steps[stepIdx]?.names.join(', ')}</span>
            </div>
            <Btn size="sm" variant="ghost" title="Ver todo" onClick={() => { setPlaying(false); s.setAssemblyStep(null); }}>
              <Eye size={14} />
            </Btn>
            <Btn size="sm" variant="ghost" onClick={() => { setPlaying(false); s.setAssemblyStep(null); }}>
              <X size={14} />
            </Btn>
          </div>
        )}
      </div>

      {!items.length && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-xl border border-line bg-panel/80 px-6 py-5 text-center text-sm text-zinc-600">
            <Box className="mx-auto mb-2 text-accent" />
            Agrega paredes y módulos desde el catálogo de la izquierda
            <br />o usa <b>Foto del ambiente</b> para que Tayser proponga la distribución.
          </div>
        </div>
      )}
    </>
  );
}
