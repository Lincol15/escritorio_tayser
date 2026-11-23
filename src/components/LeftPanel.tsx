import { useState } from 'react';
import {
  Archive, BedDouble, Box, BrickWall, ChefHat, ChevronDown, ChevronRight, DoorClosed, Eye, EyeOff, Footprints, Grid2x2, Lamp, LayoutGrid, LibraryBig, PanelTop, Rows3, Rows4, Square, Table2, Tv, type LucideIcon,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { TEMPLATES } from '../core/templates';
import { buildItem } from '../core/items';
import { Section, cx } from './ui';
import { fmtLen } from '../core/units';

export const ICONS: Record<string, LucideIcon> = { Archive, PanelTop, Rows3, Rows4, DoorClosed, Table2, LibraryBig, Square, BrickWall, Grid2x2, Box, BedDouble, Lamp, Footprints, Tv, LayoutGrid };
const GROUPS = ['Cocina', 'Dormitorio', 'Oficina y sala', 'A medida', 'Ambiente', 'Piezas'];

export default function LeftPanel() {
  const items = useStore((s) => s.project.items);
  const selectedId = useStore((s) => s.selectedId);
  const selectedPiece = useStore((s) => s.selectedPiece);
  const unit = useStore((s) => s.unit);
  const { addItem, select, toggleItemHidden, togglePieceHidden, insertKitchenPreset, setMode } = useStore.getState();
  const [open, setOpen] = useState<Record<string, boolean>>({});

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-line bg-panel">
      <div className="scroll-thin flex-1 overflow-y-auto">
        <Section title="Catálogo paramétrico">
          {GROUPS.map((g) => (
            <div key={g}>
              <div className="mb-1 mt-1 text-[11px] font-medium text-zinc-500">{g}</div>
              <div className="grid grid-cols-2 gap-1.5">
                {TEMPLATES.filter((t) => t.group === g).map((t) => {
                  const Icon = ICONS[t.icon] ?? Box;
                  return (
                    <button
                      key={t.id}
                      title={t.description}
                      onClick={() => addItem(t.id)}
                      className="flex items-center gap-2 rounded-md border border-line bg-panel2 px-2 py-2 text-left text-xs text-zinc-800 hover:border-accent/60 hover:bg-line/50"
                    >
                      <Icon size={16} className="shrink-0 text-accent" />
                      <span className="leading-tight">{t.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="mt-2 grid grid-cols-1 gap-1.5">
            <button onClick={insertKitchenPreset} className="flex items-center gap-2 rounded-md border border-amber-400 bg-amber-500/10 px-2 py-2 text-xs text-amber-700 hover:bg-amber-500/20">
              <ChefHat size={16} /> Plantilla: cocina lineal contra pared
            </button>
            <button onClick={() => setMode('room')} className="flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-500/10 px-2 py-2 text-xs text-emerald-700 hover:bg-emerald-500/20">
              <Grid2x2 size={16} /> Diseñar desde una foto de mi cuarto
            </button>
          </div>
        </Section>

        <Section title={`Proyecto (${items.length})`}>
          {!items.length && <div className="text-xs text-zinc-500">La escena está vacía.</div>}
          <div className="space-y-0.5">
            {items.map((it) => {
              const built = buildItem(it);
              const isOpen = open[it.id];
              const isSel = selectedId === it.id;
              return (
                <div key={it.id}>
                  <div className={cx('group flex items-center gap-1 rounded px-1 py-1 text-xs', isSel && !selectedPiece ? 'bg-accent/25' : isSel ? 'bg-accent/10' : 'hover:bg-line/40')}>
                    <button className="text-zinc-500" onClick={() => setOpen({ ...open, [it.id]: !isOpen })}>
                      {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    </button>
                    <button className={cx('flex-1 truncate text-left', it.hidden && 'text-zinc-500 line-through')} onClick={() => select(it.id)}>
                      {it.name}
                      <span className="ml-1 text-[10px] text-zinc-500">
                        {fmtLen(built.size.w, unit, false)}×{fmtLen(built.size.h, unit, false)}×{fmtLen(built.size.d, unit, false)}
                      </span>
                    </button>
                    <button title={it.hidden ? 'Mostrar' : 'Ocultar'} className="text-zinc-600 hover:text-zinc-900" onClick={() => toggleItemHidden(it.id)}>
                      {it.hidden ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                  {isOpen && (
                    <div className="ml-5 border-l border-line pl-1">
                      {built.pieces.map((p) => {
                        const hidden = it.hiddenPieces.includes(p.key);
                        return (
                          <div key={p.key} className={cx('flex items-center gap-1 rounded px-1 py-0.5 text-[11px]', isSel && selectedPiece === p.key ? 'bg-accent/30' : 'hover:bg-line/40')}>
                            <button className={cx('flex-1 truncate text-left', hidden ? 'text-zinc-400 line-through' : 'text-zinc-700')} onClick={() => select(it.id, p.key)}>
                              {p.name} <span className="text-zinc-500">· {p.key}</span>
                            </button>
                            <button className="text-zinc-500 hover:text-zinc-900" title={hidden ? 'Mostrar pieza' : 'Ocultar pieza'} onClick={() => togglePieceHidden(it.id, p.key)}>
                              {hidden ? <EyeOff size={12} /> : <Eye size={12} />}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      </div>
      <div className="border-t border-line px-3 py-2 text-[10px] leading-relaxed text-zinc-500">
        Clic: seleccionar pieza · Supr: eliminar · Ctrl+D: duplicar · Ctrl+Z/Y: deshacer/rehacer · Ctrl+S: guardar
      </div>
    </aside>
  );
}
