/*
 * Proyecto:    Tayser 1.0.0
 * Archivo:     src/components/TopBar.tsx
 * Autores:     LWYC, RCO, GDMS, JDAP
 * Descripción: Barra superior.
 */
import { Box, Calculator, Grid3x3, FileDown, FilePlus2, FileSpreadsheet, FolderOpen, Image as ImageIcon, Maximize, Presentation, Redo2, Save, SaveAll, Scissors, Undo2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { WRGJAppMode } from '../core/types';
import { WRGJ_UNITS } from '../core/units';
import { WRGJBtn, wrgjCx } from './ui';
import { wrgjBuildCutList } from '../core/cutlist';
import { wrgjOptimizeAll } from '../core/optimizer';
import { wrgjExportCsv, wrgjExportPdf } from '../core/export';
import { wrgjOpenProjectFile, wrgjSaveProjectFile } from '../core/persistence';
import { wrgjToggleFullscreen } from './ViewerOverlay';

const WRGJ_MODES: { id: WRGJAppMode; label: string; icon: typeof Box }[] = [
  { id: 'build', label: 'Build 3D', icon: Box },
  { id: 'room', label: 'Foto del ambiente', icon: ImageIcon },
  { id: 'cutlist', label: 'Despiece y cortes', icon: Scissors },
  { id: 'optimize', label: 'Optimizar plancha', icon: Grid3x3 },
  { id: 'calc', label: 'Calculadoras', icon: Calculator },
  { id: 'client', label: 'Vista cliente', icon: Presentation },
];

export async function wrgjSaveProject(saveAs = false) {
  const st = useStore.getState();
  try {
    const path = await wrgjSaveProjectFile(st.project, st.filePath, saveAs);
    if (path) {
      st.markSaved(window.tayser?.isElectron ? path : st.filePath);
      st.notify(`Proyecto guardado: ${path}`);
    }
  } catch (e) {
    st.notify(`Error al guardar: ${(e as Error).message}`);
  }
}

export async function wrgjOpenProject() {
  const st = useStore.getState();
  if (st.dirty && !window.confirm('Hay cambios sin guardar. ¿Abrir otro proyecto de todos modos?')) return;
  try {
    const r = await wrgjOpenProjectFile();
    if (r) {
      st.loadProject(r.project, r.filePath);
      st.notify(`Proyecto abierto: ${r.project.name}`);
    }
  } catch (e) {
    st.notify(`No se pudo abrir: ${(e as Error).message}`);
  }
}

export default function WRGJTopBar() {
  const mode = useStore((s) => s.mode);
  const unit = useStore((s) => s.unit);
  const name = useStore((s) => s.project.name);
  const dirty = useStore((s) => s.dirty);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const st = useStore.getState();

  const exp = async (kind: 'pdf' | 'csv') => {
    const p = useStore.getState().project;
    const cut = wrgjBuildCutList(p);
    const r = kind === 'pdf' ? await wrgjExportPdf(p, cut, wrgjOptimizeAll(cut, p.sheet), unit) : await wrgjExportCsv(p, cut, unit);
    if (r) st.notify(`${kind.toUpperCase()} exportado: ${r}`);
  };

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line bg-panel px-3">
      <div className="flex items-center gap-2 pr-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-sm font-black text-white">T</div>
        <div className="leading-none">
          <div className="text-sm font-bold tracking-wide">TAYSER</div>
          <div className="max-w-40 truncate text-[10px] text-zinc-500">
            {name}
            {dirty ? ' •' : ''}
          </div>
        </div>
      </div>
      <nav className="flex rounded-lg border border-line bg-panel p-0.5">
        {WRGJ_MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => st.setMode(m.id)}
            className={wrgjCx('flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium', mode === m.id ? 'bg-accent text-white' : 'text-zinc-700 hover:bg-line/60')}
          >
            <m.icon size={14} /> {m.label}
          </button>
        ))}
      </nav>
      <div className="flex rounded-lg border border-line bg-panel p-0.5">
        {WRGJ_UNITS.map((u) => (
          <button key={u} onClick={() => st.setUnit(u)} className={wrgjCx('rounded-md px-2.5 py-1 font-mono text-xs', unit === u ? 'bg-zinc-800 text-white' : 'text-zinc-700 hover:bg-line/60')}>
            {u}
          </button>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-1">
        <WRGJBtn size="sm" variant="ghost" disabled={!canUndo} onClick={st.undo} title="Deshacer (Ctrl+Z)"><Undo2 size={15} /></WRGJBtn>
        <WRGJBtn size="sm" variant="ghost" disabled={!canRedo} onClick={st.redo} title="Rehacer (Ctrl+Y)"><Redo2 size={15} /></WRGJBtn>
        <span className="mx-1 h-5 w-px bg-line" />
        <WRGJBtn size="sm" variant="ghost" title="Nuevo proyecto" onClick={() => { if (!dirty || window.confirm('¿Descartar los cambios y crear un proyecto nuevo?')) st.newProject(); }}><FilePlus2 size={15} /> Nuevo</WRGJBtn>
        <WRGJBtn size="sm" variant="ghost" title="Abrir .tayser" onClick={wrgjOpenProject}><FolderOpen size={15} /> Abrir</WRGJBtn>
        <WRGJBtn size="sm" variant="ghost" title="Guardar (Ctrl+S)" onClick={() => wrgjSaveProject(false)}><Save size={15} /> Guardar</WRGJBtn>
        <WRGJBtn size="sm" variant="ghost" title="Guardar como…" onClick={() => wrgjSaveProject(true)}><SaveAll size={15} /></WRGJBtn>
        <span className="mx-1 h-5 w-px bg-line" />
        <WRGJBtn size="sm" variant="primary" onClick={() => exp('pdf')}><FileDown size={15} /> PDF</WRGJBtn>
        <WRGJBtn size="sm" onClick={() => exp('csv')}><FileSpreadsheet size={15} /> CSV</WRGJBtn>
        <WRGJBtn size="sm" variant="ghost" title="Pantalla completa" onClick={() => wrgjToggleFullscreen()}><Maximize size={15} /></WRGJBtn>
      </div>
    </header>
  );
}
