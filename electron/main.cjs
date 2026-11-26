/*
 * Proyecto:    Tayser 1.0.0
 * Archivo:     electron/main.cjs
 * Autores:     LWYC, RCO, GDMS, JDAP
 * Descripción: Proceso principal de Electron: ventana, bloqueo de red y diálogos para guardar y abrir archivos.
 */
// Proceso principal de Electron. La aplicación trabaja sin conexión y bloquea las peticiones de red externas.
const { app, BrowserWindow, ipcMain, dialog, session } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');

const WRGJ_DEV_URL = process.env.VITE_DEV_SERVER_URL || null;
let wrgjWin = null;

function wrgjIsAllowed(url) {
  if (url.startsWith('file://') || url.startsWith('devtools://') || url.startsWith('data:') || url.startsWith('blob:')) return true;
  if (url.startsWith('chrome-extension://') || url.startsWith('chrome://')) return true;
  if (WRGJ_DEV_URL && (url.startsWith('http://127.0.0.1:5173') || url.startsWith('ws://127.0.0.1:5173'))) return true;
  return false;
}

function wrgjCreateWindow() {
  wrgjWin = new BrowserWindow({
    width: 1600,
    height: 950,
    minWidth: 1100,
    minHeight: 700,
    title: 'Tayser',
    backgroundColor: '#0b0e13',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  wrgjWin.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  wrgjWin.webContents.on('will-navigate', (e, url) => {
    if (!wrgjIsAllowed(url)) e.preventDefault();
  });

  if (WRGJ_DEV_URL) wrgjWin.loadURL(WRGJ_DEV_URL);
  else wrgjWin.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(() => {
  // Bloqueo de red: se cancela cualquier URL externa
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    callback({ cancel: !wrgjIsAllowed(details.url) });
  });

  ipcMain.handle('tayser:save-project', async (_e, wrgjArgs) => {
    let wrgjFilePath = wrgjArgs && wrgjArgs.filePath;
    if (!wrgjFilePath || wrgjArgs.saveAs) {
      const wrgjRes = await dialog.showSaveDialog(wrgjWin, {
        title: 'Guardar proyecto Tayser',
        defaultPath: (wrgjArgs && wrgjArgs.defaultName) || 'proyecto.tayser',
        filters: [{ name: 'Proyecto Tayser', extensions: ['tayser'] }],
      });
      if (wrgjRes.canceled || !wrgjRes.filePath) return null;
      wrgjFilePath = wrgjRes.filePath;
    }
    await fs.writeFile(wrgjFilePath, wrgjArgs.content, 'utf8');
    return wrgjFilePath;
  });

  ipcMain.handle('tayser:open-project', async () => {
    const wrgjRes = await dialog.showOpenDialog(wrgjWin, {
      title: 'Abrir proyecto Tayser',
      properties: ['openFile'],
      filters: [{ name: 'Proyecto Tayser', extensions: ['tayser', 'json'] }],
    });
    if (wrgjRes.canceled || !wrgjRes.filePaths.length) return null;
    const wrgjFilePath = wrgjRes.filePaths[0];
    const wrgjContent = await fs.readFile(wrgjFilePath, 'utf8');
    return { filePath: wrgjFilePath, content: wrgjContent };
  });

  ipcMain.handle('tayser:save-file', async (_e, wrgjArgs) => {
    const wrgjRes = await dialog.showSaveDialog(wrgjWin, {
      title: 'Exportar',
      defaultPath: wrgjArgs.defaultName,
      filters: wrgjArgs.filters || [{ name: 'Todos', extensions: ['*'] }],
    });
    if (wrgjRes.canceled || !wrgjRes.filePath) return null;
    const wrgjData = typeof wrgjArgs.data === 'string' ? Buffer.from(wrgjArgs.data, 'utf8') : Buffer.from(wrgjArgs.data);
    await fs.writeFile(wrgjRes.filePath, wrgjData);
    return wrgjRes.filePath;
  });

  wrgjCreateWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) wrgjCreateWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
