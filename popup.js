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
const imdbBtn = document.getElementById('imdbBtn');
const imdbRouteEl = document.getElementById('imdbRoute');
const routeEl = document.getElementById('letterboxdRoute');
const eksiRouteEl = document.getElementById('eksiRoute');
const languageStatusEl = document.getElementById('languageStatus');
const redditRouteEl = document.getElementById('redditRoute');
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const settingsStatusEl = document.getElementById('settingsStatus');
const watchPanel = document.getElementById('watchPanel');
const platformIds = ['eksi','reddit','letterboxd','imdb'];
const platformNames = {eksi:'Ekşi Sözlük',reddit:'Reddit',letterboxd:'Letterboxd',imdb:'IMDb'};
const platformButtons = {eksi:eksiBtn,reddit:redditBtn,letterboxd:letterboxdBtn,imdb:imdbBtn};
const platformInputs = Object.fromEntries(platformIds.map(id => [id,document.getElementById(`${id}Enabled`)]));
const platformEdits = new Map();
let platformOrder = [...platformIds];
let renderedOrder = '';
let orderRevision = 0;
let pendingPlatformSave = false;
let browserLanguage = 'en';
try {
  const locale = chrome.i18n?.getUILanguage?.();
  if (typeof locale === 'string') browserLanguage = AfterWatchI18n.supportedLanguage(locale.toLowerCase().split('-')[0]);
} catch { /* English is usable if the browser language API is unavailable. */ }
let detected = FilmTools.detectMedia({});
let opening = false;
let edited = false;
let detectionCorrected = false;
let language = browserLanguage;
let languageRevision = 0;
let languageSaveFailed = false;
let enabledPlatforms = [browserLanguage === 'tr' ? 'eksi' : 'reddit','letterboxd','imdb'];
let platformRevision = 0;
let platformSaveFailed = false;
let preferencesLoadFailed = false;
let preferencesReady = false;
let saveQueue = Promise.resolve();
let statusKey = 'reading';
const suggestionRenderers = [];
const alternativeButtons = [];
let alternativeTitles = [];

