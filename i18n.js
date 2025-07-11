// i18n.js
const translations = {
  "pt-BR": {
    brand: "RM Manifests",
    home: "Início",
    input_placeholder: "App ID ou nome...",
    status_ready: "Pronto",
    download: "Download Manifest",
    remove: "Remover",
    update_all: "Atualizar Todos",
    restart_steam: "Reiniciar Steam",
    modal_title: "Novidades da nova versão",
    update_now: "Atualizar Agora",

    please_enter_appid: "Por favor, insira um App ID válido.",
    downloading: "Baixando manifest para AppID {appId}...",
    download_finished: "Arquivo baixado com sucesso!",
    extracting: "Extraindo arquivos...",
    extracted: "Manifest extraído em /manifests/{appId}",
    removed: "Arquivos do AppID {appId} removidos.",
    not_found: "Nenhum arquivo encontrado para AppID {appId}.",
    no_appids_to_update: "Nenhum AppID baixado para atualizar.",
    updating_all: "Atualizando todos os AppIDs ({total})...",
    updating_appid: "Atualizando AppID {appId} ({index}/{total})...",
    all_updated: "Todos os AppIDs foram atualizados.",
    restarting_steam: "Reiniciando Steam...",
    steam_restarted: "Steam reiniciada!",
    checking_update: "Verificando atualização no GitHub...",
    new_version_found: "Nova versão encontrada, baixando...",
    no_update_found: "Nenhuma atualização encontrada.",
    update_downloaded: "Atualização baixada! O app será reiniciado.",
    version: "Versão:",
    updating_now: "Atualizando agora...",
    please_restart_steam: "Arquivos prontos! Por favor, reinicie a Steam ou clique no botão abaixo.",
    no_changelog: "Sem changelog desta vez!"
  },
  "en": {
    brand: "RM Manifests",
    home: "Home",
    input_placeholder: "App ID or name...",
    status_ready: "Ready",
    download: "Download Manifest",
    remove: "Remove",
    update_all: "Update All",
    restart_steam: "Restart Steam",
    modal_title: "What's New in This Version",
    update_now: "Update Now",

    please_enter_appid: "Please enter a valid App ID.",
    downloading: "Downloading manifest for AppID {appId}...",
    download_finished: "File downloaded successfully!",
    extracting: "Extracting files...",
    extracted: "Manifest extracted to /manifests/{appId}",
    removed: "Files for AppID {appId} removed.",
    not_found: "No files found for AppID {appId}.",
    no_appids_to_update: "No downloaded AppIDs to update.",
    updating_all: "Updating all AppIDs ({total})...",
    updating_appid: "Updating AppID {appId} ({index}/{total})...",
    all_updated: "All AppIDs have been updated.",
    restarting_steam: "Restarting Steam...",
    steam_restarted: "Steam restarted!",
    checking_update: "Checking for updates on GitHub...",
    new_version_found: "New version found, downloading...",
    no_update_found: "No updates found.",
    update_downloaded: "Update downloaded! The app will restart.",
    version: "Version:",
    updating_now: "Updating now...",
    please_restart_steam: "Files are ready! Please restart Steam or click the button below.",
    no_changelog: "No changelog this time!"
  },
  "es": {
    brand: "RM Manifests",
    home: "Inicio",
    input_placeholder: "App ID o nombre...",
    status_ready: "Listo",
    download: "Descargar Manifest",
    remove: "Eliminar",
    update_all: "Actualizar Todos",
    restart_steam: "Reiniciar Steam",
    modal_title: "Novedades de la nueva versión",
    update_now: "Actualizar Ahora",

    please_enter_appid: "Por favor, ingrese un App ID válido.",
    downloading: "Descargando manifest para AppID {appId}...",
    download_finished: "¡Archivo descargado con éxito!",
    extracting: "Extrayendo archivos...",
    extracted: "Manifest extraído en /manifests/{appId}",
    removed: "Archivos del AppID {appId} eliminados.",
    not_found: "No se encontraron archivos para AppID {appId}.",
    no_appids_to_update: "No hay AppIDs descargados para actualizar.",
    updating_all: "Actualizando todos los AppIDs ({total})...",
    updating_appid: "Actualizando AppID {appId} ({index}/{total})...",
    all_updated: "Todos los AppIDs han sido actualizados.",
    restarting_steam: "Reiniciando Steam...",
    steam_restarted: "¡Steam reiniciada!",
    checking_update: "Buscando actualizaciones en GitHub...",
    new_version_found: "Nueva versión encontrada, descargando...",
    no_update_found: "No se encontraron actualizaciones.",
    update_downloaded: "¡Actualización descargada! La app se reiniciará.",
    version: "Versión:",
    updating_now: "Actualizando ahora...",
    please_restart_steam: "¡Archivos listos! Por favor, reinicie Steam o haga clic en el botón abajo.",
    no_changelog: "¡Sin changelog esta vez!"
  }
};

function t(key, vars = {}) {
  let lang = localStorage.getItem('lang') || navigator.language || 'pt-BR';
  lang = lang in translations ? lang : 'pt-BR';
  let txt = translations[lang][key] || translations['pt-BR'][key] || key;
  Object.keys(vars).forEach(k => {
    txt = txt.replace(`{${k}}`, vars[k]);
  });
  return txt;
}

function applyTranslations(lang) {
  const dict = translations[lang] || translations['pt-BR'];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) el.textContent = dict[key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key]) el.setAttribute('placeholder', dict[key]);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const langSelector = document.getElementById('lang-selector');
  let currentLang = localStorage.getItem('lang') || (navigator.language.startsWith('en') ? 'en' : navigator.language.startsWith('es') ? 'es' : 'pt-BR');
  langSelector.value = currentLang;
  applyTranslations(currentLang);

  langSelector.addEventListener('change', (e) => {
    localStorage.setItem('lang', e.target.value);
    applyTranslations(e.target.value);
    location.reload();
  });
});
