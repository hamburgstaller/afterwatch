'use strict';

// Chrome serializes this function into an isolated page context; keep it self-contained.
function collectPageData() {
  const text = value => typeof value === 'string' ? value.slice(0, 2000) : '';
  const meta = selector => text(document.querySelector(selector)?.content);
  const heading = document.querySelector('h1');
  const smallHeadings = Array.from(heading?.querySelectorAll('small') || []);
  // A separate title with a release year is a candidate, not proof of media identity.
  const small = smallHeadings.length === 1 && /\S.*\s*\((?:18|19|20|21)\d{2}\)\s*$/.test(text(smallHeadings[0].textContent))
    ? smallHeadings[0] : null;
  const headingCopy = heading?.cloneNode(true);
  if (small) headingCopy?.querySelectorAll('small').forEach(node => node.remove());
  const documents = [];
  for (const script of Array.from(document.querySelectorAll('script[type="application/ld+json"]')).slice(0, 20)) {
    if (script.textContent.length > 100000) continue;
    try { documents.push(JSON.parse(script.textContent)); } catch { /* Other signals still work. */ }
  }
  const names = value => (Array.isArray(value) ? value : [value])
    .filter(item => typeof item === 'string').slice(0, 6).map(text);
  const samePage = value => {
    if (!text(value).trim()) return false;
    try {
      const url = new URL(text(value), location.href);
      const current = new URL(location.href);
      return /^https?:$/.test(url.protocol) && url.origin === current.origin &&
        url.pathname.replace(/\/$/, '') === current.pathname.replace(/\/$/, '');
    } catch { return false; }
  };
  const idKey = value => {
    if (!text(value)) return '';
    try { return new URL(text(value), location.href).href; } catch { return text(value); }
  };
  const nodes = new Map();
  let indexed = 0;
  const index = (node, depth = 0) => {
    if (!node || depth > 6 || indexed >= 300) return;
    if (Array.isArray(node)) { node.slice(0, 30).forEach(item => index(item, depth + 1)); return; }
    if (typeof node !== 'object') return;
    indexed++;
    const id = idKey(node['@id']);
    if (id) nodes.set(id, {...nodes.get(id), ...node});
    // Follow only identity relationships, never recommendations, cast or episode lists.
    for (const key of ['@graph', 'mainEntity', 'partOfSeries', 'partOfTVSeries', 'partOfSeason']) index(node[key], depth + 1);
    // Review metadata is usable only when the reviewed item explicitly identifies this page.
    const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
    if (types.some(type => typeof type === 'string' && type.split(/[/#]/).pop() === 'Review') &&
      samePage(node.itemReviewed?.url)) index(node.itemReviewed, depth + 1);
  };
  documents.forEach(node => index(node));
  const resolve = value => {
    if (typeof value === 'string') return nodes.get(idKey(value)) || null;
    if (!value || Array.isArray(value) || typeof value !== 'object') return null;
    return {...nodes.get(idKey(value['@id'])), ...value};
  };
  const typeOf = node => {
    const types = (Array.isArray(node['@type']) ? node['@type'] : [node['@type']])
      .filter(type => typeof type === 'string').map(type => type.split(/[/#]/).pop());
    const supported = ['Movie','TVSeries','TVEpisode'].filter(type => types.includes(type));
    return supported.length === 1 ? {Movie:'movie',TVSeries:'series',TVEpisode:'episode'}[supported[0]] : '';
  };
  const summary = node => node ? {id: idKey(node['@id']), name:text(node.name),
    alternateNames:names(node.alternateName), date:text(node.datePublished),
    sameAs:names(node.sameAs), url:text(node.url)} : null;
  const number = value => typeof value === 'number' ? value : text(value);
  const media = [];
  const visited = new Set();
  let walked = 0;
  const walk = (value, depth = 0, primary = false) => {
    if (!value || depth > 6 || media.length >= 20 || walked >= 300) return;
    if (Array.isArray(value)) { value.slice(0, 30).forEach(item => walk(item, depth + 1, primary)); return; }
    const node = resolve(value);
    if (!node) return;
    const visitKey = node['@id'] ? idKey(node['@id']) : value;
    if (visited.has(visitKey)) {
      if (primary) media.filter(item => item.id && item.id === idKey(node['@id'])).forEach(item => { item.primary = true; });
      return;
    }
    visited.add(visitKey);
    walked++;
    const type = typeOf(node);
    if (type) {
      const season = resolve(node.partOfSeason);
      const series = resolve(node.partOfSeries || node.partOfTVSeries || season?.partOfSeries || season?.partOfTVSeries);
      media.push({...summary(node), type, primary, series:summary(series),
        season:number(season?.seasonNumber ?? node.seasonNumber), episode:number(node.episodeNumber)});
    }
    walk(node['@graph'], depth + 1, primary);
    walk(node.mainEntity, depth + 1, true);
    const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
    if (types.some(type => typeof type === 'string' && type.split(/[/#]/).pop() === 'Review') &&
      samePage(node.itemReviewed?.url)) walk(node.itemReviewed, depth + 1);
  };
  documents.forEach(node => walk(node));
  // MUBI exposes its current film in a bounded, page-embedded Next.js record.
  // Read that exact record only; never traverse recommendations or infer a title from its slug.
  if (/^(?:www\.)?mubi\.com$/i.test(location.hostname) && meta('meta[property="og:type"]') === 'video.movie') {
    try {
      const path = location.pathname.match(/^\/(?:[a-z]{2}(?:-[a-z]{2})?\/){0,2}films\/([^/]+)\/?$/i);
      const script = document.querySelector('script#__NEXT_DATA__');
      if (path && script?.type === 'application/json' && script.textContent.length <= 250000) {
        const film = JSON.parse(script.textContent)?.props?.pageProps?.initFilm;
        const normalized = value => text(value).normalize('NFC').replace(/\s+/g, ' ').trim();
        const mainTitle = normalized(headingCopy?.textContent);
        const title = normalized(film?.title);
        const matches = value => normalized(value).toLocaleLowerCase('tr') === title.toLocaleLowerCase('tr');
        if (title && title.length <= 180 && mainTitle && typeof film.slug === 'string' && decodeURIComponent(path[1]) === film.slug &&
          (mainTitle === normalized(film.title_upcase) || matches(mainTitle))) {
          const alternateNames = names(film.original_title);
          const date = /^(?:18|19|20|21)\d{2}$/.test(String(film.year)) ? String(film.year) : '';
          if (!media.length) media.push({type:'movie',primary:false,id:'',name:title,alternateNames,date,sameAs:[],url:''});
          else if (media.length === 1 && media[0].type === 'movie' &&
            [title,...alternateNames].some(name => normalized(name).toLocaleLowerCase('tr') === normalized(media[0].name).toLocaleLowerCase('tr')) &&
            (!date || !media[0].date || media[0].date.slice(0,4) === date)) {
            const movie = media[0];
            movie.alternateNames = names([movie.name,...movie.alternateNames,...alternateNames]);
            movie.name = title;
            movie.date ||= date;
          }
        }
      }
    } catch { /* Invalid, missing or mismatched data leaves ordinary detection/manual entry intact. */ }
  }
  return { heading: text(headingCopy?.textContent),
    alternateHeading: text(small?.textContent), pageTitle: text(document.title),
    ogTitle: meta('meta[property="og:title"]'), ogType: meta('meta[property="og:type"]'),
    pathname: text(location.pathname), media };
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

function episodeNumber(value, season = false) {
  const string = String(value ?? '').trim();
  if (!/^\d{1,4}$/.test(string)) return '';
  const number = Number(string);
  return number >= (season ? 0 : 1) && number <= (season ? 999 : 9999) ? String(number) : '';
}

function episodePattern(value) {
  const title = cleanTitle(value);
  const patterns = [
    /^(.+?)\s+(\d{1,4})\.?\s*sezon\s+(\d{1,4})\.?\s*b[öo]l[üu]m$/iu,
    /^(.+?)\s+(?:season|temporada|stagione)\s*(\d{1,4})\s*[,.:–—-]?\s*(?:episode|episodio|episódio|capítulo|capitulo)\s*(\d{1,4})$/iu,
    /^(.+?)\s+(?:S(\d{1,4})\s*E(\d{1,4})|(\d{1,4})x(\d{1,4}))$/iu
  ];
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (!match) continue;
    const name = cleanTitle(match[1]);
    const season = episodeNumber(match[2] ?? match[4], true);
    const episode = episodeNumber(match[3] ?? match[5]);
    if (isValidTitle(name) && season !== '' && episode !== '') return {title:name,season,episode};
  }
  return null;
}

function titleSlug(value) {
  return normalizeText(value).toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
    .replace(/ı/g, 'i').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
}

function episodeFromPage(data, metadataTitles, season, episode) {
  const patterns = [data.heading, data.ogTitle, data.pageTitle].map(episodePattern).filter(Boolean);
  let pathPattern;
  try {
    // Read only the last path segment; never query parameters, fragments or other page links.
    const segment = decodeURIComponent(String(data.pathname || '').slice(0,2000).split('/').filter(Boolean).pop() || '');
    const match = segment.match(/^(.+?)-(?:s(\d{1,4})e(\d{1,4})|(\d{1,4})-sezon-(\d{1,4})-bolum|(?:season|temporada|stagione)-(\d{1,4})-(?:episode|episodio|capitulo)-(\d{1,4}))(?:-(?:\d+-)?(?:izle|watch)(?:-\d+)?)?$/iu);
    if (match) {
      const s = episodeNumber(match[2] ?? match[4] ?? match[6], true);
      const e = episodeNumber(match[3] ?? match[5] ?? match[7]);
      if (s !== '' && e !== '') pathPattern = {title:match[1],season:s,episode:e};
    }
  } catch { /* Malformed escapes cannot invalidate other page evidence. */ }
  // A URL slug cannot supply a properly written series title by itself.
  const pathTitle = pathPattern && metadataTitles.find(title => titleSlug(title) === titleSlug(pathPattern.title));
  const candidate = patterns[0] || (pathTitle ? {...pathPattern,title:pathTitle} : null);
  if (!candidate) return null;
  const matches = item => titleSlug(item.title) === titleSlug(candidate.title) &&
    item.season === candidate.season && item.episode === candidate.episode;
  if (!patterns.every(matches) || pathPattern && !matches(pathPattern)) return null;
  if (metadataTitles.length && !metadataTitles.some(title => titleSlug(title) === titleSlug(candidate.title))) return null;
  if (season !== '' && season !== candidate.season || episode !== '' && episode !== candidate.episode) return null;
  return candidate;
}

function detectMedia(data) {
  const empty = { type:'', title:'', titles:[], imdbId:'', year:'', source:'', sourceKey:'', season:'', episode:'', episodeTitle:'' };
  if (!data || typeof data !== 'object') return empty;
  const candidates = Array.isArray(data.media) ? data.media : (Array.isArray(data.movies) ? data.movies : []).map(movie => ({...movie,type:'movie'}));
  const unique = new Map();
  for (const item of candidates.slice(0, 20)) {
    if (!item || !['movie','series','episode'].includes(item.type)) continue;
    const {primary, ...identity} = item;
    const key = JSON.stringify(identity);
    unique.set(key, {...item,primary:Boolean(primary || unique.get(key)?.primary)});
  }
  const items = [...unique.values()];
  const primary = items.filter(item => item.primary);
  let selected;
  if (primary.length === 1) selected = primary[0];
  else if (primary.length > 1) return empty;
  else if (items.length === 1) selected = items[0];
  else if (items.length > 1) {
    const episodes = items.filter(item => item.type === 'episode');
    if (episodes.length !== 1) return empty;
    const episode = episodes[0];
    const parent = episode.series;
    if (!parent || !items.every(item => item === episode || (item.type === 'series' &&
      (parent.id && parent.id === item.id || !parent.id && cleanTitle(parent.name) && cleanTitle(parent.name) === cleanTitle(item.name))))) return empty;
    selected = episode;
  }
  const ogType = {'video.movie':'movie','video.tv_show':'series','video.episode':'episode'}[data.ogType];
  const type = selected?.type || ogType;
  if (!type) return empty;
  const movie = type === 'episode' ? selected?.series : selected;
  const sameTitle = (left, right) => cleanTitle(left).toLocaleLowerCase('tr') === cleanTitle(right).toLocaleLowerCase('tr');
  const metadataTitles = movie ? [movie.name, ...(movie.alternateNames || [])] : type === 'episode' ? [] : [data.ogTitle];
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
  if (type !== 'episode') {
    if (hasAlternateHeading || !titles.length) add(data.heading);
    if (!titles.length) add(data.ogTitle);
    if (!titles.length) add(data.pageTitle);
    if (!titles.length) return empty;
  }
  let season = episodeNumber(selected?.season, true);
  let episode = episodeNumber(selected?.episode);
  const pageEpisode = type === 'episode' ? episodeFromPage(data, titles, season, episode) : null;
  if (pageEpisode) {
    if (!titles.length) add(pageEpisode.title);
    season ||= pageEpisode.season;
    episode ||= pageEpisode.episode;
  }
  const identityUrls = type === 'movie' && movie ? [movie.url, ...(movie.sameAs || [])] : [];
  const ids = [...new Set(identityUrls.map(imdbIdFromUrl).filter(Boolean))];
  const headingYear = normalizeText(hasAlternateHeading ? data.alternateHeading : data.heading).match(/\(((?:18|19|20|21)\d{2})\)\s*$/)?.[1];
  const dateYear = (type === 'episode' ? selected?.date : movie?.date)?.match(/^((?:18|19|20|21)\d{2})(?:-|$)/)?.[1];
  return { type, title:titles[0] || '', titles:titles.slice(0, 6), imdbId:ids.length === 1 ? ids[0] : '',
    year:(type === 'episode' ? '' : headingYear) || dateYear || '',
    season, episode,
    episodeTitle:type === 'episode' ? normalizeText(selected?.name || data.heading || data.ogTitle).slice(0,180) : '',
    sourceKey:hasAlternateHeading ? 'sourceAlternative' : selected ? 'sourceMetadata' : 'sourceHeading',
    source:hasAlternateHeading ? 'Alternative title on this page' : selected ? 'Media metadata' : 'Page heading' };
}

// Keep the original entry point available for existing integrations and fixtures.
const detectFilm = detectMedia;

function discussionQuery(value, type = 'movie', context = {}, destination = 'eksi') {
  const title = normalizeText(value);
  if (!isValidTitle(title)) throw new Error('Invalid title');
  if (type === 'episode' && context.scope === 'episode') {
    const season = episodeNumber(context.season, true);
    const episode = episodeNumber(context.episode);
    if (season === '' || episode === '') throw new Error('Missing episode numbers');
    return destination === 'reddit' ? `${title} S${season.padStart(2,'0')}E${episode.padStart(2,'0')} discussion`
      : `${title} ${season}. sezon ${episode}. bölüm`;
  }
  return destination === 'reddit' ? `${title} discussion` : title;
}

function destinationUrl(destination, value, imdbId = '', type = 'movie', context = {}) {
  const title = normalizeText(value);
  if (!isValidTitle(title)) throw new Error('Invalid title');
  if (!['movie','series','episode'].includes(type)) throw new Error('Invalid media type');
  if (destination === 'eksi') return `https://eksisozluk.com/?q=${encodeURIComponent(discussionQuery(title,type,context))}`;
  if (destination === 'reddit') return `https://www.reddit.com/search/?q=${encodeURIComponent(discussionQuery(title,type,context,'reddit'))}`;
  if (destination === 'letterboxd') {
    if (type === 'movie' && /^tt\d{7,12}$/.test(imdbId)) return `https://letterboxd.com/imdb/${imdbId}/`;
    const query = encodeURIComponent(title).replace(/\./g, '%2E');
    return `https://letterboxd.com/search/films/${query}/`;
  }
  throw new Error('Unknown destination');
}

const FilmTools = Object.freeze({ collectPageData, normalizeText, cleanTitle, isValidTitle,
  imdbIdFromUrl, episodeNumber, detectMedia, detectFilm, discussionQuery, destinationUrl });
if (typeof module !== 'undefined' && module.exports) module.exports = FilmTools;
