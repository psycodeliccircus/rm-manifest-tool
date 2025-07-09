document.addEventListener('DOMContentLoaded', () => {
  const btnDownload = document.getElementById('btn-download');
  const btnRemove   = document.getElementById('btn-remove');
  const btnUpdate   = document.getElementById('btn-update');
  const btnRestart  = document.getElementById('btn-restart');
  const btnGithubUpdate = document.getElementById('btn-github-update');
  const appidInput  = document.getElementById('appid');
  const statusBar   = document.getElementById('status');
  const progressBar = document.getElementById('progressBar');
  const changelogModal = document.getElementById('changelog-modal');
  const changelogContent = document.getElementById('changelog-content');
  const closeChangelog = document.getElementById('close-changelog');
  const btnUpdateNow = document.getElementById('btn-update-now');
  const mainButtons = document.getElementById('main-buttons');
  let statusTimeout = null;

  function setStatus(msg, type = 'info', autoClear = true) {
    statusBar.textContent = msg;
    statusBar.className = 'status';
    statusBar.classList.add(type);
    statusBar.style.display = msg ? 'flex' : 'none';
    if (statusTimeout) clearTimeout(statusTimeout);
    if (msg && autoClear && type !== 'error') {
      statusTimeout = setTimeout(() => {
        statusBar.style.display = 'none';
        progressBar.style.display = 'none';
        statusTimeout = null;
      }, 2500);
    }
    if (msg && autoClear && type === 'error') {
      statusTimeout = setTimeout(() => {
        statusBar.style.display = 'none';
        progressBar.style.display = 'none';
        statusTimeout = null;
      }, 5000);
    }
  }

  btnDownload.onclick = () => {
    const appId = appidInput.value.trim();
    if (!appId) {
      setStatus('Por favor, insira um App ID válido.', 'error');
      return;
    }
    setStatus(`Baixando manifest para AppID ${appId}...`, 'info');
    progressBar.value = 0;
    progressBar.style.display = '';
    if (window.electronAPI && window.electronAPI.addApp) {
      window.electronAPI.addApp(appId);
    }
  };

  btnRemove.onclick = () => {
    const appId = appidInput.value.trim();
    if (!appId) {
      setStatus('Por favor, insira um App ID válido.', 'error');
      return;
    }
    setStatus(`Removendo arquivos de AppID ${appId}...`, 'info');
    progressBar.style.display = 'none';
    window.electronAPI.removeApp(appId);
  };

  btnUpdate.onclick = () => {
    setStatus('Atualizando todos os AppIDs...', 'info');
    progressBar.style.display = 'none';
    window.electronAPI.updateAll();
  };

  btnRestart.onclick = () => {
    setStatus('Reiniciando Steam...', 'info');
    progressBar.style.display = 'none';
    window.electronAPI.restartSteam();
  };

  btnGithubUpdate.onclick = () => {
    setStatus('Verificando atualização no GitHub...', 'info');
    progressBar.style.display = '';
    window.electronAPI.checkUpdate();
  };

  // Links externos (navegação)
  document.querySelectorAll('[data-url]').forEach(link => {
    link.addEventListener('click', evt => {
      evt.preventDefault();
      const url = link.getAttribute('data-url');
      if (window.electronAPI && url) window.electronAPI.openLink(url);
    });
  });

  function showChangelog({latestVersion, changelog}) {
    // Esconde os botões principais
    mainButtons.style.opacity = '0.3';
    mainButtons.style.pointerEvents = 'none';

    changelogContent.innerHTML = `
      <div style="margin-bottom:8px;">
        <span style="font-weight:bold;color:var(--primary-color)">Versão:</span> <span style="font-weight:bold;">v${latestVersion}</span>
      </div>
      <div style="max-height:220px;overflow-y:auto;padding:2px 0 2px 4px;font-size:15px;line-height:1.6;">
        ${changelog ? changelog.replace(/\n/g, "<br>") : "Sem changelog desta vez!"}
      </div>
    `;
    changelogModal.style.display = "flex";
    setTimeout(() => closeChangelog.focus(), 180);

    btnUpdateNow.onclick = () => {
      setStatus('Atualizando agora...', 'info', false);
      progressBar.value = 0;
      progressBar.style.display = '';
      if (window.electronAPI && window.electronAPI.restartApp)
        window.electronAPI.restartApp();
      hideChangelog();
    };

    document.querySelector('.modal-backdrop').onclick = hideChangelog;
    closeChangelog.onclick = hideChangelog;
    closeChangelog.onkeydown = e => {
      if (e.key === "Enter" || e.key === " " || e.key === "Escape") hideChangelog();
    };

    // Fecha ao pressionar Esc
    document.onkeydown = function(e){
      if(e.key === 'Escape') hideChangelog();
    };

    function hideChangelog(){
      changelogModal.style.display = "none";
      mainButtons.style.opacity = '';
      mainButtons.style.pointerEvents = '';
      document.onkeydown = null;
    }
  }

  // SÓ aparece quando há atualização detectada
  if (window.electronAPI) {
    window.electronAPI.onStatusUpdate(data => {
      setStatus(data.msg, data.type || 'info');
      if (!data.msg) {
        progressBar.style.display = 'none';
      }
    });
    window.electronAPI.onDownloadProgress(percent => {
      progressBar.style.display = '';
      progressBar.value = percent;
      if (percent >= 100) setTimeout(() => {
        progressBar.style.display = 'none';
        progressBar.value = 0;
      }, 700);
    });
    window.electronAPI.onAddAppComplete(data => {
      setStatus(`Manifest extraído em /manifests/${data.appId}`, 'success');
    });
    // <-- Aqui o modal é mostrado automaticamente!
    window.electronAPI.onUpdateAvailable(data => {
      showChangelog(data);
    });
    window.electronAPI.onUpdateDownloaded(() => {
      setStatus('Atualização baixada! O app será reiniciado.', 'success', false);
      setTimeout(() => window.electronAPI.restartApp(), 1500);
    });
  }
});
