'use strict';

// Chrome serializes this function into an isolated page context; keep it self-contained.
function collectPageData() {
  const text = value => typeof value === 'string' ? value.slice(0, 2000) : '';
  const meta = selector => text(document.querySelector(selector)?.content);
  const heading = document.querySelector('h1');
  const smallHeadings = Array.from(heading?.querySelectorAll('small') || []);
  // A separate title with a release year is a candidate, not proof of a movie.
  const small = smallHeadings.length === 1 && /\S.*\s*\((?:18|19|20|21)\d{2}\)\s*$/.test(text(smallHeadings[0].textContent))
    ? smallHeadings[0] : null;
  const headingCopy = heading?.cloneNode(true);
  if (small) headingCopy?.querySelectorAll('small').forEach(node => node.remove());
  const movies = [];
  const walk = (node, depth = 0) => {
    if (!node || depth > 5 || movies.length >= 10) return;
    if (Array.isArray(node)) { node.slice(0, 30).forEach(item => walk(item, depth + 1)); return; }
    if (typeof node !== 'object') return;
    const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
    if (types.some(type => typeof type === 'string' && /(?:^|[/#])Movie$/.test(type))) {
      const names = value => (Array.isArray(value) ? value : [value])
        .filter(item => typeof item === 'string').slice(0, 6).map(text);
      movies.push({ name: text(node.name), alternateNames: names(node.alternateName),
        date: text(node.datePublished), sameAs: names(node.sameAs), url: text(node.url) });
    }
    // Avoid trailers, cast, recommendations and ItemList entries.
    walk(node['@graph'], depth + 1);
    walk(node.mainEntity, depth + 1);
  };
  for (const script of Array.from(document.querySelectorAll('script[type="application/ld+json"]')).slice(0, 20)) {
    if (script.textContent.length > 100000) continue;
    try { walk(JSON.parse(script.textContent)); } catch { /* Other signals still work. */ }
  }
  return { heading: text(headingCopy?.textContent),
    alternateHeading: text(small?.textContent), pageTitle: text(document.title),
    ogTitle: meta('meta[property="og:title"]'), ogType: meta('meta[property="og:type"]'),
    movies };
}

function normalizeText(value) {
  return typeof value === 'string' ? value.toWellFormed().normalize('NFC')
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, ' ')
    .replace(/\s+/g, ' ').trim() : '';
}

function cleanTitle(value) {
  let title = normalizeText(value).split('|')[0].trim();
  title = title.replace(/\s*[-–—]\s*(?:IMDb|Letterboxd).*$/i, '');
  title = title.replace(/\s*\((?:18|19|20|21)\d{2}\)\s*$/, '');
  // Remove whole suffixes only. Numbers and meaningful parentheses belong to titles.
  let previous;
  do {
    previous = title;
    title = title.replace(/\s(?:(?:full\s*)?hd\s*izle|izle|türkçe\s*dublaj|türkçe\s*altyazılı|altyazılı|1080p|720p|full\s*film|sansürsüz|hd)\s*$/iu, '').trim();
    title = title.replace(/\s*\((?:18|19|20|21)\d{2}\)\s*$/, '').trim();
  } while (previous !== title);
  return title;
}

function isValidTitle(title) {
  return typeof title === 'string' && title.length > 0 && title.length <= 180 && !/^\.{1,2}$/.test(title);
}
function imdbIdFromUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
    if (!/^(?:www\.|m\.)?imdb\.com$/.test(url.hostname)) return '';
    return url.pathname.match(/^\/title\/(tt\d{7,12})(?:\/|$)/)?.[1] || '';
  } catch { return ''; }
}

function detectFilm(data) {
  const empty = { title: '', titles: [], imdbId: '', year: '', source: '' };
  const movies = Array.isArray(data.movies) ? data.movies : [];
  if (movies.length > 1) return empty;
  const movie = movies[0];
  const isMovie = Boolean(movie || data.ogType === 'video.movie');
  if (!isMovie) return empty;
  const sameTitle = (left, right) => cleanTitle(left).toLocaleLowerCase('tr') === cleanTitle(right).toLocaleLowerCase('tr');
  const metadataTitles = movie ? [movie.name, ...(movie.alternateNames || [])] : [data.ogTitle];
  const alternateTitle = cleanTitle(data.alternateHeading);
  const hasAlternateHeading = /\S.*\s*\((?:18|19|20|21)\d{2}\)\s*$/.test(normalizeText(data.alternateHeading)) &&
    isValidTitle(alternateTitle) && isValidTitle(cleanTitle(data.heading)) &&
    metadataTitles.some(title => isValidTitle(cleanTitle(title)) && sameTitle(data.heading, title));
  const titles = [];
  const add = value => {
    const title = cleanTitle(value);
    if (isValidTitle(title) && !titles.some(t => t.toLocaleLowerCase('tr') === title.toLocaleLowerCase('tr'))) titles.push(title);
  };
  if (hasAlternateHeading) add(data.alternateHeading);
  add(movie?.name);
  (movie?.alternateNames || []).forEach(add);
  if (hasAlternateHeading || !titles.length) add(data.heading);
  if (!titles.length) add(data.ogTitle);
  if (!titles.length) add(data.pageTitle);
  if (!titles.length) return empty;
  const identityUrls = movie ? [movie.url, ...(movie.sameAs || [])] : [];
  const ids = [...new Set(identityUrls.map(imdbIdFromUrl).filter(Boolean))];
  const headingYear = normalizeText(hasAlternateHeading ? data.alternateHeading : data.heading).match(/\(((?:18|19|20|21)\d{2})\)\s*$/)?.[1];
  const dateYear = movie?.date?.match(/^((?:18|19|20|21)\d{2})(?:-|$)/)?.[1];
  return { title: titles[0], titles: titles.slice(0, 6), imdbId: ids.length === 1 ? ids[0] : '',
    year: headingYear || dateYear || '',
    source: hasAlternateHeading ? 'Alternative title on this page' : movie ? 'Movie metadata' : 'Page heading' };
}

function destinationUrl(destination, value, imdbId = '') {
  const title = normalizeText(value);
  if (!isValidTitle(title)) throw new Error('Invalid title');
  if (destination === 'eksi') return `https://eksisozluk.com/?q=${encodeURIComponent(title)}`;
  if (destination === 'letterboxd') {
    if (/^tt\d{7,12}$/.test(imdbId)) return `https://letterboxd.com/imdb/${imdbId}/`;
    const query = encodeURIComponent(title).replace(/\./g, '%2E');
    return `https://letterboxd.com/search/films/${query}/`;
  }
  throw new Error('Unknown destination');
}

const FilmTools = Object.freeze({ collectPageData, normalizeText, cleanTitle, isValidTitle,
  imdbIdFromUrl, detectFilm, destinationUrl });
if (typeof module !== 'undefined' && module.exports) module.exports = FilmTools;
