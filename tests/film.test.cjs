const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const f = require('../film.js');
const raw = require('./fixtures/raw.json');

test('Raw regression: separate localized and alternative titles, preserve release year', () => {
  const film = f.detectFilm(raw);
  assert.equal(film.title, 'Raw');
  assert.deepEqual(film.titles, ['Raw', 'Mezar']);
  assert.equal(film.year, '2016'); // The JSON-LD date is a later local release.
  assert.equal(film.imdbId, 'tt4954522');
  assert.equal(f.destinationUrl('eksi', film.title), 'https://eksisozluk.com/?q=Raw');
  assert.equal(f.destinationUrl('letterboxd', film.title, film.imdbId), 'https://letterboxd.com/imdb/tt4954522/');
});

for (const title of ['1917', 'Blade Runner 2049', '12 Angry Men', 'Se7en', '2001: A Space Odyssey', '500 Days of Summer', 'M', 'Ölümlü Dünya', 'Paris, Texas', 'Birdman (or The Unexpected Virtue of Ignorance)', 'İzleyen', 'HD']) {
  test(`Preserves meaningful title: ${title}`, () => assert.equal(f.cleanTitle(title), title));
}

test('Removes SEO suffixes without deleting embedded numbers or parenthetical title', () => {
  assert.equal(f.cleanTitle('Blade Runner 2049 (2017)'), 'Blade Runner 2049');
  assert.equal(f.cleanTitle('1917 Türkçe Dublaj Full HD izle | Example Movie Catalog'), '1917');
  assert.equal(f.cleanTitle('Saltburn - IMDb'), 'Saltburn');
  assert.equal(f.cleanTitle('Mezar (2016) izle'), 'Mezar');
});
test('Does not claim a homepage, article or collection is one movie', () => {
  assert.equal(f.detectFilm({heading:'Ana Sayfa', pageTitle:'Film izle', movies:[]}).title, '');
  assert.equal(f.detectFilm({movies:[{name:'Raw'}, {name:'Saltburn'}]}).title, '');
});
test('Structured film title outranks branding and ordinary h1', () => {
  const film = f.detectFilm({heading:'Letterboxd — Your life in film', movies:[{name:'Raw', alternateNames:['Grave']}]});
  assert.equal(film.title, 'Raw');
  assert.deepEqual(film.titles, ['Raw','Grave']);
});
test('Open Graph movie page fallback supports a single-letter title', () => {
  assert.equal(f.detectFilm({ogType:'video.movie',heading:'M (1931)'}).title, 'M');
});
test('Cannot obtain an identity from lookalike domains, query parameters or executable URLs', () => {
  for (const url of ['https://imdb.com.evil.test/title/tt4954522', 'https://evil.test/?x=https://imdb.com/title/tt4954522', 'javascript:tt4954522', 'https://www.imdb.com/title/tt4954522evil']) assert.equal(f.imdbIdFromUrl(url),'');
  assert.equal(f.imdbIdFromUrl('https://www.imdb.com/title/tt4954522/'), 'tt4954522');
});
test('Conflicting identities and unrelated recommendation links fall back to title search', () => {
  assert.equal(f.detectFilm({...raw, movies:[{name:'Mezar',sameAs:['https://imdb.com/title/tt4954522','https://imdb.com/title/tt0111161']}]}).imdbId,'');
  assert.equal(f.detectFilm({movies:[{name:'Raw'}],imdbLinks:['https://imdb.com/title/tt0111161']}).imdbId,'');
});
test('URL encoding keeps hostile input inside the search value on a fixed HTTPS origin', () => {
  for (const title of ['A&B # / ? +', '<img src=x onerror=alert(1)>', 'https://evil.test/', '\ud800']) {
    const url = new URL(f.destinationUrl('eksi',title));
    assert.equal(url.origin,'https://eksisozluk.com');
    assert.equal(url.searchParams.get('q'),f.normalizeText(title));
    const lb = new URL(f.destinationUrl('letterboxd',title));
    assert.equal(lb.origin,'https://letterboxd.com');
    assert.ok(lb.pathname.startsWith('/search/films/'));
  }
  assert.throws(()=>f.destinationUrl('other','Raw'));
  assert.throws(()=>f.destinationUrl('eksi',' '));
  assert.throws(()=>f.destinationUrl('eksi','x'.repeat(181)));
  assert.throws(()=>f.destinationUrl('letterboxd','..'));
});

