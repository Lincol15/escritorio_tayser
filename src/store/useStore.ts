/*
 * Proyecto:    Tayser 1.0.0
 * Archivo:     src/store/useStore.ts
 * Autores:     LWYC, RCO, GDMS, JDAP
 * Descripción: Estado global con Zustand: escena, selección, deshacer y rehacer.
 */
import { create } from 'zustand';
import type { WRGJAppMode, WRGJParamValue, WRGJPieceOverride, WRGJProject, WRGJSceneItem, WRGJSheetConfig, WRGJProjectSettings, WRGJUnit, WRGJVec3 } from '../core/types';
import { wrgjBuildItem, wrgjCreateItem, wrgjItemAABB, wrgjItemAxes, type WRGJCreateOpts } from '../core/items';
import { wrgjEmptyProject, wrgjKitchenPreset } from '../core/presets';
import { WRGJ_REF_MATERIAL, WRGJ_TEMPLATE_MAP } from '../core/templates';
import { wrgjNormDeg, wrgjRound } from '../core/units';
import { wrgjUid } from '../core/ids';

export type WRGJViewName = 'front' | 'top' | 'side' | 'iso';
export type WRGJGizmoMode = 'translate' | 'rotate' | 'none';
export type WRGJSceneBg = 'dark' | 'gray' | 'light';

interface WRGJState {
  project: WRGJProject;
  filePath: string | null;
  dirty: boolean;
  unit: WRGJUnit;
  mode: WRGJAppMode;
  selectedId: string | null;
  selectedPiece: string | null;
  showDims: boolean;
  dimsAll: boolean;
  assemblyStep: number | null;
  gizmo: WRGJGizmoMode;
  rotSnap: number;
  viewRequest: { view: WRGJViewName; n: number };
  sceneBg: WRGJSceneBg;
  past: WRGJSceneItem[][];
  future: WRGJSceneItem[][];
  toast: { text: string; n: number } | null;

  setUnit(u: WRGJUnit): void;
  setMode(m: WRGJAppMode): void;
  select(id: string | null, piece?: string | null): void;
  setShowDims(v: boolean): void;
  setDimsAll(v: boolean): void;
  setAssemblyStep(v: number | null): void;
  setGizmo(g: WRGJGizmoMode): void;
  setRotSnap(v: number): void;
  requestView(v: WRGJViewName): void;
  setSceneBg(b: WRGJSceneBg): void;
  notify(text: string): void;

  addItem(templateId: string, o?: WRGJCreateOpts): string;
  updateItem(id: string, patch: Partial<WRGJSceneItem>, history?: boolean): void;
  updateParam(id: string, key: string, value: WRGJParamValue): void;
  removeItem(id: string): void;
  duplicateItem(id: string): void;
  toggleItemHidden(id: string): void;
  togglePieceHidden(id: string, key: string): void;
  showAllPieces(id: string): void;
  setPieceOverride(id: string, key: string, ov: WRGJPieceOverride): void;
  resetPieceOverride(id: string, key: string): void;
  rotateItem(id: string, delta: number): void;
  alignToWall(id: string): void;
  placeNextTo(id: string, targetId: string, side: 'left' | 'right'): void;
  setAllFinishes(carcass?: string, front?: string): void;
  updateProject(patch: Partial<Pick<WRGJProject, 'name' | 'client' | 'notes'>>): void;
  setSheet(patch: Partial<WRGJSheetConfig>): void;
  setSettings(patch: Partial<WRGJProjectSettings>): void;
  newProject(withKitchen?: boolean): void;
  loadProject(p: WRGJProject, filePath: string | null): void;
  markSaved(filePath: string | null): void;
  insertKitchenPreset(): void;
  replaceItems(items: WRGJSceneItem[]): void;
  undo(): void;
  redo(): void;
}

const wrgjTouch = (p: WRGJProject, items: WRGJSceneItem[]): WRGJProject => ({ ...p, items, updatedAt: new Date().toISOString() });

