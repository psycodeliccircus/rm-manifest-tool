// main.js - RM Manifest Generator
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const os = require('os');
const https = require('https');
const AdmZip = require('adm-zip');

let mainWindow;
let splashWindow;
const manifestsDir = path.join(app.getPath('userData'), 'manifests');

const REGISTRY_PATH = 'HKCU\\Software\\Valve\\Steam';

// Função para localizar a pasta da Steam (Windows)
function getSteamPath() {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') return resolve(null);

    // Tenta pelo registro do Windows
    exec(`reg query "${REGISTRY_PATH}" /v SteamPath`, (err, stdout) => {
      if (!err && stdout) {
        const match = stdout.match(/SteamPath\s+REG_SZ\s+([^\r\n]+)/);
        if (match && match[1]) {
          return resolve(match[1].trim().replace(/\\/g, '/'));
        }
      }
      // Se não achar no registro, tenta nos caminhos comuns
      const candidates = [
        'C:/Program Files (x86)/Steam',
        'C:/Program Files/Steam'
      ];
      for (const dir of candidates) {
        if (fs.existsSync(dir)) return resolve(dir);
      }
      // Não achou
      resolve(null);
    });
  });
}

// Função para copiar arquivos extraídos para as pastas certas da Steam
async function copyExtractedFiles(appId, sourceDir) {
  const steamPath = await getSteamPath();
  if (!steamPath) {
    safeSend('status-update', { msg: 'Não foi possível localizar a pasta da Steam.', type: 'error' });
    return;
  }
  // Destinos
  const stpluginDir = path.join(steamPath, 'config', 'stplug-in');
  const depotcacheDir = path.join(steamPath, 'config', 'depotcache');

  // Cria os diretórios se não existirem
  fse.ensureDirSync(stpluginDir);
  fse.ensureDirSync(depotcacheDir);

  // Copia arquivos .lua, .st e .manifest
  const files = fs.readdirSync(sourceDir);
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const src = path.join(sourceDir, file);

    if (ext === '.lua' || ext === '.st') {
      const dest = path.join(stpluginDir, file);
      await fse.copy(src, dest, { overwrite: true });
    }
    if (ext === '.manifest') {
      const dest = path.join(depotcacheDir, file);
      await fse.copy(src, dest, { overwrite: true });
    }
  }
}

// Envia eventos com segurança
function safeSend(channel, ...args) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args);
  }
}

// Cria o diretório de manifests, se não existir
function ensureManifestsDir() {
  if (!fs.existsSync(manifestsDir)) fs.mkdirSync(manifestsDir, { recursive: true });
}

