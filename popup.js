'use strict';

const titleInput = document.getElementById('filmTitle');
const typeSelect = document.getElementById('mediaType');
const scopeSelect = document.getElementById('discussionScope');
const seasonInput = document.getElementById('seasonNumber');
const episodeInput = document.getElementById('episodeNumber');
const languageSelect = document.getElementById('language');
const statusEl = document.getElementById('status');
const detailEl = document.getElementById('filmDetail');
const alternativeEl = document.getElementById('alternatives');
const eksiBtn = document.getElementById('eksiBtn');
const redditBtn = document.getElementById('redditBtn');
const letterboxdBtn = document.getElementById('letterboxdBtn');
const routeEl = document.getElementById('letterboxdRoute');
const eksiRouteEl = document.getElementById('eksiRoute');
const languageStatusEl = document.getElementById('languageStatus');
const redditRouteEl = document.getElementById('redditRoute');
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const settingsStatusEl = document.getElementById('settingsStatus');
const watchPanel = document.getElementById('watchPanel');
const platformInputs = {eksi:document.getElementById('eksiEnabled'),reddit:document.getElementById('redditEnabled')};
let browserLanguage = 'en';
try {
  const locale = chrome.i18n?.getUILanguage?.();
  if (typeof locale === 'string') browserLanguage = AfterWatchI18n.supportedLanguage(locale.toLowerCase().split('-')[0]);
} catch { /* English is usable if the browser language API is unavailable. */ }
let detected = FilmTools.detectMedia({});
let opening = false;
let edited = false;
let language = browserLanguage;
let languageRevision = 0;
let languageSaveFailed = false;
let enabledPlatforms = browserLanguage === 'tr' ? ['eksi'] : ['reddit'];
let platformRevision = 0;
let platformSaveFailed = false;
let preferencesLoadFailed = false;
let preferencesReady = false;
let saveQueue = Promise.resolve();
let statusKey = 'reading';