export const useStore = create<WRGJState>()((set, get) => {
  /** Aplica una modificación a la lista de ítems guardando historial (deshacer). */
  const wrgjCommit = (fn: (items: WRGJSceneItem[]) => WRGJSceneItem[], history = true) =>
    set((s) => {
      const items = fn(s.project.items);
      if (items === s.project.items) return {};
      return {
        project: wrgjTouch(s.project, items),
        dirty: true,
        ...(history ? { past: [...s.past.slice(-79), s.project.items], future: [] } : {}),
      };
    });
  const wrgjMapItem = (id: string, fn: (it: WRGJSceneItem) => WRGJSceneItem, history = true) =>
    wrgjCommit((items) => items.map((it) => (it.id === id ? fn(it) : it)), history);

  return {
    project: wrgjEmptyProject('Cocina de ejemplo', wrgjKitchenPreset()),
    filePath: null,
    dirty: false,
    unit: 'mm',
    mode: 'build',
    selectedId: null,
    selectedPiece: null,
    showDims: true,
    dimsAll: false,
    assemblyStep: null,
    gizmo: 'translate',
    rotSnap: 15,
    viewRequest: { view: 'iso', n: 1 },
    sceneBg: 'light',
    past: [],
    future: [],
    toast: null,

    setUnit: (unit) => set({ unit }),
    setMode: (mode) => set({ mode, assemblyStep: null }),
    select: (selectedId, piece = null) => set({ selectedId, selectedPiece: selectedId ? piece : null }),
    setShowDims: (showDims) => set({ showDims }),
    setDimsAll: (dimsAll) => set({ dimsAll }),
    setAssemblyStep: (assemblyStep) => set({ assemblyStep }),
    setGizmo: (gizmo) => set({ gizmo }),
    setRotSnap: (rotSnap) => set({ rotSnap }),
    requestView: (view) => set((s) => ({ viewRequest: { view, n: s.viewRequest.n + 1 } })),
    setSceneBg: (sceneBg) => set({ sceneBg }),
    notify: (text) => set((s) => ({ toast: { text, n: (s.toast?.n ?? 0) + 1 } })),

    addItem: (templateId, o = {}) => {
      const t = WRGJ_TEMPLATE_MAP[templateId];
      const item = wrgjCreateItem(templateId, o);
      if (!o.position) {
        // colocar a la derecha de los módulos existentes, con el fondo alineado en z = 0
        const others = get().project.items.filter((i) => i.category === 'module' || i.category === 'piece' || i.category === 'reference');
        const size = wrgjBuildItem(item).size;
        const maxX = others.length ? Math.max(...others.map((i) => wrgjItemAABB(i).maxX)) : -size.w / 2;
        if (t.category === 'wall') item.position = [0, 0, -size.d / 2 - 200];
        else if (t.category === 'floor') item.position = [0, 0, 0];
        else item.position = [wrgjRound(maxX + size.w / 2 + (others.length ? 20 : 0)), t.defaultY ?? 0, wrgjRound(size.d / 2)];
      }
      wrgjCommit((items) => [...items, item]);
      set({ selectedId: item.id, selectedPiece: null });
      return item.id;
    },
    updateItem: (id, patch, history = true) => wrgjMapItem(id, (it) => ({ ...it, ...patch }), history),
    updateParam: (id, key, value) =>
      wrgjMapItem(id, (it) => {
        const next: WRGJSceneItem = { ...it, params: { ...it.params, [key]: value } };
        if (it.templateId === 'reference' && key === 'tipo') next.materialId = WRGJ_REF_MATERIAL[String(value)] ?? it.materialId;
        return next;
      }),
    removeItem: (id) => {
      wrgjCommit((items) => items.filter((i) => i.id !== id));
      if (get().selectedId === id) set({ selectedId: null, selectedPiece: null });
    },
    duplicateItem: (id) => {
      const src = get().project.items.find((i) => i.id === id);
      if (!src) return;
      const size = wrgjBuildItem(src).size;
      const { u } = wrgjItemAxes(src.rotationY);
      const copy: WRGJSceneItem = {
        ...structuredClone(src),
        id: wrgjUid('it'),
        name: `${src.name} (copia)`,
        position: [wrgjRound(src.position[0] + u[0] * (size.w + 20)), src.position[1], wrgjRound(src.position[2] + u[1] * (size.w + 20))],
      };
      wrgjCommit((items) => [...items, copy]);
      set({ selectedId: copy.id, selectedPiece: null });
    },
    toggleItemHidden: (id) => wrgjMapItem(id, (it) => ({ ...it, hidden: !it.hidden }), false),
    togglePieceHidden: (id, key) =>
      wrgjMapItem(id, (it) => ({ ...it, hiddenPieces: it.hiddenPieces.includes(key) ? it.hiddenPieces.filter((k) => k !== key) : [...it.hiddenPieces, key] }), false),
    showAllPieces: (id) => wrgjMapItem(id, (it) => ({ ...it, hiddenPieces: [] }), false),
    setPieceOverride: (id, key, ov) =>
      wrgjMapItem(id, (it) => {
        const cur = it.overrides[key] ?? {};
        const merged: WRGJPieceOverride = {
          ...cur,
          ...ov,
          edges: ov.edges ? { ...cur.edges, ...ov.edges } : cur.edges,
          features: ov.features ? { ...cur.features, ...ov.features } : cur.features,
        };
        return { ...it, overrides: { ...it.overrides, [key]: merged } };
      }),
    resetPieceOverride: (id, key) =>
      wrgjMapItem(id, (it) => {
        const o = { ...it.overrides };
        delete o[key];
        return { ...it, overrides: o };
      }),
    rotateItem: (id, delta) => wrgjMapItem(id, (it) => ({ ...it, rotationY: wrgjNormDeg(it.rotationY + delta) })),
    alignToWall: (id) => {
      const items = get().project.items;
      const it = items.find((i) => i.id === id);
      const walls = items.filter((i) => i.category === 'wall' && i.id !== id && !i.hidden);
      if (!it || !walls.length) {
        get().notify('No hay paredes visibles en la escena para alinear.');
        return;
      }
      const size = wrgjBuildItem(it).size;
      let best: { pos: WRGJVec3; rot: number; dist: number } | null = null;
      for (const w of walls) {
        const ws = wrgjBuildItem(w).size;
        const { u, n } = wrgjItemAxes(w.rotationY);
        const dx = it.position[0] - w.position[0];
        const dz = it.position[2] - w.position[2];
        const along = dx * u[0] + dz * u[1];
        const across = dx * n[0] + dz * n[1];
        const half = Math.max(0, ws.w / 2 - size.w / 2);
        const a = Math.max(-half, Math.min(half, along));
        const off = ws.d / 2 + size.d / 2;
        const dist = Math.abs(across - off) + Math.max(0, Math.abs(along) - ws.w / 2);
        const pos: WRGJVec3 = [wrgjRound(w.position[0] + u[0] * a + n[0] * off), it.position[1], wrgjRound(w.position[2] + u[1] * a + n[1] * off)];
        if (!best || dist < best.dist) best = { pos, rot: w.rotationY, dist };
      }
      if (best) {
        wrgjMapItem(id, (x) => ({ ...x, position: best!.pos, rotationY: best!.rot }));
        get().notify('Alineado contra la pared más cercana.');
      }
    },
    placeNextTo: (id, targetId, side) => {
      const items = get().project.items;
      const it = items.find((i) => i.id === id);
      const tg = items.find((i) => i.id === targetId);
      if (!it || !tg) return;
      const s = wrgjBuildItem(it).size;
      const ts = wrgjBuildItem(tg).size;
      const { u, n } = wrgjItemAxes(tg.rotationY);
      const sign = side === 'right' ? 1 : -1;
      const along = sign * (ts.w / 2 + s.w / 2);
      const back = -ts.d / 2 + s.d / 2;
      wrgjMapItem(id, (x) => ({
        ...x,
        rotationY: tg.rotationY,
        position: [wrgjRound(tg.position[0] + u[0] * along + n[0] * back), x.position[1], wrgjRound(tg.position[2] + u[1] * along + n[1] * back)],
      }));
    },
    setAllFinishes: (carcass, front) =>
      wrgjCommit((items) =>
        items.map((it) =>
          it.category === 'module' ? { ...it, materialId: carcass ?? it.materialId, frontMaterialId: front ?? it.frontMaterialId } : it,
        ),
      ),
    updateProject: (patch) => set((s) => ({ project: { ...s.project, ...patch }, dirty: true })),
    setSheet: (patch) => set((s) => ({ project: { ...s.project, sheet: { ...s.project.sheet, ...patch } }, dirty: true })),
    setSettings: (patch) => set((s) => ({ project: { ...s.project, settings: { ...s.project.settings, ...patch } }, dirty: true })),
    newProject: (withKitchen = false) =>
      set({
        project: wrgjEmptyProject(withKitchen ? 'Cocina de ejemplo' : 'Proyecto sin título', withKitchen ? wrgjKitchenPreset() : []),
        filePath: null, dirty: false, selectedId: null, selectedPiece: null, past: [], future: [], assemblyStep: null,
        viewRequest: { view: 'iso', n: get().viewRequest.n + 1 },
      }),
    loadProject: (project, filePath) =>
      set({ project, filePath, dirty: false, selectedId: null, selectedPiece: null, past: [], future: [], assemblyStep: null, viewRequest: { view: 'iso', n: get().viewRequest.n + 1 } }),
    markSaved: (filePath) => set({ filePath, dirty: false }),
    insertKitchenPreset: () => {
      const kit = wrgjKitchenPreset();
      const items = get().project.items;
      const maxX = items.length ? Math.max(...items.map((i) => wrgjItemAABB(i).maxX)) + 800 : 0;
      const minX = Math.min(...kit.map((i) => wrgjItemAABB(i).minX));
      const shift = items.length ? maxX - minX : 0;
      wrgjCommit((cur) => [...cur, ...kit.map((k) => ({ ...k, position: [k.position[0] + shift, k.position[1], k.position[2]] as WRGJVec3 }))]);
      set((s) => ({ viewRequest: { view: 'iso', n: s.viewRequest.n + 1 } }));
    },
    replaceItems: (items) => {
      wrgjCommit(() => items);
      set((s) => ({ selectedId: null, selectedPiece: null, viewRequest: { view: 'iso', n: s.viewRequest.n + 1 } }));
    },
    undo: () =>
      set((s) => {
        if (!s.past.length) return {};
        const prev = s.past[s.past.length - 1];
        return { project: wrgjTouch(s.project, prev), past: s.past.slice(0, -1), future: [s.project.items, ...s.future].slice(0, 80), dirty: true };
      }),
    redo: () =>
      set((s) => {
        if (!s.future.length) return {};
        const [next, ...rest] = s.future;
        return { project: wrgjTouch(s.project, next), future: rest, past: [...s.past, s.project.items], dirty: true };
      }),
  };
});
