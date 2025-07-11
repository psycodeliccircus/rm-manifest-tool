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
      setStatus(t('please_enter_appid'), 'error');
      return;
    }
    setStatus(t('downloading', { appId }), 'info');
    progressBar.value = 0;
    progressBar.style.display = '';
    if (window.electronAPI && window.electronAPI.addApp) {
      window.electronAPI.addApp(appId);
    }
  };

  btnRemove.onclick = () => {
    const appId = appidInput.value.trim();
    if (!appId) {
      setStatus(t('please_enter_appid'), 'error');
      return;
    }
    setStatus(t('removing', { appId }), 'info');
    progressBar.style.display = 'none';
    window.electronAPI.removeApp(appId);
  };

  btnUpdate.onclick = () => {
    setStatus(t('updating_all'), 'info');
    progressBar.style.display = 'none';
    window.electronAPI.updateAll();
  };

  btnRestart.onclick = () => {
    setStatus(t('restarting_steam'), 'info');
    progressBar.style.display = 'none';
    window.electronAPI.restartSteam();
  };

  btnGithubUpdate.onclick = () => {
    setStatus(t('checking_update'), 'info');
    progressBar.style.display = '';
    window.electronAPI.checkUpdate();
  };

  document.querySelectorAll('[data-url]').forEach(link => {
    link.addEventListener('click', evt => {
      evt.preventDefault();
      const url = link.getAttribute('data-url');
      if (window.electronAPI && url) window.electronAPI.openLink(url);
    });
  });

  function showChangelog({latestVersion, changelog}) {
    mainButtons.style.opacity = '0.3';
    mainButtons.style.pointerEvents = 'none';

    changelogContent.innerHTML = `
      <div style="margin-bottom:8px;">
        <span style="font-weight:bold;color:var(--primary-color)">${t('version')}</span> <span style="font-weight:bold;">v${latestVersion}</span>
      </div>
      <div style="max-height:220px;overflow-y:auto;padding:2px 0 2px 4px;font-size:15px;line-height:1.6;">
        ${changelog ? changelog.replace(/\n/g, "<br>") : t('no_changelog')}
      </div>
    `;
    changelogModal.style.display = "flex";
    setTimeout(() => closeChangelog.focus(), 180);

    btnUpdateNow.onclick = () => {
      setStatus(t('updating_now'), 'info', false);
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

  // ---- ATUALIZAÇÃO: agora trata msgKey e msg! ----
  if (window.electronAPI) {
    window.electronAPI.onStatusUpdate(data => {
      if (data.msgKey) {
        setStatus(t(data.msgKey, data.vars), data.type || 'info', data.autoClear !== false);
      } else if (data.msg) {
        setStatus(data.msg, data.type || 'info', data.autoClear !== false);
      }
      if ((!data.msg && !data.msgKey) || data.type === 'success' || data.type === 'error') {
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
      setStatus(t('extracted', { appId: data.appId }), 'success');
    });
    window.electronAPI.onUpdateAvailable(data => {
      showChangelog(data);
    });
    window.electronAPI.onUpdateDownloaded(() => {
      setStatus(t('update_downloaded'), 'success', false);
      setTimeout(() => window.electronAPI.restartApp(), 1500);
    });
  }
});