const t = (key, params) => AfterWatchI18n.translate(language,key,params);
function currentTitle() { return FilmTools.normalizeText(titleInput.value); }
function context() { return {scope:scopeSelect.value,season:seasonInput.value,episode:episodeInput.value}; }
function usesIdentity() { return Boolean(typeSelect.value === 'movie' && detected.type === 'movie' && detected.imdbId && currentTitle() === detected.title); }
function imdbIdentity() {
  const type = typeSelect.value;
  if (type !== detected.type || currentTitle() !== detected.title) return '';
  if (type === 'movie') return detected.imdbId;
  if (type === 'series' || type === 'episode' && scopeSelect.value !== 'episode') return detected.seriesImdbId;
  return type === 'episode' && FilmTools.episodeNumber(seasonInput.value,true) === detected.season &&
    FilmTools.episodeNumber(episodeInput.value) === detected.episode ? detected.episodeImdbId : '';
}
function validDiscussion() {
  if (!['movie','series','episode'].includes(typeSelect.value)) return false;
  try { FilmTools.discussionQuery(currentTitle(),typeSelect.value,context()); return true; } catch { return false; }
}
function detectionStatus(type, validTitle, validType, season, episode) {
  if (['reading','noTab','restricted','readFailed','openFailed'].includes(statusKey)) return statusKey;
  const issues = ['detectAmbiguous','detectEpisodeConflict','detectIdentityConflict','detectVideoConflict','detectVideoMissing','detectPlayerConflict','detectPlayerMissing','detectMetadataUnavailable','detectNoMedia','detectNavigationChanged'];
  const issue = !detectionCorrected && issues.includes(detected.issue) ? detected.issue : '';
  if (!validTitle) {
    if (currentTitle()) return 'detectTitleInvalid';
    if (issue) return issue;
    return type === 'episode' ? 'missingSeries' : 'detectTitleMissing';
  }
  if (!validType) return 'detectTypeMissing';
  if (issue === 'detectEpisodeConflict') return issue;
  if (type === 'episode') {
    if (String(seasonInput.value).trim() && season === '' || String(episodeInput.value).trim() && episode === '') return 'detectNumbersInvalid';
    if (season === '' && episode === '') return 'detectNumbersMissing';
    if (season === '') return 'detectSeasonMissing';
    if (episode === '') return 'detectEpisodeMissing';
  }
  return issue === 'detectIdentityConflict' ? issue : statusKey;
}
function refresh() {
  // Explain only recognized outcomes, never page-supplied strings or guessed confidence scores.
  const type = typeSelect.value;
  const valid = FilmTools.isValidTitle(currentTitle());
  const validType = ['movie','series','episode'].includes(type);
  for (const [platform, button] of Object.entries(platformButtons)) {
    button.hidden = !enabledPlatforms.includes(platform);
    button.disabled = opening || !preferencesReady || button.hidden || (platform === 'letterboxd' ? !valid || !validType : !validDiscussion());
    platformInputs[platform].checked = enabledPlatforms.includes(platform);
  }
  watchPanel.classList.toggle('many-platforms',enabledPlatforms.length > 2);
  watchPanel.classList.toggle('four-platforms',enabledPlatforms.length > 3);
  document.getElementById('noPlatforms').hidden = !preferencesReady || enabledPlatforms.length !== 0;
  document.getElementById('destinations').hidden = enabledPlatforms.length === 0;
  renderPlatformOrder();
  renderAlternativeTitles();
  routeEl.textContent = t(!validType ? 'chooseType' : type === 'movie' ? usesIdentity() ? 'letterboxdId' : 'letterboxdSearch' : 'letterboxdTv');
  imdbRouteEl.textContent = t(!validType ? 'chooseType' : !validDiscussion() ? 'episodeMissing' : imdbIdentity() ? 'imdbDirect' :
    type === 'episode' && scopeSelect.value === 'episode' ? 'imdbEpisodeSearch' : 'imdbSearch');
  document.getElementById('episodeControls').hidden = type !== 'episode';
  document.getElementById('spoilerNote').hidden = !validType || type === 'movie';
  document.getElementById('titleLabel').textContent = t(type === 'episode' ? 'seriesTitleLabel' : 'titleLabel');
  const season = FilmTools.episodeNumber(seasonInput.value,true);
  const episode = FilmTools.episodeNumber(episodeInput.value);
  eksiRouteEl.textContent = !validType || type === 'movie' ? '' : type === 'episode' && scopeSelect.value === 'episode'
    ? season === '' || episode === '' ? t('episodeMissing') : t('eksiEpisode',{title:currentTitle(),season,episode})
    : t('eksiSeries');
  redditRouteEl.textContent = type === 'episode' && scopeSelect.value === 'episode' && (season === '' || episode === '')
    ? t('episodeMissing') : valid && validType ? t('redditSearch',{query:FilmTools.discussionQuery(currentTitle(),type,context(),'reddit')}) : '';
  const matches = detected.type === type && detected.titles.includes(currentTitle()) &&
    (type !== 'episode' || season === detected.season && episode === detected.episode);
  detailEl.textContent = matches ? [t(type), detected.year,
    type === 'episode' ? t('episodeDetail',{season:season || t('unknown'),episode:episode || t('unknown')}) : '',
    detected.episodeTitle, t(detected.sourceKey)].filter(Boolean).join(' · ') : '';
  statusEl.textContent = t(detectionStatus(type,valid,validType,season,episode));
  titleInput.setAttribute('aria-invalid',String(Boolean(currentTitle() && !valid)));
  seasonInput.setAttribute('aria-invalid',String(type === 'episode' && Boolean(String(seasonInput.value).trim()) && season === ''));
  episodeInput.setAttribute('aria-invalid',String(type === 'episode' && Boolean(String(episodeInput.value).trim()) && episode === ''));
  languageStatusEl.hidden = !languageSaveFailed;
  languageStatusEl.textContent = languageSaveFailed ? t('languageSaveFailed') : '';
  settingsStatusEl.hidden = !platformSaveFailed && !preferencesLoadFailed;
  settingsStatusEl.textContent = platformSaveFailed ? t('platformSaveFailed') : preferencesLoadFailed ? t('settingsLoadFailed') : '';
}
function renderAlternativeTitles() {
  // Page aliases are reversible choices. YouTube suggestions have their own type/number controls.
  if (detected.titles.length < 2) return;
  const key = value => FilmTools.normalizeText(value).toLocaleLowerCase('tr');
  const available = detected.titles.filter(title => key(title) !== key(currentTitle()));
  alternativeTitles = alternativeTitles.filter(title => available.includes(title));
  for (const title of available) if (!alternativeTitles.includes(title)) alternativeTitles.push(title);
  while (alternativeButtons.length < alternativeTitles.length) {
    const index = alternativeButtons.length;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'alternative';
    button.addEventListener('click', () => {
      if (button.hidden || !alternativeTitles[index]) return;
      const previous = detected.titles.find(title => key(title) === key(currentTitle()));
      titleInput.value = alternativeTitles[index];
      if (previous) alternativeTitles[index] = previous;
      else alternativeTitles.splice(index,1);
      edited = true; detectionCorrected = true; statusKey = 'entered'; refresh();
      (button.hidden ? alternativeButtons.find(item => !item.hidden) : button)?.focus();
    });
    alternativeButtons.push(button); alternativeEl.append(button);
  }
  alternativeButtons.forEach((button,index) => {
    button.hidden = index >= alternativeTitles.length;
    button.textContent = alternativeTitles[index] || '';
  });
}
function renderPlatformOrder() {
  const key = platformOrder.join(',');
  if (renderedOrder !== key) {
    for (const id of platformOrder) {
      document.getElementById('platformOptions').append(document.getElementById(`${id}Option`));
      document.getElementById('destinations').append(platformButtons[id]);
    }
    renderedOrder = key;
  }
  platformOrder.forEach((id,index) => {
    document.getElementById(`${id}Position`).textContent = `${index+1} / ${platformIds.length}`;
    for (const [direction,disabled] of [['Up',index === 0],['Down',index === platformIds.length-1]]) {
      const button = document.getElementById(`${id}${direction}`);
      button.disabled = disabled;
      const label = t(direction === 'Up' ? 'moveUp' : 'moveDown',{platform:platformNames[id]});
      button.setAttribute('aria-label',label); button.setAttribute('title',label);
    }
  });
}
function applyLanguage() {
  languageSelect.value = language;
  AfterWatchI18n.applyLanguage(document,language);
  suggestionRenderers.forEach(render => render());
  refresh();
}
for (const [node,event] of [[titleInput,'input'],[typeSelect,'change'],[scopeSelect,'change'],[seasonInput,'input'],[episodeInput,'input']]) {
  node.addEventListener(event, () => { edited = true; if (node !== scopeSelect) detectionCorrected = true; statusKey = 'entered'; refresh(); });
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
  if (!preferencesReady) { pendingPlatformSave = true; return; }
  const chosen = {version:2,enabled:platformOrder.filter(id => enabledPlatforms.includes(id)),order:[...platformOrder]};
  const revision = platformRevision;
  platformSaveFailed = false;
  saveQueue = saveQueue.then(() => chrome.storage.local.set({platformSettings:chosen})).catch(() => {
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
    platformEdits.set(platform,input.checked);
    enabledPlatforms = enabledPlatforms.filter(value => value !== platform);
    if (input.checked) enabledPlatforms.push(platform);
    savePlatforms();
    refresh();
  });
}
for (const id of platformIds) for (const [direction,step] of [['Up',-1],['Down',1]]) {
  const button = document.getElementById(`${id}${direction}`);
  button.addEventListener('click',() => {
    const index = platformOrder.indexOf(id), target = index + step;
    if (target < 0 || target >= platformOrder.length) return;
    [platformOrder[index],platformOrder[target]] = [platformOrder[target],platformOrder[index]];
    orderRevision++; platformRevision++;
    savePlatforms(); refresh();
    (button.disabled ? document.getElementById(`${id}${direction === 'Up' ? 'Down' : 'Up'}`) : button).focus();
  });
}
async function loadPreferences() {
  try {
    const saved = await chrome.storage.local.get(['language','enabledPlatforms','platformSettings']);
    if (!languageRevision) language = typeof saved.language === 'string' ? AfterWatchI18n.supportedLanguage(saved.language) : browserLanguage;
    const settings = saved.platformSettings;
    const validIds = (value,complete = false,ids = platformIds) => Array.isArray(value) && value.length <= ids.length &&
      new Set(value).size === value.length && value.every(id => ids.includes(id)) && (!complete || value.length === ids.length);
    let restored;
    if (settings?.version === 2 && validIds(settings.enabled) && validIds(settings.order,true)) restored = settings;
    else if (settings?.version === 1 && validIds(settings.enabled,false,platformIds.slice(0,3)) && validIds(settings.order,true,platformIds.slice(0,3))) {
      restored = {enabled:[...settings.enabled],order:[...settings.order,'imdb']};
      pendingPlatformSave = true;
    }
    else {
      const legacy = Array.isArray(saved.enabledPlatforms) && saved.enabledPlatforms.length <= 2 &&
        saved.enabledPlatforms.every(id => ['eksi','reddit'].includes(id)) ? [...new Set(saved.enabledPlatforms)] :
        [typeof saved.language === 'string' ? 'eksi' : browserLanguage === 'tr' ? 'eksi' : 'reddit'];
      const firstRun = !Object.hasOwn(saved,'language') && !Array.isArray(saved.enabledPlatforms) && settings == null;
      restored = {enabled:[...legacy,'letterboxd',...(firstRun ? ['imdb'] : [])],order:[...platformIds]};
      pendingPlatformSave = true;
    }
    enabledPlatforms = restored.enabled.filter(id => !platformEdits.has(id) || platformEdits.get(id));
    for (const [id,checked] of platformEdits) if (checked && !enabledPlatforms.includes(id)) enabledPlatforms.push(id);
    if (!orderRevision) platformOrder = [...restored.order];
    applyLanguage();
  } catch { preferencesLoadFailed = true; }
  finally { preferencesReady = true; if (pendingPlatformSave) { pendingPlatformSave = false; savePlatforms(); } refresh(); }
}
async function openDestination(destination) {
  if (opening || !preferencesReady || !enabledPlatforms.includes(destination) || !['movie','series','episode'].includes(typeSelect.value) ||
    !FilmTools.isValidTitle(currentTitle()) || destination !== 'letterboxd' && !validDiscussion()) return;
  opening = true;
  refresh();
  try {
    const identity = destination === 'imdb' ? imdbIdentity() : usesIdentity() ? detected.imdbId : '';
    const url = FilmTools.destinationUrl(destination,currentTitle(),identity,typeSelect.value,context());
    await chrome.tabs.create({url});
  } catch { statusKey = 'openFailed'; }
  finally { opening = false; refresh(); }
}
eksiBtn.addEventListener('click', () => openDestination('eksi'));
redditBtn.addEventListener('click', () => openDestination('reddit'));
letterboxdBtn.addEventListener('click', () => openDestination('letterboxd'));
imdbBtn.addEventListener('click', () => openDestination('imdb'));
async function run() {
  try {
    const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
    if (!tab || !Number.isInteger(tab.id)) { statusKey = 'noTab'; return; }
    if (!/^https?:\/\//i.test(tab.url || '')) { statusKey = 'restricted'; return; }
    const results = await chrome.scripting.executeScript({target:{tabId:tab.id},func:FilmTools.collectPageData});
    const data = results?.[0]?.result;
    if (!data) throw new Error('No page data');
    if (data.youtube?.id && !data.youtube.conflict) {
      try {
        const records = await chrome.scripting.executeScript({target:{tabId:tab.id},world:'MAIN',func:FilmTools.collectYouTubePlayerData});
        const upload = records?.[0]?.result;
        if (upload && upload.id !== data.youtube.id) { data.youtube = {id:'',name:'',conflict:true}; data.navigationChanged = true; }
        else if (upload?.name) {
          if (data.youtube.name && FilmTools.normalizeText(data.youtube.name) !== FilmTools.normalizeText(upload.name)) data.youtube.conflict = true;
          else data.youtube.name = upload.name;
        }
      } catch { /* An ID-bound DOM title still works when the optional read is unavailable. */ }
    }
    if (data.disneyPlayer) {
      try {
        const records = await chrome.scripting.executeScript({target:{tabId:tab.id},world:'MAIN',func:FilmTools.collectDisneyPlayerData});
        const player = records?.[0]?.result;
        // A navigation during the read must not attach another episode's title to this page.
        if (player && player.pathname === data.pathname) data.player = player;
        else if (player) { data.player = null; data.media = []; data.navigationChanged = true; }
      } catch { /* DOM/browser metadata and manual entry remain usable. */ }
    }
    if (edited) { statusKey = 'entered'; return; }
    detected = FilmTools.detectMedia(data);
    typeSelect.value = detected.type || (detected.title ? '' : 'movie');
    titleInput.value = detected.title;
    seasonInput.value = detected.season;
    episodeInput.value = detected.episode;
    statusKey = detected.title && !detected.type ? 'chooseType' : detected.type === 'episode' && !detected.title ? 'missingSeries' : detected.title ? 'check' : 'manual';
    const suggestions = detected.suggestions || [];
    if (suggestions.length) {
      const label = document.createElement('p');
      label.className = 'detail'; label.textContent = t('suggestionsLabel');
      suggestionRenderers.push(() => { label.textContent = t('suggestionsLabel'); });
      alternativeEl.append(label);
      const original = document.createElement('button');
      original.type = 'button'; original.className = 'alternative';
      const render = () => { original.textContent = `${t('restoreVideoTitle')}: ${detected.title}`; };
      render(); suggestionRenderers.push(render);
      original.addEventListener('click', () => {
        titleInput.value = detected.title; typeSelect.value = ''; seasonInput.value = ''; episodeInput.value = '';
        edited = true; detectionCorrected = true; statusKey = 'chooseType'; refresh();
      });
      alternativeEl.append(original);
    }
    for (const suggestion of suggestions) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'alternative';
      const label = () => [suggestion.title, suggestion.year, suggestion.type ? t(suggestion.type) : '',
        suggestion.type === 'episode' ? t('episodeDetail',{season:suggestion.season || t('unknown'),episode:suggestion.episode || t('unknown')}) : ''].filter(Boolean).join(' · ');
      button.textContent = label();
      button.addEventListener('click', () => {
        titleInput.value = suggestion.title; typeSelect.value = suggestion.type;
        seasonInput.value = suggestion.season; episodeInput.value = suggestion.episode;
        edited = true; detectionCorrected = true; statusKey = 'check'; refresh();
      });
      // Store a local renderer for language changes without putting page strings in HTML or attributes.
      suggestionRenderers.push(() => { button.textContent = label(); });
      alternativeEl.append(button);
    }
  } catch { statusKey = 'readFailed'; }
  finally { refresh(); }
}
applyLanguage();
loadPreferences();
run();
