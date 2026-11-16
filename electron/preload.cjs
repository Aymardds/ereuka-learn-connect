const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  retryConnection: () => ipcRenderer.send('retry-connection'),
  getVersion: () => ipcRenderer.invoke('get-app-version'),
  getActiveServer: () => ipcRenderer.invoke('get-active-server'),
  getServerStatus: () => ipcRenderer.invoke('get-server-status'),
  connectToServer: (url) => ipcRenderer.send('connect-to-server', url),
  promptCustomServer: () => ipcRenderer.send('prompt-custom-server')
});