const t = (key, params) => AfterWatchI18n.translate(language,key,params);
function currentTitle() { return FilmTools.normalizeText(titleInput.value); }
function context() { return {scope:scopeSelect.value,season:seasonInput.value,episode:episodeInput.value}; }
function usesIdentity() { return Boolean(typeSelect.value === 'movie' && detected.type === 'movie' && detected.imdbId && currentTitle() === detected.title); }
function validDiscussion() {
  try { FilmTools.discussionQuery(currentTitle(),typeSelect.value,context()); return true; } catch { return false; }
}
function refresh() {
  const type = typeSelect.value;
  const valid = FilmTools.isValidTitle(currentTitle());
  for (const [platform, button] of [['eksi',eksiBtn],['reddit',redditBtn]]) {
    button.hidden = !enabledPlatforms.includes(platform);
    button.disabled = opening || !preferencesReady || button.hidden || !validDiscussion();
    platformInputs[platform].checked = enabledPlatforms.includes(platform);
  }
  watchPanel.classList.toggle('many-platforms',enabledPlatforms.length > 1);
  letterboxdBtn.disabled = opening || !valid;
  routeEl.textContent = t(type === 'movie' ? usesIdentity() ? 'letterboxdId' : 'letterboxdSearch' : 'letterboxdTv');
  document.getElementById('episodeControls').hidden = type !== 'episode';
  document.getElementById('spoilerNote').hidden = type === 'movie';
  document.getElementById('titleLabel').textContent = t(type === 'episode' ? 'seriesTitleLabel' : 'titleLabel');
  const season = FilmTools.episodeNumber(seasonInput.value,true);
  const episode = FilmTools.episodeNumber(episodeInput.value);
  eksiRouteEl.textContent = type === 'movie' ? '' : type === 'episode' && scopeSelect.value === 'episode'
    ? season === '' || episode === '' ? t('episodeMissing') : t('eksiEpisode',{title:currentTitle(),season,episode})
    : t('eksiSeries');
  redditRouteEl.textContent = type === 'episode' && scopeSelect.value === 'episode' && (season === '' || episode === '')
    ? t('episodeMissing') : valid ? t('redditSearch',{query:FilmTools.discussionQuery(currentTitle(),type,context(),'reddit')}) : '';
  const matches = detected.type === type && detected.titles.includes(currentTitle()) &&
    (type !== 'episode' || season === detected.season && episode === detected.episode);
  detailEl.textContent = matches ? [t(type), detected.year,
    type === 'episode' ? t('episodeDetail',{season:season || t('unknown'),episode:episode || t('unknown')}) : '',
    detected.episodeTitle, t(detected.sourceKey)].filter(Boolean).join(' · ') : '';
  statusEl.textContent = t(statusKey);
  languageStatusEl.hidden = !languageSaveFailed;
  languageStatusEl.textContent = languageSaveFailed ? t('languageSaveFailed') : '';
  settingsStatusEl.hidden = !platformSaveFailed && !preferencesLoadFailed;
  settingsStatusEl.textContent = platformSaveFailed ? t('platformSaveFailed') : preferencesLoadFailed ? t('settingsLoadFailed') : '';
}
function applyLanguage() {
  languageSelect.value = language;
  AfterWatchI18n.applyLanguage(document,language);
  refresh();
}
for (const [node,event] of [[titleInput,'input'],[typeSelect,'change'],[scopeSelect,'change'],[seasonInput,'input'],[episodeInput,'input']]) {
  node.addEventListener(event, () => { edited = true; statusKey = 'entered'; refresh(); });
}
languageSelect.addEventListener('change', () => {
  language = AfterWatchI18n.supportedLanguage(languageSelect.value);
  const chosen = language;
  const revision = ++languageRevision;
  languageSaveFailed = false;
  applyLanguage();
  // Serialize writes so rapid language changes cannot save an older choice last.
  saveQueue = saveQueue.then(() => chrome.storage.local.set({language:chosen})).catch(() => {
    if (revision === languageRevision) { languageSaveFailed = true; refresh(); }
  });
});
function savePlatforms() {
  const chosen = [...enabledPlatforms];
  const revision = platformRevision;
  platformSaveFailed = false;
  saveQueue = saveQueue.then(() => chrome.storage.local.set({enabledPlatforms:chosen})).catch(() => {
    if (revision === platformRevision) { platformSaveFailed = true; refresh(); }
  });
}
function showSettings(show) {
  settingsPanel.hidden = !show;
  watchPanel.hidden = show;
  settingsBtn.setAttribute('aria-expanded',String(show));
  (show ? settingsPanel : settingsBtn).focus();
}
settingsBtn.addEventListener('click',() => showSettings(settingsPanel.hidden));
document.getElementById('closeSettings').addEventListener('click',() => showSettings(false));
document.addEventListener('keydown',event => {
  if (event.key === 'Escape' && !settingsPanel.hidden) { event.preventDefault(); showSettings(false); }
});
for (const [platform,input] of Object.entries(platformInputs)) {
  input.addEventListener('change',() => {
    platformRevision++;
    enabledPlatforms = enabledPlatforms.filter(value => value !== platform);
    if (input.checked) enabledPlatforms.push(platform);
    savePlatforms();
    refresh();
  });
}
async function loadPreferences() {
  try {
    const saved = await chrome.storage.local.get(['language','enabledPlatforms']);
    if (!languageRevision) language = typeof saved.language === 'string' ? AfterWatchI18n.supportedLanguage(saved.language) : browserLanguage;
    if (!platformRevision) {
      if (Array.isArray(saved.enabledPlatforms) && saved.enabledPlatforms.length <= 2 &&
        saved.enabledPlatforms.every(value => ['eksi','reddit'].includes(value))) {
        enabledPlatforms = [...new Set(saved.enabledPlatforms)];
      } else {
        // Existing installations used Ekşi. Keep their destination even with an English UI.
        enabledPlatforms = typeof saved.language === 'string' ? ['eksi'] : browserLanguage === 'tr' ? ['eksi'] : ['reddit'];
        savePlatforms();
      }
    }
    applyLanguage();
  } catch { preferencesLoadFailed = true; }
  finally { preferencesReady = true; refresh(); }
}
async function openDestination(destination) {
  if (opening || !FilmTools.isValidTitle(currentTitle()) || destination !== 'letterboxd' &&
    (!preferencesReady || !enabledPlatforms.includes(destination) || !validDiscussion())) return;
  opening = true;
  refresh();
  try {
    const url = FilmTools.destinationUrl(destination,currentTitle(),usesIdentity() ? detected.imdbId : '',typeSelect.value,context());
    await chrome.tabs.create({url});
  } catch { statusKey = 'openFailed'; }
  finally { opening = false; refresh(); }
}
eksiBtn.addEventListener('click', () => openDestination('eksi'));
redditBtn.addEventListener('click', () => openDestination('reddit'));
letterboxdBtn.addEventListener('click', () => openDestination('letterboxd'));
async function run() {
  try {
    const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
    if (!tab || !Number.isInteger(tab.id)) { statusKey = 'noTab'; return; }
    if (!/^https?:\/\//i.test(tab.url || '')) { statusKey = 'restricted'; return; }
    const results = await chrome.scripting.executeScript({target:{tabId:tab.id},func:FilmTools.collectPageData});
    const data = results?.[0]?.result;
    if (!data) throw new Error('No page data');
    if (edited) { statusKey = 'entered'; return; }
    detected = FilmTools.detectMedia(data);
    typeSelect.value = detected.type || 'movie';
    titleInput.value = detected.title;
    seasonInput.value = detected.season;
    episodeInput.value = detected.episode;
    statusKey = detected.type === 'episode' && !detected.title ? 'missingSeries' : detected.title ? 'check' : 'manual';
    for (const title of detected.titles.filter(value => value !== detected.title)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'alternative';
      button.textContent = title;
      button.addEventListener('click', () => { titleInput.value = title; edited = true; statusKey = 'entered'; refresh(); });
      alternativeEl.append(button);
    }
  } catch { statusKey = 'readFailed'; }
  finally { refresh(); }
}
applyLanguage();
loadPreferences();
run();