function collectWith(scripts, options = {}) {
  const smallTexts = options.smallTexts || (options.small ? ['Raw (2016)'] : []);
  const mainHeading = options.heading || 'Mezar izle';
  const heading = {querySelectorAll:()=>smallTexts.map(textContent=>({textContent})),
    cloneNode:()=>{
      const copy = {textContent:[mainHeading, ...smallTexts].join(' ')};
      copy.querySelectorAll = () => smallTexts.map(() => ({remove(){copy.textContent = mainHeading;}}));
      return copy;
    }};
  const document = {
    title:options.pageTitle || 'Mezar izle',
    querySelector:selector=>selector==='h1' ? heading : selector==='meta[property="og:type"]' ? {content:options.ogType||''} : selector==='meta[property="og:title"]' ? {content:options.ogTitle||''} : selector==='script#__NEXT_DATA__' && options.nextData !== undefined ? {type:'application/json',textContent:options.nextData} : null,
    querySelectorAll:selector=>selector.startsWith('script') ? scripts.map(textContent=>({textContent})) : []
  };
  const url = new URL(options.url || 'https://example.test/film');
  return vm.runInNewContext(`(${f.collectPageData.toString()})()`, {document, URL, location:{hostname:options.host||url.hostname,href:url.href,pathname:url.pathname}});
}
test('Serialized collector handles graph, mainEntity, schema type arrays and malformed JSON', () => {
  const data = collectWith(['{broken', JSON.stringify({'@graph':[{'@type':'WebPage',mainEntity:{'@type':['Thing','Movie'],name:'Raw',sameAs:'https://imdb.com/title/tt4954522'}}]})]);
  assert.equal(f.detectFilm(data).title,'Raw');
  assert.equal(f.detectFilm(data).imdbId,'tt4954522');
});
test('Collector ignores recommendations and large payloads', () => {
  const data = collectWith([JSON.stringify({'@type':'ItemList',itemListElement:[{'@type':'Movie',name:'Raw'}]}), ' '.repeat(100001)]);
  assert.equal(data.media.length,0);
});
test('Matching movie metadata enables a separate alternative heading on any hostname', () => {
  const scripts = [JSON.stringify({'@type':'Movie',name:'Mezar',datePublished:'2017-08-25',sameAs:'https://imdb.com/title/tt4954522/'})];
  for (const host of ['catalog.example', 'another.example']) {
    const data = collectWith(scripts, {host,small:true});
    assert.equal(data.heading,'Mezar izle');
    assert.equal(data.alternateHeading,'Raw (2016)');
    assert.equal(f.detectFilm(data).title,'Raw');
    assert.equal(f.detectFilm(data).year,'2016');
    assert.equal(f.detectFilm(data).imdbId,'tt4954522');
  }
});
test('A heading and release year without movie metadata cannot identify a movie', () => {
  assert.equal(f.detectFilm(collectWith([], {small:true})).title,'');
});
test('Unrelated small headings cannot override structured movie identity', () => {
  const scripts = [JSON.stringify({'@type':'Movie',name:'Saltburn',datePublished:'2023-01-01'})];
  const film = f.detectFilm(collectWith(scripts, {small:true}));
  assert.equal(film.title,'Saltburn');
  assert.deepEqual(film.titles,['Saltburn']);
  assert.equal(film.year,'2023');
});
test('Ratings and ambiguous small headings are not alternative titles', () => {
  const scripts = [JSON.stringify({'@type':'Movie',name:'Mezar'})];
  for (const smallTexts of [['8.5 / 10'], ['Raw (2016)','Other (2020)'], ['(2016)']]) {
    const data = collectWith(scripts, {smallTexts});
    assert.equal(data.alternateHeading,'');
    assert.equal(f.detectFilm(data).title,'Mezar');
  }
});
test('Open Graph movie metadata must agree with the main heading to prefer an alternative', () => {
  assert.equal(f.detectFilm({...raw,movies:[],ogType:'video.movie',ogTitle:'Mezar'}).title,'Raw');
  assert.equal(f.detectFilm({...raw,movies:[],ogType:'video.movie',ogTitle:'Saltburn'}).title,'Mezar');
});
test('Unscoped IMDb links cannot supply an identity for a separate alternative heading', () => {
  assert.equal(f.detectFilm({...raw,movies:[{name:'Mezar'}]}).imdbId,'');
});
test('Manifest stays minimal and all production assets exist', () => {
  const manifest = require('../manifest.json');
  assert.deepEqual(manifest.permissions,['activeTab','scripting','storage']);
  assert.equal(manifest.host_permissions,undefined);
  assert.equal(manifest.content_scripts,undefined);
  assert.match(manifest.content_security_policy.extension_pages,/connect-src 'none'/);
  for (const file of ['popup.html','popup.css','film.js','i18n.js','popup.js']) assert.ok(fs.existsSync(path.join(__dirname,'..',file)));
});

