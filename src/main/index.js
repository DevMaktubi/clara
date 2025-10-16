import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Renamer } from './rename.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
const renamer = new Renamer();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1040,
    height: 700,
    title: 'CLARA',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  renamer.on('log', (msg) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('log:message', msg);
    }
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle('dialog:openDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  if (result.canceled || !result.filePaths?.length) return null;
  return result.filePaths[0];
});

ipcMain.handle('renamer:scan', async (_evt, { dir, extension }) => {
  return renamer.scan({ dir, extension });
});

ipcMain.handle('renamer:run', async (_evt, { dir, extension, startNumber }) => {
  return renamer.run({ dir, extension, startNumber });
});

ipcMain.handle('renamer:undo', async (_evt, { operationId }) => {
  return renamer.undo({ operationId });
});
