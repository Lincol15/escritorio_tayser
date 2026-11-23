/*
 * ==================================================
 * Proyecto desarrollado por: 4BYTES
 * Equipo de desarrollo de software
 * Proyecto: Tayser - Diseño paramétrico 3D y optimización de cortes
 * Archivo: electron/preload.cjs
 * Descripción: Puente seguro (preload) entre la interfaz y el sistema de archivos.
 * ==================================================
 */
// Puente seguro (contextIsolation) entre el renderer y el sistema de archivos local.
const { contextBridge, ipcRenderer } = require('electron');

// ==================================================
// 4BYTES - Equipo de desarrollo
// Sección: Exponer el puente window.tayser a la interfaz
// ==================================================
contextBridge.exposeInMainWorld('tayser', {
  isElectron: true,
  saveProject: (args) => ipcRenderer.invoke('tayser:save-project', args),
  openProject: () => ipcRenderer.invoke('tayser:open-project'),
  saveFile: (args) => ipcRenderer.invoke('tayser:save-file', args),
});