const tv = require('./fixtures/tv.json');
test('TVSeries metadata preserves numbered titles and identifies the media type', () => {
  const media = f.detectMedia(collectWith([JSON.stringify(tv.series)]));
  assert.equal(media.type,'series');
  assert.equal(media.title,'Example Series 2049');
  assert.equal(media.year,'2020');
  assert.equal(media.imdbId,'');
});
test('Episode graph references resolve the series, season and episode without mixing identities', () => {
  const data = collectWith([JSON.stringify(tv.episode)]);
  const media = f.detectMedia(data);
  assert.equal(media.type,'episode');
  assert.equal(media.title,'Example Series 2049');
  assert.equal(media.episodeTitle,'A New Start');
  assert.equal(media.season,'1');
  assert.equal(media.episode,'2');
  assert.equal(media.year,'2021');
  assert.equal(media.imdbId,'');
  assert.equal(f.destinationUrl('letterboxd',media.title,'tt1234567',media.type),'https://letterboxd.com/search/films/Example%20Series%202049/');
});
test('Nested season and legacy series relationships resolve correctly', () => {
  const node = {'@type':'https://schema.org/TVEpisode',name:'Special',episodeNumber:'01',partOfSeason:{seasonNumber:0,partOfTVSeries:{name:'Example Show'}}};
  const media = f.detectMedia(collectWith([JSON.stringify(node)]));
  assert.equal(media.title,'Example Show');
  assert.equal(media.season,'0');
  assert.equal(media.episode,'1');
});
test('An episode and its referenced series are not mistaken for an ambiguous collection', () => {
  const node = {'@graph':[{'@type':'TVSeries','@id':'#series',name:'Example Show'},{'@type':'TVEpisode',name:'Pilot',partOfSeries:{'@id':'#series'}}]};
  assert.equal(f.detectMedia(collectWith([JSON.stringify(node)])).type,'episode');
  node['@graph'].push({'@type':'TVSeries',name:'Another Show'});
  assert.equal(f.detectMedia(collectWith([JSON.stringify(node)])).type,'');
});
test('Explicit mainEntity identifies a page among unrelated graph entries', () => {
  const node = {'@graph':[{'@type':'WebPage',mainEntity:{'@id':'#current'}},{'@id':'#current','@type':'TVSeries',name:'Current Show'},{'@type':'Movie',name:'Another Movie'}]};
  assert.equal(f.detectMedia(collectWith([JSON.stringify(node)])).title,'Current Show');
  node['@graph'][0].mainEntity = [{'@id':'#current'},{'@type':'Movie',name:'Ambiguous Movie'}];
  assert.equal(f.detectMedia(collectWith([JSON.stringify(node)])).type,'');
});
test('Repeated graph metadata does not create false ambiguity', () => {
  assert.equal(f.detectMedia(collectWith([JSON.stringify(tv.series),JSON.stringify(tv.series)])).title,'Example Series 2049');
});
test('Missing episode parent leaves the series title blank instead of searching for an episode name', () => {
  const media = f.detectMedia(collectWith([JSON.stringify({'@type':'TVEpisode',name:'Pilot',episodeNumber:1})]));
  assert.equal(media.type,'episode');
  assert.equal(media.title,'');
  assert.equal(media.episodeTitle,'Pilot');
});
test('Cyclic and unresolved references do not hang or fetch remote records', () => {
  const node = {'@graph':[{'@id':'#page','@type':'WebPage',mainEntity:{'@id':'#page'}},{'@type':'TVEpisode',name:'Pilot',partOfSeries:{'@id':'https://outside.example/series'}}]};
  assert.equal(f.detectMedia(collectWith([JSON.stringify(node)])).title,'');
});
test('Open Graph TV evidence identifies series and episodes but cannot invent a series title', () => {
  assert.equal(f.detectMedia({ogType:'video.tv_show',heading:'Example Show'}).type,'series');
  const media = f.detectMedia({ogType:'video.episode',heading:'Pilot'});
  assert.equal(media.type,'episode');
  assert.equal(media.title,'');
});
test('Episode searches use destination-language numbering and validate missing or hostile numbers', () => {
  assert.equal(new URL(f.destinationUrl('eksi','Example Show','','episode',{scope:'episode',season:'01',episode:'2'})).searchParams.get('q'),'Example Show 1. sezon 2. bölüm');
  assert.equal(f.discussionQuery('Example Show','episode',{scope:'series'}),'Example Show');
  assert.equal(f.discussionQuery('Example Show','episode',{scope:'episode',season:0,episode:1}),'Example Show 0. sezon 1. bölüm');
  for (const season of ['',-1,'1.5','Infinity','<img>',1000]) assert.throws(()=>f.discussionQuery('Example Show','episode',{scope:'episode',season,episode:1}));
  for (const episode of ['',0,-1,'1.5','1 OR 1',10000]) assert.throws(()=>f.discussionQuery('Example Show','episode',{scope:'episode',season:1,episode}));
  assert.throws(()=>f.destinationUrl('letterboxd','Title','','unknown'));
});
test('Malformed media collections fall back safely to manual entry', () => {
  for (const data of [null,undefined,{}, {movies:{}}, {media:[null,{}, {type:'unknown'}]}]) assert.equal(f.detectMedia(data).title,'');
});
test('Relative, absolute and cross-script JSON-LD references resolve to the same local record', () => {
  const episode={'@type':'TVEpisode',name:'Pilot',episodeNumber:1,partOfSeason:{'@id':'#season'}};
  const parents={'@graph':[{'@type':'TVSeason','@id':'https://example.test/film#season',seasonNumber:2,partOfSeries:'#series'}, {'@type':'TVSeries','@id':'https://example.test/film#series',name:'Example Show'}]};
  const media=f.detectMedia(collectWith([JSON.stringify(episode),JSON.stringify(parents)]));
  assert.equal(media.type,'episode');
  assert.equal(media.title,'Example Show');
  assert.equal(media.season,'2');
});

