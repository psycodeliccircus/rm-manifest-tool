const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  addApp: (appId) => ipcRenderer.send('add-app', { appId }),
  removeApp: (appId) => ipcRenderer.send('remove-app', appId),
  updateAll: () => ipcRenderer.send('update-all'),
  restartSteam: () => ipcRenderer.send('restart-steam'),
  checkUpdate: () => ipcRenderer.send('check-update'),
  restartApp: () => ipcRenderer.send('restart-app'),
  openLink: url => ipcRenderer.send('open-link', url),
  minimize: () => ipcRenderer.send('window-minimize'),
  close: () => ipcRenderer.send('window-close'),
  onUpdateAvailable: cb => ipcRenderer.on('update-available', (_e, data) => cb(data)),
  onUpdateDownloaded: cb => ipcRenderer.on('update-downloaded', cb),
  onStatusUpdate: cb => ipcRenderer.on('status-update', (_e, data) => cb(data)),
  onDownloadProgress: cb => ipcRenderer.on('download-progress', (_e, percent) => cb(percent)),
  onAddAppComplete: cb => ipcRenderer.on('add-app-complete', (_e, data) => cb(data))
});
