/*
 * ==================================================
 * Proyecto desarrollado por: 4BYTES
 * Equipo de desarrollo de software
 * Proyecto: Tayser - Diseño paramétrico 3D y optimización de cortes
 * Archivo: src/store/useStore.ts
 * Descripción: Estado global de la aplicación (Zustand).
 * ==================================================
 */
import { create } from 'zustand';
import type { AppMode, ParamValue, PieceOverride, Project, SceneItem, SheetConfig, ProjectSettings, Unit, Vec3 } from '../core/types';
import { buildItem, createItem, itemAABB, itemAxes, type CreateOpts } from '../core/items';
import { emptyProject, kitchenPreset } from '../core/presets';
import { REF_MATERIAL, TEMPLATE_MAP } from '../core/templates';
import { normDeg, round } from '../core/units';
import { uid } from '../core/ids';

export type ViewName = 'front' | 'top' | 'side' | 'iso';
export type GizmoMode = 'translate' | 'rotate' | 'none';
export type SceneBg = 'dark' | 'gray' | 'light';

interface State {
  project: Project;
  filePath: string | null;
  dirty: boolean;
  unit: Unit;
  mode: AppMode;
  selectedId: string | null;
  selectedPiece: string | null;
  showDims: boolean;
  dimsAll: boolean;
  assemblyStep: number | null;
  gizmo: GizmoMode;
  rotSnap: number;
  viewRequest: { view: ViewName; n: number };
  sceneBg: SceneBg;
  past: SceneItem[][];
  future: SceneItem[][];
  toast: { text: string; n: number } | null;

  setUnit(u: Unit): void;
  setMode(m: AppMode): void;
  select(id: string | null, piece?: string | null): void;
  setShowDims(v: boolean): void;
  setDimsAll(v: boolean): void;
  setAssemblyStep(v: number | null): void;
  setGizmo(g: GizmoMode): void;
  setRotSnap(v: number): void;
  requestView(v: ViewName): void;
  setSceneBg(b: SceneBg): void;
  notify(text: string): void;

  addItem(templateId: string, o?: CreateOpts): string;
  updateItem(id: string, patch: Partial<SceneItem>, history?: boolean): void;
  updateParam(id: string, key: string, value: ParamValue): void;
  removeItem(id: string): void;
  duplicateItem(id: string): void;
  toggleItemHidden(id: string): void;
  togglePieceHidden(id: string, key: string): void;
  showAllPieces(id: string): void;
  setPieceOverride(id: string, key: string, ov: PieceOverride): void;
  resetPieceOverride(id: string, key: string): void;
  rotateItem(id: string, delta: number): void;
  alignToWall(id: string): void;
  placeNextTo(id: string, targetId: string, side: 'left' | 'right'): void;
  setAllFinishes(carcass?: string, front?: string): void;
  updateProject(patch: Partial<Pick<Project, 'name' | 'client' | 'notes'>>): void;
  setSheet(patch: Partial<SheetConfig>): void;
  setSettings(patch: Partial<ProjectSettings>): void;
  newProject(withKitchen?: boolean): void;
  loadProject(p: Project, filePath: string | null): void;
  markSaved(filePath: string | null): void;
  insertKitchenPreset(): void;
  replaceItems(items: SceneItem[]): void;
  undo(): void;
  redo(): void;
}

// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Actualizar los ítems del proyecto y su fecha de modificación
// ==================================================
const touch = (p: Project, items: SceneItem[]): Project => ({ ...p, items, updatedAt: new Date().toISOString() });

