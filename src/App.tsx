/*
 * Proyecto:    Tayser 1.0.0
 * Archivo:     src/App.tsx
 * Autores:     LWYC, RCO, GDMS, JDAP
 * Descripción: Componente raíz: cambio de modo, atajos de teclado y respaldo automático.
 */
import { useEffect, useRef, useState } from 'react';
import { useStore } from './store/useStore';
import WRGJTopBar, { wrgjSaveProject } from './components/TopBar';
import WRGJLeftPanel from './components/LeftPanel';
import WRGJInspector from './components/Inspector';
import WRGJViewer3D from './components/Viewer3D';
import WRGJViewerOverlay from './components/ViewerOverlay';
import WRGJCutListView from './components/CutListView';
import WRGJCalculatorsView from './components/CalculatorsView';
import WRGJQuickOptimizerView from './components/QuickOptimizerView';
import WRGJClientView from './components/ClientView';
import WRGJRoomPlanner from './components/RoomPlanner';
import { wrgjIdbLoad, wrgjIdbSave, wrgjParseProject } from './core/persistence';
import type { WRGJProject } from './core/types';

const WRGJ_AUTOSAVE_KEY = 'current-project';

export default function WRGJApp() {
  const mode = useStore((s) => s.mode);
  const toast = useStore((s) => s.toast);
  const viewerRef = useRef<HTMLDivElement>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [restored, setRestored] = useState(false);

  // Restaurar respaldo de IndexedDB al iniciar
  useEffect(() => {
    wrgjIdbLoad<string>(WRGJ_AUTOSAVE_KEY).then((txt) => {
      if (txt) {
        try {
          const p: WRGJProject = wrgjParseProject(txt);
          useStore.getState().loadProject(p, null);
          useStore.getState().notify('Se restauró el último proyecto (respaldo local).');
        } catch {
          /* respaldo corrupto: se ignora */
        }
      }
      setRestored(true);
    });
  }, []);

  // Respaldo automático en IndexedDB
  useEffect(() => {
    if (!restored) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsub = useStore.subscribe((s, prev) => {
      if (s.project === prev.project) return;
      clearTimeout(timer);
      timer = setTimeout(() => wrgjIdbSave(WRGJ_AUTOSAVE_KEY, JSON.stringify(useStore.getState().project)), 800);
    });
    return () => {
      unsub();
      clearTimeout(timer);
    };
  }, [restored]);

  // Atajos de teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      const st = useStore.getState();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        wrgjSaveProject(e.shiftKey);
        return;
      }
      if (typing) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) st.redo();
        else st.undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        st.redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd' && st.selectedId) {
        e.preventDefault();
        st.duplicateItem(st.selectedId);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && st.selectedId && st.mode === 'build') {
        st.removeItem(st.selectedId);
      } else if (e.key === 'Escape') {
        st.select(null);
        st.setAssemblyStep(null);
      } else if (st.mode === 'build' && !e.ctrlKey) {
        if (e.key === 'g' || e.key === 'm') st.setGizmo('translate');
        if (e.key === 'r') st.setGizmo('rotate');
        if (e.key === '1') st.requestView('front');
        if (e.key === '2') st.requestView('top');
        if (e.key === '3') st.requestView('side');
        if (e.key === '4') st.requestView('iso');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!toast) return;
    setToastVisible(true);
    const t = setTimeout(() => setToastVisible(false), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="flex h-full flex-col">
      <WRGJTopBar />
      <main className="relative flex min-h-0 flex-1">
        {mode === 'build' && (
          <>
            <WRGJLeftPanel />
            <div ref={viewerRef} className="relative min-w-0 flex-1">
              <WRGJViewer3D />
              <WRGJViewerOverlay container={viewerRef.current} />
            </div>
            <WRGJInspector />
          </>
        )}
        {mode === 'cutlist' && <div className="min-w-0 flex-1"><WRGJCutListView /></div>}
        {mode === 'optimize' && <div className="min-w-0 flex-1"><WRGJQuickOptimizerView /></div>}
        {mode === 'calc' && <div className="min-w-0 flex-1"><WRGJCalculatorsView /></div>}
        {mode === 'client' && <div className="min-w-0 flex-1"><WRGJClientView /></div>}
        {mode === 'room' && <div className="min-w-0 flex-1"><WRGJRoomPlanner /></div>}
      </main>
      {toast && toastVisible && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-line bg-panel2 px-4 py-2 text-sm text-zinc-900 shadow-xl">{toast.text}</div>
      )}
    </div>
  );
}