const episodePage = {
  heading:'Breaking Bad 1. Sezon 1. Bölüm',
  ogTitle:'Breaking Bad 1. Sezon 1. Bölüm izle | Example Catalog',
  pageTitle:'Breaking Bad 1. Sezon 1. Bölüm izle | Example Catalog',
  ogType:'video.episode', pathname:'/bolum/breaking-bad-1-sezon-1-bolum-1-izle-16/'
};
test('Episode heading regression fills the series name and both numbers with only Open Graph evidence', () => {
  const media = f.detectMedia(episodePage);
  assert.equal(media.type,'episode');
  assert.equal(media.title,'Breaking Bad');
  assert.equal(media.season,'1');
  assert.equal(media.episode,'1');
});
test('Collector reads a Review itemReviewed only when its URL identifies the current page', () => {
  const item = {'@type':'TVEpisode',name:'Pilot',url:'https://example.test/film',episodeNumber:1,
    partOfSeries:{name:'Breaking Bad'},partOfSeason:{seasonNumber:1}};
  const review = {'@type':'https://schema.org/Review',itemReviewed:item};
  const data = collectWith([JSON.stringify(review)]);
  assert.equal(data.media.length,1);
  assert.equal(f.detectMedia(data).title,'Breaking Bad');
  assert.equal(f.detectMedia(data).season,'1');
  assert.equal(f.detectMedia(data).episode,'1');
  for (const url of ['https://other.test/film','https://example.test/another',undefined]) {
    item.url=url;
    assert.equal(collectWith([JSON.stringify(review)]).media.length,0);
  }
});
test('Incomplete episode metadata can use the matching heading but never another series or conflicting numbers', () => {
  const base = {...episodePage,media:[{type:'episode',name:'Pilot',series:{name:'Breaking Bad'}}]};
  assert.equal(f.detectMedia(base).season,'1');
  assert.equal(f.detectMedia(base).episode,'1');
  const other = f.detectMedia({...base,media:[{type:'episode',name:'Pilot',series:{name:'Other Show'}}]});
  assert.equal(other.title,'Other Show');
  assert.equal(other.season,'');
  const conflict = f.detectMedia({...base,media:[{type:'episode',season:2,series:{name:'Breaking Bad'}}]});
  assert.equal(conflict.season,'2');
  assert.equal(conflict.episode,'');
});
test('Episode fallback preserves numbered titles, supports specials and common international labels', () => {
  for (const heading of ['Example Series 2049 0. Sezon 02. Bölüm','Example Series 2049 S00E02',
    'Example Series 2049 0x02','Example Series 2049 Season 0 Episode 2',
    'Example Series 2049 Temporada 0 Episodio 2','Example Series 2049 Temporada 0 Episódio 2',
    'Example Series 2049 Stagione 0 Episodio 2']) {
    const media = f.detectMedia({ogType:'video.episode',heading});
    assert.equal(media.title,'Example Series 2049');
    assert.equal(media.season,'0');
    assert.equal(media.episode,'2');
  }
});
test('Conflicting page signals, invalid numbers and prose do not invent episode information', () => {
  for (const overrides of [
    {pathname:'/bolum/breaking-bad-2-sezon-1-bolum/'},
    {ogTitle:'Breaking Bad 1. Sezon 2. Bölüm'},
    {heading:'Another Show 1. Sezon 1. Bölüm'}
  ]) assert.equal(f.detectMedia({...episodePage,...overrides}).title,'');
  for (const heading of ['Show 1000. Sezon 1. Bölüm','Show 1. Sezon 0. Bölüm',
    'Show 1. Sezon 10000. Bölüm','Show 1. Sezon 1. Bölüm review','Show -1. Sezon 2. Bölüm']) {
    assert.equal(f.detectMedia({ogType:'video.episode',heading}).title,'');
  }
});
test('Title patterns alone cannot turn articles, collections or movies into episodes', () => {
  assert.equal(f.detectMedia({...episodePage,ogType:'article'}).type,'');
  assert.equal(f.detectMedia({...episodePage,ogType:'video.movie'}).type,'movie');
  assert.equal(f.detectMedia({...episodePage,media:[{type:'movie',name:'Real Movie'}]}).title,'Real Movie');
  assert.equal(f.detectMedia({...episodePage,media:[{type:'episode',name:'A'},{type:'episode',name:'B'}]}).title,'');
});
test('Path numbering fills missing numbers only for a known matching series without guessing a title', () => {
  const data = {ogType:'video.episode',pathname:'/episodes/example-show-s02e03/',media:[{type:'episode',name:'Pilot',series:{name:'Example Show'}}]};
  assert.equal(f.detectMedia(data).season,'2');
  assert.equal(f.detectMedia(data).episode,'3');
  assert.equal(f.detectMedia({...data,media:[]}).title,'');
  assert.equal(f.detectMedia({...data,pathname:'/episodes/other-show-s02e03/'}).season,'');
  assert.equal(f.detectMedia({...data,pathname:'/%zz'}).season,'');
});
test('Collector emits only the pathname, excluding potentially private query and fragment values', () => {
  const data = collectWith([], {url:'https://example.test/episode?private=value#token'});
  assert.equal(data.pathname,'/episode');
  assert.ok(!JSON.stringify(data).includes('private'));
  assert.ok(!JSON.stringify(data).includes('token'));
});

