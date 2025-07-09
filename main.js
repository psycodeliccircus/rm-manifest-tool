const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const https = require('https');
const AdmZip = require('adm-zip');

let mainWindow;
let splashWindow;
const manifestsDir = path.join(app.getPath('userData'), 'manifests');

function ensureManifestsDir() {
  if (!fs.existsSync(manifestsDir)) fs.mkdirSync(manifestsDir, { recursive: true });
}

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 650,
    height: 620,
    frame: false,
    transparent: false,
    resizable: false,
    alwaysOnTop: true,
    center: true,
    show: true,
    icon: "icons/icon.png",
    webPreferences: { devTools: false }
  });

  splashWindow.loadFile('splash.html');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 569,
    icon: "icons/icon.png",
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.setMenu(null);
}

app.whenReady().then(() => {
  ensureManifestsDir();
  createSplash();
  createWindow();
  setTimeout(() => {
    mainWindow.show();
    if (splashWindow) splashWindow.close();
  }, 1500);

  // Checa update automaticamente ao abrir
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 1600);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ============ AutoUpdate EVENTS ============
autoUpdater.on('checking-for-update', () => {
  if (mainWindow) mainWindow.webContents.send('status-update', { msg: 'Procurando atualização...', type: 'info' });
});
autoUpdater.on('update-available', info => {
  if (mainWindow) mainWindow.webContents.send('update-available', {
    latestVersion: info.version,
    changelog: info.releaseNotes || '',
  });
  if (mainWindow) mainWindow.webContents.send('status-update', { msg: 'Nova versão encontrada, baixando...', type: 'info' });
});
autoUpdater.on('update-not-available', info => {
  if (mainWindow) mainWindow.webContents.send('status-update', { msg: 'Nenhuma atualização encontrada.', type: 'info' });
});
autoUpdater.on('download-progress', progressObj => {
  if (mainWindow) mainWindow.webContents.send('download-progress', progressObj.percent);
});
autoUpdater.on('update-downloaded', info => {
  if (mainWindow) mainWindow.webContents.send('status-update', { msg: 'Atualização baixada! Reinicie o app para atualizar.', type: 'success' });
  if (mainWindow) mainWindow.webContents.send('update-downloaded');
});

// Força update (botão manual)
ipcMain.on('check-update', () => {
  autoUpdater.checkForUpdates();
});
ipcMain.on('restart-app', () => {
  autoUpdater.quitAndInstall();
});

ipcMain.on('window-minimize', () => mainWindow.minimize());
ipcMain.on('window-close', () => mainWindow.close());

// ============ Funções principais do app ============

// Abrir links externos no navegador padrão
ipcMain.on('open-link', (event, url) => {
  shell.openExternal(url);
});

ipcMain.on('add-app', async (_event, data) => {
  ensureManifestsDir();
  const win = mainWindow;
  const appId = String(data.appId || '').trim();
  const branch = "public";
  win.webContents.send('status-update', { msg: `Baixando manifest do AppID ${appId}...`, type: 'info' });
  if (!appId) {
    win.webContents.send('status-update', { msg: 'Por favor, insira um App ID válido.', type: 'error' });
    return;
  }
  try {
    const url = `https://generator.renildomarcio.com.br/download.php?appid=${appId}&branch=${branch}`;
    const tmpFile = path.join(os.tmpdir(), `rm_${appId}.zip`);
    const destDir = path.join(manifestsDir, appId);

    await new Promise((resolve, reject) => {
      const file = fs.createWriteStream(tmpFile);
      let total = 0, received = 0;
      https.get(url, res => {
        if (res.statusCode !== 200) {
          let errorMsg = '';
          res.setEncoding('utf8');
          res.on('data', chunk => { errorMsg += chunk; });
          res.on('end', () => {
            if (!errorMsg) errorMsg = `Status: ${res.statusCode}`;
            win.webContents.send('status-update', { msg: errorMsg.trim(), type: 'error' });
            reject(new Error(errorMsg.trim()));
          });
          return;
        }
        total = parseInt(res.headers['content-length'] || '0');
        res.on('data', chunk => {
          received += chunk.length;
          if (total > 0) {
            let percent = Math.round((received / total) * 100);
            win.webContents.send('download-progress', percent);
          }
        });
        res.pipe(file);
        file.once('finish', () => file.close(resolve));
      }).on('error', err => {
        win.webContents.send('status-update', { msg: `Erro de conexão: ${err.message}`, type: 'error' });
        reject(err);
      });
    });

    win.webContents.send('download-progress', 100);
    win.webContents.send('status-update', { msg: 'Download finalizado. Extraindo arquivos...', type: 'info' });

    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    const zip = new AdmZip(tmpFile);
    zip.extractAllTo(destDir, true);
    fs.unlinkSync(tmpFile);

    win.webContents.send('add-app-complete', { appId, destDir });
    win.webContents.send('status-update', { msg: `Manifest do AppID ${appId} extraído em /manifests/${appId}`, type: 'success' });
  } catch (err) {
    win.webContents.send('status-update', { msg: `Erro: ${err.message}`, type: 'error' });
  }
});

ipcMain.on('remove-app', (_event, appId) => {
  const destDir = path.join(manifestsDir, String(appId));
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true, force: true });
    mainWindow.webContents.send('status-update', { msg: `Arquivos do AppID ${appId} removidos.`, type: 'success' });
  } else {
    mainWindow.webContents.send('status-update', { msg: `Nenhum arquivo encontrado para AppID ${appId}.`, type: 'error' });
  }
});

ipcMain.on('update-all', async () => {
  ensureManifestsDir();
  const appIds = fs.readdirSync(manifestsDir).filter(id =>
    fs.statSync(path.join(manifestsDir, id)).isDirectory()
  );
  if (!appIds.length) {
    mainWindow.webContents.send('status-update', { msg: 'Nenhum AppID baixado para atualizar.', type: 'info' });
    return;
  }
  mainWindow.webContents.send('status-update', { msg: `Atualizando todos os AppIDs (${appIds.length})...`, type: 'info' });
  for (let i = 0; i < appIds.length; ++i) {
    const appId = appIds[i];
    mainWindow.webContents.send('status-update', { msg: `Atualizando AppID ${appId} (${i+1}/${appIds.length})...`, type: 'info' });
    await new Promise(res => setTimeout(res, 500));
    ipcMain.emit('add-app', null, { appId });
  }
  mainWindow.webContents.send('status-update', { msg: 'Todos os AppIDs foram atualizados.', type: 'success' });
});

ipcMain.on('restart-steam', () => {
  mainWindow.webContents.send('status-update', { msg: 'Reiniciando Steam...', type: 'info' });
  const clear = () => mainWindow.webContents.send('status-update', { msg: '', type: 'info' });
  const done = () => {
    mainWindow.webContents.send('status-update', { msg: 'Steam reiniciada!', type: 'success' });
    setTimeout(clear, 2500);
  };
  if (process.platform === 'win32') {
    exec('taskkill /IM steam.exe /F', () => exec('start "" "steam://open/main"', done));
  } else if (process.platform === 'darwin') {
    exec('osascript -e \'tell application "Steam" to quit\'', () => exec('open -a Steam', done));
  } else {
    exec('pkill steam', () => exec('steam', done));
  }
});
