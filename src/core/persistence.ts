/*
 * ==================================================
 * Proyecto desarrollado por: 4BYTES
 * Equipo de desarrollo de software
 * Proyecto: Tayser - Diseño paramétrico 3D y optimización de cortes
 * Archivo: src/core/persistence.ts
 * Descripción: Persistencia: archivos .tayser e IndexedDB.
 * ==================================================
 */
// ===================== Persistencia local: archivos .tayser (IPC) + IndexedDB (respaldo) =====================
import type { Project } from './types';

const DB_NAME = 'tayser';
const STORE = 'autosave';

// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Abrir la base local IndexedDB de respaldo
// ==================================================
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Guardar un valor en el respaldo local
// ==================================================
export async function idbSave(key: string, value: unknown): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (e) {
    console.warn('[Tayser] IndexedDB no disponible', e);
  }
}

// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Leer un valor del respaldo local
// ==================================================
export async function idbLoad<T>(key: string): Promise<T | null> {
  try {
    const db = await openDb();
    const v = await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const r = tx.objectStore(STORE).get(key);
      r.onsuccess = () => resolve((r.result as T) ?? null);
      r.onerror = () => reject(r.error);
    });
    db.close();
    return v;
  } catch {
    return null;
  }
}

// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Convertir el proyecto a texto JSON
// ==================================================
export function serializeProject(p: Project): string {
  return JSON.stringify({ ...p, updatedAt: new Date().toISOString() }, null, 2);
}

// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Leer y validar un proyecto desde texto JSON
// ==================================================
export function parseProject(text: string): Project {
  const data = JSON.parse(text);
  if (!data || data.format !== 'tayser' || !Array.isArray(data.items)) throw new Error('El archivo no es un proyecto Tayser válido.');
  return {
    ...data,
    sheet: { length: 2440, width: 1220, kerf: 4, trim: 10, algorithm: 'auto', ...(data.sheet ?? {}) },
    settings: { discountEdges: false, edgeWastePct: 10, ...(data.settings ?? {}) },
  } as Project;
}

// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Descargar un archivo desde el navegador
// ==================================================
function downloadBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Guardar el proyecto como archivo .tayser
// ==================================================
export async function saveProjectFile(p: Project, filePath: string | null, saveAs: boolean): Promise<string | null> {
  const content = serializeProject(p);
  const defaultName = `${p.name.replace(/[\\/:*?"<>|]+/g, '_') || 'proyecto'}.tayser`;
  if (window.tayser?.isElectron) return window.tayser.saveProject({ content, filePath, saveAs, defaultName });
  downloadBlob(defaultName, new Blob([content], { type: 'application/json' }));
  return defaultName;
}

// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Abrir un archivo de proyecto .tayser
// ==================================================
export async function openProjectFile(): Promise<{ project: Project; filePath: string | null } | null> {
  if (window.tayser?.isElectron) {
    const res = await window.tayser.openProject();
    if (!res) return null;
    return { project: parseProject(res.content), filePath: res.filePath };
  }
  const file = await pickFile('.tayser,.json');
  if (!file) return null;
  return { project: parseProject(await file.text()), filePath: null };
}

// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Abrir el selector de archivos del navegador
// ==================================================
export function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}

// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Guardar un archivo binario (PDF, PNG) en el disco
// ==================================================
export async function saveBinaryFile(
  defaultName: string, data: Uint8Array | string, mime: string, filters: { name: string; extensions: string[] }[],
): Promise<string | null> {
  if (window.tayser?.isElectron) return window.tayser.saveFile({ defaultName, data, filters });
  const part: BlobPart = typeof data === 'string' ? data : new Uint8Array(data);
  downloadBlob(defaultName, new Blob([part], { type: mime }));
  return defaultName;
}

// ==================================================
// 4BYTES - Equipo de desarrollo
// Función: Convertir una imagen data URL a bytes
// ==================================================
export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const b64 = dataUrl.split(',')[1] ?? '';
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
