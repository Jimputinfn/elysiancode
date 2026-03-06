const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {

  // ─── File System ───────────────────────────────────────────────────────────
  fs: {
    openFolder:  ()                     => ipcRenderer.invoke('fs:openFolder'),
    readDir:     (dirPath)              => ipcRenderer.invoke('fs:readDir', dirPath),
    readFile:    (filePath)             => ipcRenderer.invoke('fs:readFile', filePath),
    saveFile:    (filePath, content)    => ipcRenderer.invoke('fs:saveFile', filePath, content),
    saveFileAs:  (defaultPath, content) => ipcRenderer.invoke('fs:saveFileAs', defaultPath, content),
    newFile:     (dirPath)              => ipcRenderer.invoke('fs:newFile', dirPath),
    rename:      (oldPath, newName)     => ipcRenderer.invoke('fs:rename', oldPath, newName),
    delete:      (targetPath)           => ipcRenderer.invoke('fs:delete', targetPath),
    mkdir:       (dirPath)              => ipcRenderer.invoke('fs:mkdir', dirPath),
  },

  // ─── App ───────────────────────────────────────────────────────────────────
  app: {
    getVersion:  () => ipcRenderer.invoke('app:getVersion'),
    getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
    getHomedir:  () => ipcRenderer.invoke('app:getHomedir'),
  },

  // ─── Terminal ──────────────────────────────────────────────────────────────
  terminal: {
    create: (cwd)               => ipcRenderer.invoke('terminal:create', cwd),
    write:  (termId, data)      => ipcRenderer.invoke('terminal:write', termId, data),
    resize: (termId, cols, rows)=> ipcRenderer.invoke('terminal:resize', termId, cols, rows),
    kill:   (termId)            => ipcRenderer.invoke('terminal:kill', termId),
    onData: (termId, callback)  => {
      const channel = `terminal:data:${termId}`;
      const listener = (_, data) => callback(data);
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    },
    onExit: (termId, callback) => {
      const channel = `terminal:exit:${termId}`;
      const listener = () => callback();
      ipcRenderer.once(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    }
  }
});
