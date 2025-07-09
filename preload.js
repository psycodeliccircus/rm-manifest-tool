const { contextBridge, ipcRenderer } = require('electron');

function on(channel, callback) {
  ipcRenderer.on(channel, (_event, data) => callback(data));
}

contextBridge.exposeInMainWorld('electronAPI', {
  addApp:         (appId)   => ipcRenderer.send('add-app', { appId }),
  removeApp:      (appId)   => ipcRenderer.send('remove-app', appId),
  updateAll:      ()        => ipcRenderer.send('update-all'),
  restartSteam:   ()        => ipcRenderer.send('restart-steam'),
  checkUpdate:    ()        => ipcRenderer.send('check-update'),
  restartApp:     ()        => ipcRenderer.send('restart-app'),
  openLink:       (url)     => ipcRenderer.send('open-link', url),
  onUpdateAvailable:   cb   => on('update-available', cb),
  onUpdateDownloaded:  cb   => on('update-downloaded', cb),
  onStatusUpdate:      cb   => on('status-update', cb),
  onDownloadProgress:  cb   => on('download-progress', cb),
  onAddAppComplete:    cb   => on('add-app-complete', cb)
});
