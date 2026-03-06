const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Keep a global reference to prevent GC
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#1e1e1e',
    titleBarStyle: process.platform === 'linux' ? 'default' : 'hidden',
    titleBarOverlay: process.platform !== 'linux' ? {
      color: '#252526',
      symbolColor: '#cccccc',
      height: 32
    } : false,
    frame: true,
    show: false,
    icon: path.join(__dirname, '../../assets/icons/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true, // Enable <webview> tag
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (process.argv.includes('--dev')) {
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── IPC: File System ───────────────────────────────────────────────────────

ipcMain.handle('fs:openFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});

ipcMain.handle('fs:readDir', async (event, dirPath) => {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    return entries.map(e => ({
      name: e.name,
      path: path.join(dirPath, e.name),
      isDirectory: e.isDirectory(),
      ext: e.isFile() ? path.extname(e.name).slice(1) : null
    })).sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('fs:readFile', async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { content, path: filePath };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('fs:saveFile', async (event, filePath, content) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('fs:saveFileAs', async (event, defaultPath, content) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath,
    filters: [{ name: 'All Files', extensions: ['*'] }]
  });
  if (result.canceled) return null;
  try {
    fs.writeFileSync(result.filePath, content, 'utf-8');
    return { success: true, path: result.filePath };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('fs:newFile', async (event, dirPath) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: path.join(dirPath || os.homedir(), 'untitled.txt'),
    filters: [{ name: 'All Files', extensions: ['*'] }]
  });
  if (result.canceled) return null;
  try {
    fs.writeFileSync(result.filePath, '', 'utf-8');
    return { success: true, path: result.filePath };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('fs:rename', async (event, oldPath, newName) => {
  try {
    const dir = path.dirname(oldPath);
    const newPath = path.join(dir, newName);
    fs.renameSync(oldPath, newPath);
    return { success: true, newPath };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('fs:delete', async (event, targetPath) => {
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    message: `Delete "${path.basename(targetPath)}"?`,
    detail: 'This action cannot be undone.',
    buttons: ['Delete', 'Cancel'],
    defaultId: 1
  });
  if (result.response !== 0) return { canceled: true };
  try {
    fs.rmSync(targetPath, { recursive: true, force: true });
    return { success: true };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('fs:mkdir', async (event, dirPath) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: path.join(dirPath || os.homedir(), 'new-folder'),
    title: 'Create New Folder',
    buttonLabel: 'Create'
  });
  if (result.canceled) return null;
  try {
    fs.mkdirSync(result.filePath, { recursive: true });
    return { success: true, path: result.filePath };
  } catch (err) {
    return { error: err.message };
  }
});

// ─── IPC: App info ──────────────────────────────────────────────────────────

ipcMain.handle('app:getVersion', () => app.getVersion());
ipcMain.handle('app:getPlatform', () => process.platform);
ipcMain.handle('app:getHomedir', () => os.homedir());

// ─── IPC: Terminal ──────────────────────────────────────────────────────────

const terminals = new Map();
let termIdCounter = 0;

ipcMain.handle('terminal:create', (event, cwd) => {
  try {
    const pty = require('node-pty');
    const shell = process.platform === 'win32' ? 'cmd.exe' : (process.env.SHELL || '/bin/bash');
    const termId = ++termIdCounter;
    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: cwd || os.homedir(),
      env: process.env
    });
    terminals.set(termId, ptyProcess);
    ptyProcess.onData(data => {
      if (!mainWindow?.isDestroyed()) {
        mainWindow.webContents.send(`terminal:data:${termId}`, data);
      }
    });
    ptyProcess.onExit(() => {
      terminals.delete(termId);
      if (!mainWindow?.isDestroyed()) {
        mainWindow.webContents.send(`terminal:exit:${termId}`);
      }
    });
    return { termId };
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('terminal:write', (event, termId, data) => {
  const pty = terminals.get(termId);
  if (pty) pty.write(data);
});

ipcMain.handle('terminal:resize', (event, termId, cols, rows) => {
  const pty = terminals.get(termId);
  if (pty) pty.resize(cols, rows);
});

ipcMain.handle('terminal:kill', (event, termId) => {
  const pty = terminals.get(termId);
  if (pty) { pty.kill(); terminals.delete(termId); }
});
