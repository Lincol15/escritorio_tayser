/*
 * Proyecto:    Tayser 1.0.0
 * Archivo:     src/core/persistence.ts
 * Autores:     LWYC, RCO, GDMS, JDAP
 * Descripción: Guardado de archivos .tayser y respaldo en IndexedDB.
 */
// Persistencia local: archivos .tayser (IPC) + IndexedDB (respaldo)
import type { WRGJProject } from './types';

const WRGJ_DB_NAME = 'tayser';
const WRGJ_STORE = 'autosave';

function wrgjOpenDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(WRGJ_DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(WRGJ_STORE)) req.result.createObjectStore(WRGJ_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function wrgjIdbSave(key: string, value: unknown): Promise<void> {
  try {
    const db = await wrgjOpenDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(WRGJ_STORE, 'readwrite');
      tx.objectStore(WRGJ_STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (e) {
    console.warn('[Tayser] IndexedDB no disponible', e);
  }
}

export async function wrgjIdbLoad<T>(key: string): Promise<T | null> {
  try {
    const db = await wrgjOpenDb();
    const v = await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(WRGJ_STORE, 'readonly');
      const r = tx.objectStore(WRGJ_STORE).get(key);
      r.onsuccess = () => resolve((r.result as T) ?? null);
      r.onerror = () => reject(r.error);
    });
    db.close();
    return v;
  } catch {
    return null;
  }
}

export function wrgjSerializeProject(p: WRGJProject): string {
  return JSON.stringify({ ...p, updatedAt: new Date().toISOString() }, null, 2);
}

export function wrgjParseProject(text: string): WRGJProject {
  const data = JSON.parse(text);
  if (!data || data.format !== 'tayser' || !Array.isArray(data.items)) throw new Error('El archivo no es un proyecto Tayser válido.');
  return {
    ...data,
    sheet: { length: 2440, width: 1220, kerf: 4, trim: 10, algorithm: 'auto', ...(data.sheet ?? {}) },
    settings: { discountEdges: false, edgeWastePct: 10, ...(data.settings ?? {}) },
  } as WRGJProject;
}

function wrgjDownloadBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function wrgjSaveProjectFile(p: WRGJProject, filePath: string | null, saveAs: boolean): Promise<string | null> {
  const content = wrgjSerializeProject(p);
  const defaultName = `${p.name.replace(/[\\/:*?"<>|]+/g, '_') || 'proyecto'}.tayser`;
  if (window.tayser?.isElectron) return window.tayser.saveProject({ content, filePath, saveAs, defaultName });
  wrgjDownloadBlob(defaultName, new Blob([content], { type: 'application/json' }));
  return defaultName;
}

export async function wrgjOpenProjectFile(): Promise<{ project: WRGJProject; filePath: string | null } | null> {
  if (window.tayser?.isElectron) {
    const res = await window.tayser.openProject();
    if (!res) return null;
    return { project: wrgjParseProject(res.content), filePath: res.filePath };
  }
  const file = await wrgjPickFile('.tayser,.json');
  if (!file) return null;
  return { project: wrgjParseProject(await file.text()), filePath: null };
}

export function wrgjPickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}

export async function wrgjSaveBinaryFile(
  defaultName: string, data: Uint8Array | string, mime: string, filters: { name: string; extensions: string[] }[],
): Promise<string | null> {
  if (window.tayser?.isElectron) return window.tayser.saveFile({ defaultName, data, filters });
  const part: BlobPart = typeof data === 'string' ? data : new Uint8Array(data);
  wrgjDownloadBlob(defaultName, new Blob([part], { type: mime }));
  return defaultName;
}

export function wrgjDataUrlToBytes(dataUrl: string): Uint8Array {
  const b64 = dataUrl.split(',')[1] ?? '';
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
