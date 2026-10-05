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
const letterboxdBtn = document.getElementById('letterboxdBtn');
const routeEl = document.getElementById('letterboxdRoute');
const eksiRouteEl = document.getElementById('eksiRoute');
const languageStatusEl = document.getElementById('languageStatus');
let detected = FilmTools.detectMedia({});
let opening = false;
let edited = false;
let language = 'en';
let languageRevision = 0;
let languageSaveFailed = false;
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
  eksiBtn.disabled = opening || !validDiscussion();
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
  const matches = detected.type === type && detected.titles.includes(currentTitle()) &&
    (type !== 'episode' || season === detected.season && episode === detected.episode);
  detailEl.textContent = matches ? [t(type), detected.year,
    type === 'episode' ? t('episodeDetail',{season:season || t('unknown'),episode:episode || t('unknown')}) : '',
    detected.episodeTitle, t(detected.sourceKey)].filter(Boolean).join(' · ') : '';
  statusEl.textContent = t(statusKey);
  languageStatusEl.hidden = !languageSaveFailed;
  languageStatusEl.textContent = languageSaveFailed ? t('languageSaveFailed') : '';
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
async function loadLanguage() {
  try {
    const saved = await chrome.storage.local.get('language');
    if (!languageRevision) { language = AfterWatchI18n.supportedLanguage(saved.language); applyLanguage(); }
  } catch { /* English remains usable when preference storage is unavailable. */ }
}
async function openDestination(destination) {
  if (opening || !FilmTools.isValidTitle(currentTitle()) || destination === 'eksi' && !validDiscussion()) return;
  opening = true;
  refresh();
  try {
    const url = FilmTools.destinationUrl(destination,currentTitle(),usesIdentity() ? detected.imdbId : '',typeSelect.value,context());
    await chrome.tabs.create({url});
  } catch { statusKey = 'openFailed'; }
  finally { opening = false; refresh(); }
}
eksiBtn.addEventListener('click', () => openDestination('eksi'));
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
loadLanguage();
run();