test('Reddit searches use fixed origins and destination-appropriate episode notation', () => {
  assert.equal(new URL(f.destinationUrl('reddit','Raw')).searchParams.get('q'),'Raw discussion');
  assert.equal(new URL(f.destinationUrl('reddit','Breaking Bad','','episode',{scope:'episode',season:'01',episode:'2'})).searchParams.get('q'),'Breaking Bad S01E02 discussion');
  assert.equal(new URL(f.destinationUrl('reddit','Show','','episode',{scope:'series'})).searchParams.get('q'),'Show discussion');
  assert.equal(new URL(f.destinationUrl('reddit','Show','','episode',{scope:'episode',season:0,episode:12})).searchParams.get('q'),'Show S00E12 discussion');
  for (const title of ['A&B # / ?','<img src=x onerror=alert(1)>','https://evil.test/']) {
    const url = new URL(f.destinationUrl('reddit',title));
    assert.equal(url.origin,'https://www.reddit.com');
    assert.equal(url.pathname,'/search/');
    assert.equal(url.searchParams.get('q'),`${title} discussion`);
  }
  assert.throws(()=>f.destinationUrl('reddit','Show','','episode',{scope:'episode',season:1,episode:0}));
});

const mubi = require('./fixtures/mubi.json');
const mubiOptions = {url:'https://mubi.com/tr/tr/films/crimes-of-the-future-2022',
  heading:'MÜSTAKBEL SUÇLAR',ogType:'video.movie',nextData:JSON.stringify(mubi)};
