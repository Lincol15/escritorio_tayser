// Puente seguro (contextIsolation) entre el renderer y el sistema de archivos local.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tayser', {
  isElectron: true,
  saveProject: (args) => ipcRenderer.invoke('tayser:save-project', args),
  openProject: () => ipcRenderer.invoke('tayser:open-project'),
  saveFile: (args) => ipcRenderer.invoke('tayser:save-file', args),
});
