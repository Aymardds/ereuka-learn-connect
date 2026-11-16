const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  retryConnection: () => ipcRenderer.send('retry-connection'),
  getVersion: () => ipcRenderer.invoke('get-app-version')
});