test('MUBI localized film title stays primary with its page-provided original title as an alternative', () => {
  const film=f.detectMedia(collectWith([],mubiOptions));
  assert.equal(film.title,'Müstakbel Suçlar');
  assert.deepEqual(film.titles,['Müstakbel Suçlar','Crimes of the Future']);
  assert.equal(film.year,'2022');
  assert.equal(film.imdbId,'');
});
test('MUBI English page titles stay primary and identical original titles are not duplicated', () => {
  const fixture=structuredClone(mubi);
  const record=fixture.props.pageProps.initFilm;
  record.title='Crimes of the Future'; record.title_upcase='CRIMES OF THE FUTURE';
  const options={...mubiOptions,url:'https://mubi.com/en/tr/films/crimes-of-the-future-2022',heading:record.title_upcase,nextData:JSON.stringify(fixture)};
  assert.deepEqual(f.detectMedia(collectWith([],options)).titles,['Crimes of the Future']);
  record.original_title='Example Original';
  assert.deepEqual(f.detectMedia(collectWith([],{...options,nextData:JSON.stringify(fixture)})).titles,['Crimes of the Future','Example Original']);
});
test('MUBI mismatched slugs, headings, hosts and non-film pages cannot supply alternative titles', () => {
  for (const options of [
    {...mubiOptions,url:'https://mubi.com/tr/tr/films/another-film'},
    {...mubiOptions,heading:'Another Movie'},
    {...mubiOptions,url:'https://mubi.com.evil.test/tr/tr/films/crimes-of-the-future-2022'},
    {...mubiOptions,url:'https://mubi.com/tr/tr/collections/crimes-of-the-future-2022'},
    {...mubiOptions,ogType:'article'},
    {...mubiOptions,nextData:'{broken'},
    {...mubiOptions,nextData:' '.repeat(250001)}
  ]) assert.equal(f.detectMedia(collectWith([],options)).titles.includes('Crimes of the Future'),false);
});
test('MUBI ignores recommendations and unavailable originals without deriving English from a URL slug', () => {
  const fixture=structuredClone(mubi);
  delete fixture.props.pageProps.initFilm.original_title;
  fixture.props.pageProps.recommendations=[{title:'Unrelated Film',original_title:'Another Film'}];
  assert.deepEqual(f.detectMedia(collectWith([],{...mubiOptions,nextData:JSON.stringify(fixture)})).titles,['Müstakbel Suçlar']);
  delete fixture.props.pageProps.initFilm;
  assert.deepEqual(f.detectMedia(collectWith([],{...mubiOptions,nextData:JSON.stringify(fixture)})).titles,['MÜSTAKBEL SUÇLAR']);
});
test('MUBI can enrich agreeing Movie metadata but cannot override unrelated or ambiguous media', () => {
  const film=f.detectMedia(collectWith([JSON.stringify({'@type':'Movie',name:'Crimes of the Future',datePublished:'2022',sameAs:'https://imdb.com/title/tt14549466/'})],mubiOptions));
  assert.equal(film.title,'Müstakbel Suçlar');
  assert.equal(film.imdbId,'tt14549466');
  assert.deepEqual(film.titles,['Müstakbel Suçlar','Crimes of the Future']);
  assert.equal(f.detectMedia(collectWith([JSON.stringify({'@type':'Movie',name:'Another Movie'})],mubiOptions)).title,'Another Movie');
  assert.equal(f.detectMedia(collectWith([JSON.stringify([{'@type':'Movie',name:'A'},{'@type':'Movie',name:'B'}])],mubiOptions)).title,'');
});
