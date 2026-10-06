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
  const mubiPlayer = /^(?:www\.)?mubi\.com$/i.test(location.hostname) &&
    location.pathname.match(/^\/(?:[a-z]{2}(?:-[a-z]{2})?\/){0,2}films\/(\d+)\/player\/?$/i);
  let mubiMismatch = false;
  let mubiRecord = null;
  if (/^(?:www\.)?mubi\.com$/i.test(location.hostname) && (mubiPlayer || meta('meta[property="og:type"]') === 'video.movie')) {
    try {
      const path = location.pathname.match(/^\/(?:[a-z]{2}(?:-[a-z]{2})?\/){0,2}films\/([^/]+)\/?$/i);
      const script = document.querySelector('script#__NEXT_DATA__');
      if ((path || mubiPlayer) && script?.type === 'application/json' && script.textContent.length <= 250000) {
        const props = JSON.parse(script.textContent)?.props;
        const records = [props?.pageProps?.initFilm, props?.initialProps?.pageProps?.initFilm].filter(Boolean);
        const film = records[0];
        const agrees = records.every(record => record.id === film.id && record.title === film.title && record.original_title === film.original_title);
        const playerMatch = mubiPlayer && agrees && /^\d+$/.test(String(film?.id)) && String(film.id) === mubiPlayer[1];
        mubiMismatch = Boolean(mubiPlayer && records.length && !playerMatch);
        const normalized = value => text(value).normalize('NFC').replace(/\s+/g, ' ').trim();
        const mainTitle = normalized(headingCopy?.textContent);
        const title = normalized(film?.title);
        const matches = value => normalized(value).toLocaleLowerCase('tr') === title.toLocaleLowerCase('tr');
        if (agrees && title && title.length <= 180 && (playerMatch || path && mainTitle && typeof film.slug === 'string' && decodeURIComponent(path[1]) === film.slug &&
          (mainTitle === normalized(film.title_upcase) || matches(mainTitle)))) {
          const alternateNames = names(film.original_title);
          const date = /^(?:18|19|20|21)\d{2}$/.test(String(film.year)) ? String(film.year) : '';
          if (playerMatch) {
            media.length = 0;
            media.push({type:'movie',primary:true,id:'',name:title,alternateNames,date,sameAs:[],url:''});
            mubiRecord = media[0];
          }
          else if (!media.length) media.push({type:'movie',primary:false,id:'',name:title,alternateNames,date,sameAs:[],url:''});
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
  // Player routes have a separate identity boundary: detail-page metadata can be stale after SPA navigation.
  const host = location.hostname.toLowerCase();
  const pathname = location.pathname;
  const netflix = /^(?:www\.)?netflix\.com$/.test(host) && /^\/(?:[a-z]{2}\/)?watch\/\d+\/?$/.test(pathname);
  const disney = /^(?:(?:www\.)?apps\.|www\.)?disneyplus\.com$/.test(host) && /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?play\/[^/]+\/?$/i.test(pathname);
  const primeHost = /^(?:www\.)?primevideo\.com$/.test(host) || ['com','co.uk','de','fr','it','es','co.jp','com.tr','com.br','com.au','in','ca'].some(suffix => host === `www.amazon.${suffix}` || host === `amazon.${suffix}`);
  const primeDetail = primeHost && /^\/(?:-\/[a-z]{2}\/)?(?:gp\/video\/detail\/|detail\/|region\/[^/]+\/detail\/|dp\/)[a-z0-9]+\/?$/i.test(pathname);
  const prime = primeDetail && Boolean(document.querySelector('.atvwebplayersdk-player-container video'));
  const apple = host === 'tv.apple.com' && /^\/(?:[a-z]{2}\/)?(?:movie|show|episode)\//.test(pathname) && Boolean(document.querySelector('.video-player__tabs'));
  const max = /^(?:(?:www|play)\.)?(?:max|hbomax)\.com$/.test(host) && /^\/(?:[a-z]{2}\/)?video\//.test(pathname);
  const hulu = /^(?:www\.)?hulu\.com$/.test(host) && /^\/watch\/[^/]+\/?$/.test(pathname);
  const peacock = /^(?:www\.)?peacocktv\.com$/.test(host) && /^\/watch\/playback\//.test(pathname) && !/\/(?:playlist|live)(?:\/|$)/.test(pathname);
  const paramount = /^(?:www\.)?paramountplus\.com$/.test(host) && /^\/(?:[a-z]{2}\/)?(?:movies\/[^/]+|shows\/[^/]+\/video\/[^/]+)\/?$/.test(pathname) && Boolean(document.querySelector('.video__player-area video'));
  const playerPage = Boolean(mubiPlayer || netflix || disney || prime || apple || max || hulu || peacock || paramount);
  const normalized = value => text(value).normalize('NFC').replace(/\s+/g, ' ').trim();
  let playerConflict = false;
  const uniqueText = (selector, leaf = false) => {
    const nodes = Array.from(document.querySelectorAll(selector));
    if (nodes.length > 10) { playerConflict = true; return ''; }
    const values = [...new Set(nodes.filter(node => !leaf || !node.children?.length).map(node => normalized(node.textContent)).filter(Boolean))];
    if (values.length > 1) playerConflict = true;
    return values.length === 1 && values[0].length <= 180 ? values[0] : '';
  };
  let player = null;
  if (playerPage) {
    const bound = mubiPlayer ? mubiRecord ? [mubiRecord] : [] : media.filter(item => samePage(item.url));
    media.length = 0;
    if (bound.length === 1) media.push(bound[0]);
    const hasVideo = Boolean(document.querySelector('video'));
    if (hasVideo && !mubiMismatch) {
      let title = '', subtitle = '';
      // Each player owns its selectors; shared validation and fallback stay outside the adapters.
      const adapters = [
        {applies:netflix,read:()=>({title:uniqueText('[data-uia="video-title"] h4') || uniqueText('[data-uia="video-title"]', true),subtitle:''})},
        {applies:prime,read:()=>({title:uniqueText('.atvwebplayersdk-player-container .atvwebplayersdk-title-text'),
          subtitle:uniqueText('.atvwebplayersdk-player-container .atvwebplayersdk-subtitle-text, .atvwebplayersdk-player-container .atvwebplayersdk-episode-info')})},
        {applies:apple,read:()=>({title:uniqueText('.video-metadata .title'),subtitle:uniqueText('.video-metadata .subtitle-text')})},
        {applies:hulu,read:()=>({title:uniqueText('#web-player-app .PlayerMetadata__titleText'),subtitle:uniqueText('#web-player-app .PlayerMetadata__subTitle')})},
        {applies:peacock,read:()=>({title:uniqueText('[data-testid="metadata-title"], .playback-header__title, .playback-metadata__container-title'),subtitle:''})}
      ];
      const adapter = adapters.find(item => item.applies);
      if (adapter) ({title,subtitle} = adapter.read());
      // Browser media-session metadata is the final title source, never artwork, recommendations or URL slugs.
      if (!title && !media.length && !playerConflict) {
        try { title = normalized(navigator.mediaSession?.metadata?.title); } catch { /* Optional browser API. */ }
      }
      if (!title && mubiPlayer && !media.length && !playerConflict) {
        // Accept an explicit film/year browser title, not a generic player label or a humanized URL.
        const label = normalized(document.title);
        const match = label.match(/^(.+?)\s*\(((?:18|19|20|21)\d{2})\)\s*(?:\|\s*MUBI|adlı filmi MUBI'de izle)$/i) ||
          label.match(/^Watch\s+(.+?)\s*\(((?:18|19|20|21)\d{2})\)\s+on MUBI$/i);
        if (match) title = normalized(match[1]);
      }
      if (!playerConflict && title && title.length <= 180 && !/^(?:MUBI|Netflix|Disney\+?|Prime Video|Apple TV\+?|Max|HBO Max|Hulu|Peacock)$/i.test(title)) {
        player = {name:title,type:mubiPlayer ? 'movie' : '',subtitle};
      }
    }
    if (playerConflict) media.length = 0;
  }
  let untypedTitle = '';
  if (!playerPage && document.querySelectorAll('h1').length === 1) {
    const name = normalized(headingCopy?.textContent);
    if (primeDetail && !media.length) {
      const images = heading?.querySelectorAll('img') || [];
      const title = name || (images.length === 1 ? normalized(images[0].getAttribute('alt')) : '');
      if (title && title.length <= 180) {
        if (document.querySelector('#tab-selector-episodes[role="tab"]')) media.push({type:'series',name:title,alternateNames:[],date:'',sameAs:[],url:''});
        else untypedTitle = title;
      }
    }
    if (host === 'tv.apple.com' && !media.length && name && name.length <= 180) {
      const path = pathname.match(/^\/(?:[a-z]{2}\/)?(movie|show)\/[^/]+\/umc\.cmc\.[a-z0-9]+\/?$/i);
      if (path) media.push({type:path[1] === 'movie' ? 'movie' : 'series',name,alternateNames:[],date:'',sameAs:[],url:''});
    }
    if (/^(?:www\.)?disneyplus\.com$/.test(host) && /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?browse\/entity-[a-z0-9-]+\/?$/i.test(pathname) && media.length === 1 && name) {
      const record = media[0];
      const label = normalized(record.name).replace(/\s*\|\s*Disney\+\s*$/i,'');
      const labels = [name,`Watch ${name}`,`Ver ${name}`,`Assista ${name}`,`Assista a ${name}`,`Guarda ${name}`,`${name} İzleyin`];
      if (['movie','series'].includes(record.type) && labels.some(value => value.toLocaleLowerCase('tr') === label.toLocaleLowerCase('tr'))) record.name = name;
    }
  }
  // YouTube IDs identify uploads, not movies. Use only sources bound to this upload.
  const youtubeHost = /^(?:www\.|m\.)?youtube\.com$/.test(host);
  let youtube = null;
  if (youtubeHost) {
    let id = '';
    try {
      const url = new URL(location.href);
      const ids = pathname === '/watch' ? url.searchParams.getAll('v') : [];
      const pathId = pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})\/?$/)?.[1];
      const candidate = pathname === '/watch' && ids.length === 1 ? ids[0] : pathId;
      if (/^[\w-]{11}$/.test(candidate || '')) id = candidate;
    } catch { /* Malformed or ambiguous routes remain manual. */ }
    let name = '', conflict = false;
    if (id) {
      const headings = Array.from(document.querySelectorAll(`ytd-watch-flexy[video-id="${id}"]:not([hidden]) #title h1`));
      const values = [...new Set(headings.slice(0,10).map(node => normalized(node.textContent)).filter(Boolean))];
      if (headings.length > 10 || values.length > 1) conflict = true;
      else name = values[0] || '';
      if (meta('meta[itemprop="videoId"]') === id) {
        const candidate = normalized(meta('meta[property="og:title"]'));
        if (name && candidate && name !== candidate) conflict = true;
        else name ||= candidate;
      }
    }
    youtube = {id,name:conflict || name.length > 180 ? '' : name,conflict};
  }
  return { heading: text(headingCopy?.textContent), headingCount:Math.max(heading ? 1 : 0,document.querySelectorAll('h1').length),
    alternateHeading: text(small?.textContent), pageTitle: text(document.title),
    ogTitle: meta('meta[property="og:title"]'), ogType: meta('meta[property="og:type"]'),
    pathname: text(location.pathname), media, playerPage, player, disneyPlayer:disney, untypedTitle, youtube };
}

// One bounded MAIN-world read of the current upload's title. No streaming, account or comment data.
function collectYouTubePlayerData() {
  if (!/^(?:www\.|m\.)?youtube\.com$/i.test(location.hostname)) return null;
  try {
    const url = new URL(location.href);
    const ids = url.pathname === '/watch' ? url.searchParams.getAll('v') : [];
    const id = url.pathname === '/watch' && ids.length === 1 ? ids[0] : url.pathname.match(/^\/(?:embed|shorts|live)\/([\w-]{11})\/?$/)?.[1];
    if (!/^[\w-]{11}$/.test(id || '')) return {id:'',name:''};
    const details = window.ytInitialPlayerResponse?.videoDetails;
    const name = details?.videoId === id && typeof details.title === 'string' && details.title.length <= 180 ? details.title : '';
    return {id,name};
  } catch { return null; }
}

// Only Disney's custom player metadata needs the page's MAIN world. One read, no page changes or API requests.
function collectDisneyPlayerData() {
  if (!/^(?:(?:www\.)?apps\.|www\.)?disneyplus\.com$/i.test(location.hostname) ||
    !/^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?play\/[^/]+\/?$/i.test(location.pathname) || !document.querySelector('video')) return null;
  try {
    const players = document.querySelectorAll('disney-web-player');
    if (players.length !== 1) return null;
    const metadata = players[0].mediaPlayer?.mediaPlaybackCriteria?.metadata;
    const text = value => typeof value === 'string' && value.length <= 180 ? value : '';
    const name = text(metadata?.title?.text);
    return name ? {name,type:'',subtitle:text(metadata?.subtitle?.text),pathname:location.pathname} : null;
  } catch { return null; }
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
    title = title.replace(/\s(?:(?:full\s*)?hd\s*[iİı]zle|[iİı]zle|türkçe\s*dublaj|türkçe\s*altyazılı|altyazılı|1080p|720p|full\s*film|sansürsüz|hd)\s*$/iu, '').trim();
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
    /^(.+?)\s+(?:S(\d{1,4})\s*:?\s*E(\d{1,4})|(\d{1,4})x(\d{1,4}))$/iu
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

function youTubeSuggestions(value) {
  const raw = normalizeText(value);
  if (!isValidTitle(raw)) return [];
  let title = raw, movieLabel = false, year = '';
  let previous;
  do {
    previous = title;
    const suffix = title.match(/(?:\s*[|–—-]\s*|\s+)(full movie|full film|complete movie|película completa|filme completo|film completo|tek parça|türkçe dublaj|türkçe altyazılı|full hd|1080p|720p|4k)\s*$/iu);
    if (suffix) {
      movieLabel ||= /^(?:full movie|full film|complete movie|película completa|filme completo|film completo)$/iu.test(suffix[1]);
      title = title.slice(0,suffix.index).trim();
    }
    const dated = title.match(/\s*\(((?:18|19|20|21)\d{2})\)\s*$/);
    if (dated) { year = dated[1]; title = title.slice(0,dated.index).trim(); }
  } while (title !== previous);
  if (!isValidTitle(title)) return [];
  const episode = !title.includes('|') ? episodePattern(title) : null;
  if (episode) return [{...episode,type:'episode',year:''}];
  // A Turkish absolute episode number is useful, but it does not prove a season number.
  const partial = title.match(/^(.+?)\s+(\d{1,4})\.?\s*b[öo]l[üu]m$/iu);
  if (partial && isValidTitle(normalizeText(partial[1])) && episodeNumber(partial[2])) {
    return [{title:normalizeText(partial[1]),type:'episode',season:'',episode:episodeNumber(partial[2]),year:''}];
  }
  return title !== raw ? [{title,type:movieLabel ? 'movie' : '',season:'',episode:'',year}] : [];
}

function episodePath(value) {
  try {
    // Pathname only: query values, fragments, episode lists and unrelated links are not evidence.
    const path = String(value || '');
    if (path.length > 2000 || /[?#]/.test(path)) return null;
    const nested = path.match(/^\/(?:dizi|series|shows|tv)\/([^/]+)\/(?:sezon|season|temporada|stagione)-(\d{1,4})\/(?:bolum|episode|episodio|capitulo)-(\d{1,4})(?:-(?:hd\d{1,3}|1080p|720p|izle|watch))?\/?$/iu);
    if (nested) {
      const season = episodeNumber(nested[2],true), episode = episodeNumber(nested[3]);
      const title = decodeURIComponent(nested[1]);
      if (season !== '' && episode !== '' && !/[/?#]/.test(title)) return {title,season,episode,nested:true};
      return null;
    }
    const segment = decodeURIComponent(path.split('/').filter(Boolean).pop() || '');
    const match = segment.match(/^(.+?)-(?:s(\d{1,4})e(\d{1,4})|(\d{1,4})-sezon-(\d{1,4})-bolum|(?:season|temporada|stagione)-(\d{1,4})-(?:episode|episodio|capitulo)-(\d{1,4}))(?:-(?:\d+-)?(?:izle|watch)(?:-\d+)?)?$/iu);
    if (match) {
      const s = episodeNumber(match[2] ?? match[4] ?? match[6], true);
      const e = episodeNumber(match[3] ?? match[5] ?? match[7]);
      if (s !== '' && e !== '') return {title:match[1],season:s,episode:e,nested:false};
    }
  } catch { /* Malformed escapes cannot invalidate other page evidence. */ }
  return null;
}

function episodeFromPage(data, metadataTitles, season, episode) {
  const patterns = [data.heading, data.ogTitle, data.pageTitle].map(episodePattern).filter(Boolean);
  const pathPattern = episodePath(data.pathname);
  const samePathTitle = title => {
    const slug = titleSlug(pathPattern?.title), candidate = titleSlug(title);
    return candidate === slug || Boolean(pathPattern?.nested && candidate === slug.replace(/-izle(?:-\d+)?$/u,''));
  };
  // A URL slug cannot supply a properly written series title by itself.
  const pathTitle = pathPattern && metadataTitles.find(samePathTitle);
  const candidate = patterns[0] || (pathTitle ? {...pathPattern,title:pathTitle} : null);
  if (!candidate) return null;
  const matches = item => titleSlug(item.title) === titleSlug(candidate.title) &&
    item.season === candidate.season && item.episode === candidate.episode;
  if (!patterns.every(matches) || pathPattern && (!samePathTitle(candidate.title) || pathPattern.season !== candidate.season || pathPattern.episode !== candidate.episode)) return null;
  if (metadataTitles.length && !metadataTitles.some(title => titleSlug(title) === titleSlug(candidate.title))) return null;
  if (season !== '' && season !== candidate.season || episode !== '' && episode !== candidate.episode) return null;
  return candidate;
}

function detectMedia(data) {
  const empty = { type:'', title:'', titles:[], imdbId:'', seriesImdbId:'', episodeImdbId:'', year:'', source:'', sourceKey:'', season:'', episode:'', episodeTitle:'' };
  if (!data || typeof data !== 'object') return empty;
  if (data.youtube) {
    const title = normalizeText(data.youtube.name);
    if (!/^[\w-]{11}$/.test(data.youtube.id || '') || data.youtube.conflict || !isValidTitle(title)) return empty;
    return {...empty,title,titles:[title],sourceKey:'sourceYouTube',source:'YouTube video title',suggestions:youTubeSuggestions(title)};
  }
  if (data.playerPage) {
    const player = data.player;
    const bound = Array.isArray(data.media) && data.media.length === 1 ? detectMedia({media:data.media}) : empty;
    if (!player) return bound;
    const title = normalizeText(player.name);
    if (!isValidTitle(title)) return empty;
    // A current player title takes precedence over stale detail metadata. Never transfer a conflicting ID.
    const subtitle = normalizeText(player.subtitle);
    const match = subtitle.match(/^(?:S(\d{1,4})\s*[:,·]?\s*E(\d{1,4})|(?:Season|Temporada|Stagione)\s*(\d{1,4})\s*[,·:-]?\s*(?:Episode|Episodio|Episódio|Capítulo)\s*(\d{1,4})|(\d{1,4})\.?\s*Sezon\s*[,·:-]?\s*(\d{1,4})\.?\s*B[öo]l[üu]m)(?:(?:\s*[-–—:·,]\s*|\s+)(.*))?$/iu);
    const parsedSeason = match ? episodeNumber(match[1] ?? match[3] ?? match[5], true) : '';
    const parsedEpisode = match ? episodeNumber(match[2] ?? match[4] ?? match[6]) : '';
    const numbered = parsedSeason !== '' && parsedEpisode !== '';
    const season = numbered ? parsedSeason : '';
    const episode = numbered ? parsedEpisode : '';
    const type = numbered ? 'episode' : player.type === 'movie' ? 'movie' : '';
    if (bound.titles.some(value => value.toLocaleLowerCase('tr') === title.toLocaleLowerCase('tr')) &&
      (!numbered || bound.type === 'episode' && (!bound.season || bound.season === season) && (!bound.episode || bound.episode === episode))) {
      return numbered ? {...bound,season,episode,episodeTitle:(match[7] || bound.episodeTitle).slice(0,180)} : bound;
    }
    return {...empty,title,titles:[title],type,season,episode,
      episodeTitle:type === 'episode' ? (match[7] || '').slice(0,180) : '',sourceKey:'sourcePlayer',source:'Player title'};
  }
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
  // Without valid metadata, require a complete primary heading corroborated by a typed episode route.
  // A title pattern alone must not reclassify an article, collection or movie.
  const routeEpisode = !selected && (!data.ogType || data.ogType === 'website') &&
    (data.headingCount === undefined || data.headingCount === 1) && episodePath(data.pathname)?.nested &&
    episodePattern(data.heading) ? episodeFromPage(data,[], '', '') : null;
  const type = selected?.type || ogType || (routeEpisode ? 'episode' : '');
  if (!type) {
    const title = normalizeText(data.untypedTitle);
    return !items.length && isValidTitle(title) ? {...empty,title,titles:[title],sourceKey:'sourceHeading',source:'Page heading'} : empty;
  }
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
  // Typed metadata binds each identity to its own work. Never reuse an episode ID for its series.
  const uniqueId = item => {
    const values = item ? [item.id,item.url,...(item.sameAs || [])] : [];
    const found = [...new Set(values.map(imdbIdFromUrl).filter(Boolean))];
    return found.length === 1 ? found[0] : '';
  };
  const seriesImdbId = type === 'series' || type === 'episode' ? uniqueId(movie) : '';
  const episodeImdbId = type === 'episode' ? uniqueId(selected) : '';
  const headingYear = normalizeText(hasAlternateHeading ? data.alternateHeading : data.heading).match(/\(((?:18|19|20|21)\d{2})\)\s*$/)?.[1];
  const dateYear = (type === 'episode' ? selected?.date : movie?.date)?.match(/^((?:18|19|20|21)\d{2})(?:-|$)/)?.[1];
  return { type, title:titles[0] || '', titles:titles.slice(0, 6), imdbId:ids.length === 1 ? ids[0] : '',
    seriesImdbId:seriesImdbId === episodeImdbId ? '' : seriesImdbId,
    episodeImdbId:episodeImdbId === seriesImdbId ? '' : episodeImdbId,
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
  if (destination === 'imdb') {
    // Episode search needs both explicit numbers even when metadata supplies an ID.
    const query = type === 'episode' && context.scope === 'episode'
      ? discussionQuery(title,type,context,'reddit').replace(/ discussion$/, '') : title;
    if (/^tt\d{7,12}$/.test(imdbId)) return `https://www.imdb.com/title/${imdbId}/`;
    return `https://www.imdb.com/find/?q=${encodeURIComponent(query)}&s=tt`;
  }
  if (destination === 'letterboxd') {
    if (type === 'movie' && /^tt\d{7,12}$/.test(imdbId)) return `https://letterboxd.com/imdb/${imdbId}/`;
    const query = encodeURIComponent(title).replace(/\./g, '%2E');
    return `https://letterboxd.com/search/films/${query}/`;
  }
  throw new Error('Unknown destination');
}

const FilmTools = Object.freeze({ collectPageData, collectDisneyPlayerData, collectYouTubePlayerData, youTubeSuggestions, normalizeText, cleanTitle, isValidTitle,
  imdbIdFromUrl, episodeNumber, detectMedia, detectFilm, discussionQuery, destinationUrl });
if (typeof module !== 'undefined' && module.exports) module.exports = FilmTools;