// ==================================================
// 4BYTES - Equipo de desarrollo
// Sección: Estado global: escena, selección, historial y acciones
// ==================================================
export const useStore = create<State>()((set, get) => {
  /**
   * Aplica una modificación a la lista de ítems guardando historial (deshacer).
   * @author 4BYTES - Equipo de desarrollo
   */
  const commit = (fn: (items: SceneItem[]) => SceneItem[], history = true) =>
    set((s) => {
      const items = fn(s.project.items);
      if (items === s.project.items) return {};
      return {
        project: touch(s.project, items),
        dirty: true,
        ...(history ? { past: [...s.past.slice(-79), s.project.items], future: [] } : {}),
      };
    });
  const mapItem = (id: string, fn: (it: SceneItem) => SceneItem, history = true) =>
    commit((items) => items.map((it) => (it.id === id ? fn(it) : it)), history);

  return {
    project: emptyProject('Cocina de ejemplo', kitchenPreset()),
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

    // ==================================================
    // 4BYTES - Equipo de desarrollo
    // Método: Configuración de vista: unidad, modo, selección, cotas, gizmo y avisos
    // ==================================================
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

    // ==================================================
    // 4BYTES - Equipo de desarrollo
    // Método: Agregar un mueble del catálogo a la escena
    // ==================================================
    addItem: (templateId, o = {}) => {
      const t = TEMPLATE_MAP[templateId];
      const item = createItem(templateId, o);
      if (!o.position) {
        // colocar a la derecha de los módulos existentes, con el fondo alineado en z = 0
        const others = get().project.items.filter((i) => i.category === 'module' || i.category === 'piece' || i.category === 'reference');
        const size = buildItem(item).size;
        const maxX = others.length ? Math.max(...others.map((i) => itemAABB(i).maxX)) : -size.w / 2;
        if (t.category === 'wall') item.position = [0, 0, -size.d / 2 - 200];
        else if (t.category === 'floor') item.position = [0, 0, 0];
        else item.position = [round(maxX + size.w / 2 + (others.length ? 20 : 0)), t.defaultY ?? 0, round(size.d / 2)];
      }
      commit((items) => [...items, item]);
      set({ selectedId: item.id, selectedPiece: null });
      return item.id;
    },
    // ==================================================
    // 4BYTES - Equipo de desarrollo
    // Método: Modificar un mueble y sus parámetros
    // ==================================================
    updateItem: (id, patch, history = true) => mapItem(id, (it) => ({ ...it, ...patch }), history),
    updateParam: (id, key, value) =>
      mapItem(id, (it) => {
        const next: SceneItem = { ...it, params: { ...it.params, [key]: value } };
        if (it.templateId === 'reference' && key === 'tipo') next.materialId = REF_MATERIAL[String(value)] ?? it.materialId;
        return next;
      }),
    // ==================================================
    // 4BYTES - Equipo de desarrollo
    // Método: Eliminar un mueble de la escena
    // ==================================================
    removeItem: (id) => {
      commit((items) => items.filter((i) => i.id !== id));
      if (get().selectedId === id) set({ selectedId: null, selectedPiece: null });
    },
    // ==================================================
    // 4BYTES - Equipo de desarrollo
    // Método: Duplicar un mueble junto al original
    // ==================================================
    duplicateItem: (id) => {
      const src = get().project.items.find((i) => i.id === id);
      if (!src) return;
      const size = buildItem(src).size;
      const { u } = itemAxes(src.rotationY);
      const copy: SceneItem = {
        ...structuredClone(src),
        id: uid('it'),
        name: `${src.name} (copia)`,
        position: [round(src.position[0] + u[0] * (size.w + 20)), src.position[1], round(src.position[2] + u[1] * (size.w + 20))],
      };
      commit((items) => [...items, copy]);
      set({ selectedId: copy.id, selectedPiece: null });
    },
    // ==================================================
    // 4BYTES - Equipo de desarrollo
    // Método: Mostrar u ocultar muebles y piezas
    // ==================================================
    toggleItemHidden: (id) => mapItem(id, (it) => ({ ...it, hidden: !it.hidden }), false),
    togglePieceHidden: (id, key) =>
      mapItem(id, (it) => ({ ...it, hiddenPieces: it.hiddenPieces.includes(key) ? it.hiddenPieces.filter((k) => k !== key) : [...it.hiddenPieces, key] }), false),
    showAllPieces: (id) => mapItem(id, (it) => ({ ...it, hiddenPieces: [] }), false),
    // ==================================================
    // 4BYTES - Equipo de desarrollo
    // Método: Guardar o restablecer los ajustes de una pieza
    // ==================================================
    setPieceOverride: (id, key, ov) =>
      mapItem(id, (it) => {
        const cur = it.overrides[key] ?? {};
        const merged: PieceOverride = {
          ...cur,
          ...ov,
          edges: ov.edges ? { ...cur.edges, ...ov.edges } : cur.edges,
          features: ov.features ? { ...cur.features, ...ov.features } : cur.features,
        };
        return { ...it, overrides: { ...it.overrides, [key]: merged } };
      }),
    resetPieceOverride: (id, key) =>
      mapItem(id, (it) => {
        const o = { ...it.overrides };
        delete o[key];
        return { ...it, overrides: o };
      }),
    // ==================================================
    // 4BYTES - Equipo de desarrollo
    // Método: Rotar un mueble en el eje vertical
    // ==================================================
    rotateItem: (id, delta) => mapItem(id, (it) => ({ ...it, rotationY: normDeg(it.rotationY + delta) })),
    // ==================================================
    // 4BYTES - Equipo de desarrollo
    // Método: Alinear un mueble contra la pared más cercana
    // ==================================================
    alignToWall: (id) => {
      const items = get().project.items;
      const it = items.find((i) => i.id === id);
      const walls = items.filter((i) => i.category === 'wall' && i.id !== id && !i.hidden);
      if (!it || !walls.length) {
        get().notify('No hay paredes visibles en la escena para alinear.');
        return;
      }
      const size = buildItem(it).size;
      let best: { pos: Vec3; rot: number; dist: number } | null = null;
      for (const w of walls) {
        const ws = buildItem(w).size;
        const { u, n } = itemAxes(w.rotationY);
        const dx = it.position[0] - w.position[0];
        const dz = it.position[2] - w.position[2];
        const along = dx * u[0] + dz * u[1];
        const across = dx * n[0] + dz * n[1];
        const half = Math.max(0, ws.w / 2 - size.w / 2);
        const a = Math.max(-half, Math.min(half, along));
        const off = ws.d / 2 + size.d / 2;
        const dist = Math.abs(across - off) + Math.max(0, Math.abs(along) - ws.w / 2);
        const pos: Vec3 = [round(w.position[0] + u[0] * a + n[0] * off), it.position[1], round(w.position[2] + u[1] * a + n[1] * off)];
        if (!best || dist < best.dist) best = { pos, rot: w.rotationY, dist };
      }
      if (best) {
        mapItem(id, (x) => ({ ...x, position: best!.pos, rotationY: best!.rot }));
        get().notify('Alineado contra la pared más cercana.');
      }
    },
    // ==================================================
    // 4BYTES - Equipo de desarrollo
    // Método: Pegar un mueble a la izquierda o derecha de otro
    // ==================================================
    placeNextTo: (id, targetId, side) => {
      const items = get().project.items;
      const it = items.find((i) => i.id === id);
      const tg = items.find((i) => i.id === targetId);
      if (!it || !tg) return;
      const s = buildItem(it).size;
      const ts = buildItem(tg).size;
      const { u, n } = itemAxes(tg.rotationY);
      const sign = side === 'right' ? 1 : -1;
      const along = sign * (ts.w / 2 + s.w / 2);
      const back = -ts.d / 2 + s.d / 2;
      mapItem(id, (x) => ({
        ...x,
        rotationY: tg.rotationY,
        position: [round(tg.position[0] + u[0] * along + n[0] * back), x.position[1], round(tg.position[2] + u[1] * along + n[1] * back)],
      }));
    },
    // ==================================================
    // 4BYTES - Equipo de desarrollo
    // Método: Cambiar los acabados de estructura y frentes de todos los muebles
    // ==================================================
    setAllFinishes: (carcass, front) =>
      commit((items) =>
        items.map((it) =>
          it.category === 'module' ? { ...it, materialId: carcass ?? it.materialId, frontMaterialId: front ?? it.frontMaterialId } : it,
        ),
      ),
    // ==================================================
    // 4BYTES - Equipo de desarrollo
    // Método: Modificar datos, tablero y ajustes del proyecto
    // ==================================================
    updateProject: (patch) => set((s) => ({ project: { ...s.project, ...patch }, dirty: true })),
    setSheet: (patch) => set((s) => ({ project: { ...s.project, sheet: { ...s.project.sheet, ...patch } }, dirty: true })),
    setSettings: (patch) => set((s) => ({ project: { ...s.project, settings: { ...s.project.settings, ...patch } }, dirty: true })),
    // ==================================================
    // 4BYTES - Equipo de desarrollo
    // Método: Crear, cargar y marcar como guardado un proyecto
    // ==================================================
    newProject: (withKitchen = false) =>
      set({
        project: emptyProject(withKitchen ? 'Cocina de ejemplo' : 'Proyecto sin título', withKitchen ? kitchenPreset() : []),
        filePath: null, dirty: false, selectedId: null, selectedPiece: null, past: [], future: [], assemblyStep: null,
        viewRequest: { view: 'iso', n: get().viewRequest.n + 1 },
      }),
    loadProject: (project, filePath) =>
      set({ project, filePath, dirty: false, selectedId: null, selectedPiece: null, past: [], future: [], assemblyStep: null, viewRequest: { view: 'iso', n: get().viewRequest.n + 1 } }),
    markSaved: (filePath) => set({ filePath, dirty: false }),
    // ==================================================
    // 4BYTES - Equipo de desarrollo
    // Método: Insertar la plantilla de cocina lineal
    // ==================================================
    insertKitchenPreset: () => {
      const kit = kitchenPreset();
      const items = get().project.items;
      const maxX = items.length ? Math.max(...items.map((i) => itemAABB(i).maxX)) + 800 : 0;
      const minX = Math.min(...kit.map((i) => itemAABB(i).minX));
      const shift = items.length ? maxX - minX : 0;
      commit((cur) => [...cur, ...kit.map((k) => ({ ...k, position: [k.position[0] + shift, k.position[1], k.position[2]] as Vec3 }))]);
      set((s) => ({ viewRequest: { view: 'iso', n: s.viewRequest.n + 1 } }));
    },
    // ==================================================
    // 4BYTES - Equipo de desarrollo
    // Método: Reemplazar todos los muebles de la escena
    // ==================================================
    replaceItems: (items) => {
      commit(() => items);
      set((s) => ({ selectedId: null, selectedPiece: null, viewRequest: { view: 'iso', n: s.viewRequest.n + 1 } }));
    },
    // ==================================================
    // 4BYTES - Equipo de desarrollo
    // Método: Deshacer y rehacer cambios
    // ==================================================
    undo: () =>
      set((s) => {
        if (!s.past.length) return {};
        const prev = s.past[s.past.length - 1];
        return { project: touch(s.project, prev), past: s.past.slice(0, -1), future: [s.project.items, ...s.future].slice(0, 80), dirty: true };
      }),
    redo: () =>
      set((s) => {
        if (!s.future.length) return {};
        const [next, ...rest] = s.future;
        return { project: touch(s.project, next), future: rest, past: [...s.past, s.project.items], dirty: true };
      }),
  };
});