// Cria splash e mainWindow (main só aparece após timeout do splash)
function createSplashAndMain() {
  splashWindow = new BrowserWindow({
    width: 650,
    height: 620,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    center: true,
    show: true,
    icon: "icons/icon.png",
    webPreferences: { devTools: false }
  });
  splashWindow.loadFile('splash.html');

  mainWindow = new BrowserWindow({
    width: 600,
    height: 569,
    icon: "icons/icon.png",
    show: false, // Só mostra depois do splash
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.loadFile('index.html');
  mainWindow.setMenu(null);

  // Exibe a janela principal após splash
  setTimeout(() => {
    if (splashWindow) splashWindow.close();
    mainWindow.show();
  }, 10000); // 10000ms = 10 segundos (ajuste como quiser)
}

// App: inicialização
app.whenReady().then(() => {
  ensureManifestsDir();
  createSplashAndMain();

  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 1600);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ================== AUTOUPDATE ===================
autoUpdater.on('checking-for-update', () => {
  safeSend('status-update', { msgKey: 'checking_update', type: 'info' });
});
autoUpdater.on('update-available', info => {
  safeSend('update-available', {
    latestVersion: info.version,
    changelog: info.releaseNotes || '',
  });
  safeSend('status-update', { msgKey: 'new_version_found', type: 'info' });
});
autoUpdater.on('update-not-available', info => {
  safeSend('status-update', { msgKey: 'no_update_found', type: 'info' });
});
autoUpdater.on('download-progress', progressObj => {
  safeSend('download-progress', progressObj.percent);
});
autoUpdater.on('update-downloaded', info => {
  safeSend('status-update', { msgKey: 'update_downloaded', type: 'success' });
  safeSend('update-downloaded');
});

// Update manual (botão)
ipcMain.on('check-update', () => {
  autoUpdater.checkForUpdates();
});
ipcMain.on('restart-app', () => {
  setTimeout(() => autoUpdater.quitAndInstall(), 500);
});

// ================== APP FUNCIONALIDADES ===================

// Abrir links externos
ipcMain.on('open-link', (event, url) => {
  shell.openExternal(url);
});

// Baixar e extrair manifest + copiar arquivos para a Steam
ipcMain.on('add-app', async (_event, data) => {
  ensureManifestsDir();
  const appId = String(data.appId || '').trim();
  const branch = "public";
  if (!appId) {
    safeSend('status-update', { msgKey: 'please_enter_appid', type: 'error' });
    return;
  }
  safeSend('status-update', { msgKey: 'downloading', type: 'info', vars: { appId } });
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
            safeSend('status-update', { msg: errorMsg.trim(), type: 'error' });
            reject(new Error(errorMsg.trim()));
          });
          return;
        }
        total = parseInt(res.headers['content-length'] || '0');
        res.on('data', chunk => {
          received += chunk.length;
          if (total > 0) {
            let percent = Math.round((received / total) * 100);
            safeSend('download-progress', percent);
          }
        });
        res.pipe(file);
        file.once('finish', () => file.close(resolve));
      }).on('error', err => {
        safeSend('status-update', { msg: `Erro de conexão: ${err.message}`, type: 'error' });
        reject(err);
      });
    });

    safeSend('download-progress', 100);

    // Mensagem: download finalizado
    safeSend('status-update', { msgKey: 'download_finished', type: 'success', vars: { appId } });

    // Mensagem: extraindo arquivos
    safeSend('status-update', { msgKey: 'extracting', type: 'info' });

    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    const zip = new AdmZip(tmpFile);
    zip.extractAllTo(destDir, true);
    fs.unlinkSync(tmpFile);

    // Copia os arquivos extraídos para as pastas corretas da Steam!
    await copyExtractedFiles(appId, destDir);

    // Mensagem final: peça para reiniciar a Steam
    safeSend('status-update', { msgKey: 'please_restart_steam', type: 'success' });

    safeSend('add-app-complete', { appId, destDir });
  } catch (err) {
    safeSend('status-update', { msg: `Erro: ${err.message}`, type: 'error' });
  }
});

// Remover app
ipcMain.on('remove-app', (_event, appId) => {
  const destDir = path.join(manifestsDir, String(appId));
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true, force: true });
    safeSend('status-update', { msgKey: 'removed', type: 'success', vars: { appId } });
  } else {
    safeSend('status-update', { msgKey: 'not_found', type: 'error', vars: { appId } });
  }
});

// Atualizar todos os manifests
ipcMain.on('update-all', async () => {
  ensureManifestsDir();
  const appIds = fs.readdirSync(manifestsDir).filter(id =>
    fs.statSync(path.join(manifestsDir, id)).isDirectory()
  );
  if (!appIds.length) {
    safeSend('status-update', { msgKey: 'no_appids_to_update', type: 'info' });
    return;
  }
  safeSend('status-update', { msgKey: 'updating_all', type: 'info', vars: { total: appIds.length } });
  for (let i = 0; i < appIds.length; ++i) {
    const appId = appIds[i];
    safeSend('status-update', { msgKey: 'updating_appid', type: 'info', vars: { appId, index: i+1, total: appIds.length } });
    await new Promise(res => setTimeout(res, 500));
    ipcMain.emit('add-app', null, { appId });
  }
  safeSend('status-update', { msgKey: 'all_updated', type: 'success' });
});

// Reiniciar Steam
ipcMain.on('restart-steam', () => {
  safeSend('status-update', { msgKey: 'restarting_steam', type: 'info' });
  const clear = () => safeSend('status-update', { msg: '', type: 'info' });
  const done = () => {
    safeSend('status-update', { msgKey: 'steam_restarted', type: 'success' });
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
