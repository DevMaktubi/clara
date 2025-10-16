'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('clara', {
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  scan: (params) => ipcRenderer.invoke('renamer:scan', params),
  run: (params) => ipcRenderer.invoke('renamer:run', params),
  undo: (params) => ipcRenderer.invoke('renamer:undo', params),
  onLog: (cb) => {
    const listener = (_event, msg) => cb(msg);
    ipcRenderer.on('log:message', listener);
    return () => ipcRenderer.off('log:message', listener);
  }
});
