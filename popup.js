'use strict';

const titleInput = document.getElementById('filmTitle');
const statusEl = document.getElementById('status');
const detailEl = document.getElementById('filmDetail');
const alternativeEl = document.getElementById('alternatives');
const eksiBtn = document.getElementById('eksiBtn');
const letterboxdBtn = document.getElementById('letterboxdBtn');
const routeEl = document.getElementById('letterboxdRoute');
let detected = { title: '', titles: [], imdbId: '', year: '', source: '' };
let opening = false;
let edited = false;

function currentTitle() { return FilmTools.normalizeText(titleInput.value); }
function usesIdentity() { return Boolean(detected.imdbId && currentTitle() === detected.title); }
function refresh() {
  const valid = FilmTools.isValidTitle(currentTitle());
  eksiBtn.disabled = letterboxdBtn.disabled = opening || !valid;
  routeEl.textContent = usesIdentity() ? 'Open the movie using its IMDb ID' : 'Search by movie title';
  detailEl.textContent = detected.titles.includes(currentTitle())
    ? [detected.year, detected.source].filter(Boolean).join(' · ') : '';
}
titleInput.addEventListener('input', () => { edited = true; refresh(); });

async function openDestination(destination) {
  if (opening || !FilmTools.isValidTitle(currentTitle())) return;
  opening = true;
  refresh();
  try {
    const url = FilmTools.destinationUrl(destination, currentTitle(), usesIdentity() ? detected.imdbId : '');
    await chrome.tabs.create({ url });
  } catch {
    statusEl.textContent = 'Could not open a new tab. Please try again.';
  } finally { opening = false; refresh(); }
}
eksiBtn.addEventListener('click', () => openDestination('eksi'));
letterboxdBtn.addEventListener('click', () => openDestination('letterboxd'));

async function run() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !Number.isInteger(tab.id)) {
      statusEl.textContent = 'No active tab found. You can enter a movie title.';
      return;
    }
    if (!/^https?:\/\//i.test(tab.url || '')) {
      statusEl.textContent = 'This page cannot be read. You can enter a movie title.';
      return;
    }
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id }, func: FilmTools.collectPageData
    });
    const data = results?.[0]?.result;
    if (!data) throw new Error('No page data');
    if (edited) {
      statusEl.textContent = 'Your entered title will be used for the search.';
      return;
    }
    detected = FilmTools.detectFilm(data);
    titleInput.value = detected.title;
    detailEl.textContent = detected.title ? [detected.year, detected.source].filter(Boolean).join(' · ') : '';
    statusEl.textContent = detected.title
      ? 'Check or edit the title before opening a destination.'
      : 'No single movie detected. Enter the title you want to search.';
    for (const title of detected.titles.filter(t => t !== detected.title)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'alternative';
      button.textContent = title;
      button.addEventListener('click', () => { titleInput.value = title; refresh(); });
      alternativeEl.append(button);
    }
  } catch {
    statusEl.textContent = 'Could not read this page. You can enter a movie title.';
  } finally { refresh(); }
}
run();
