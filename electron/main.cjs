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

const DEV_URL = process.env.VITE_DEV_SERVER_URL || null;
let win = null;

function isAllowed(url) {
  if (url.startsWith('file://') || url.startsWith('devtools://') || url.startsWith('data:') || url.startsWith('blob:')) return true;
  if (url.startsWith('chrome-extension://') || url.startsWith('chrome://')) return true;
  if (DEV_URL && (url.startsWith('http://127.0.0.1:5173') || url.startsWith('ws://127.0.0.1:5173'))) return true;
  return false;
}

function createWindow() {
  win = new BrowserWindow({
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

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e, url) => {
    if (!isAllowed(url)) e.preventDefault();
  });

  if (DEV_URL) win.loadURL(DEV_URL);
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(() => {
  // Bloqueo de red: se cancela cualquier URL externa
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    callback({ cancel: !isAllowed(details.url) });
  });

  ipcMain.handle('tayser:save-project', async (_e, args) => {
    let filePath = args && args.filePath;
    if (!filePath || args.saveAs) {
      const res = await dialog.showSaveDialog(win, {
        title: 'Guardar proyecto Tayser',
        defaultPath: (args && args.defaultName) || 'proyecto.tayser',
        filters: [{ name: 'Proyecto Tayser', extensions: ['tayser'] }],
      });
      if (res.canceled || !res.filePath) return null;
      filePath = res.filePath;
    }
    await fs.writeFile(filePath, args.content, 'utf8');
    return filePath;
  });

  ipcMain.handle('tayser:open-project', async () => {
    const res = await dialog.showOpenDialog(win, {
      title: 'Abrir proyecto Tayser',
      properties: ['openFile'],
      filters: [{ name: 'Proyecto Tayser', extensions: ['tayser', 'json'] }],
    });
    if (res.canceled || !res.filePaths.length) return null;
    const filePath = res.filePaths[0];
    const content = await fs.readFile(filePath, 'utf8');
    return { filePath, content };
  });

  ipcMain.handle('tayser:save-file', async (_e, args) => {
    const res = await dialog.showSaveDialog(win, {
      title: 'Exportar',
      defaultPath: args.defaultName,
      filters: args.filters || [{ name: 'Todos', extensions: ['*'] }],
    });
    if (res.canceled || !res.filePath) return null;
    const data = typeof args.data === 'string' ? Buffer.from(args.data, 'utf8') : Buffer.from(args.data);
    await fs.writeFile(res.filePath, data);
    return res.filePath;
  });

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
