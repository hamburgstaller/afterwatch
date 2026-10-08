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
  const heading = {querySelectorAll:selector=>selector==='img' ? (options.headingImages||[]).map(alt=>({getAttribute:()=>alt})) : smallTexts.map(textContent=>({textContent})),
    cloneNode:()=>{
      const copy = {textContent:[mainHeading, ...smallTexts].join(' ')};
      copy.querySelectorAll = () => smallTexts.map(() => ({remove(){copy.textContent = mainHeading;}}));
      return copy;
    }};
  const document = {
    title:options.pageTitle || 'Mezar izle',
    querySelector:selector=>selector==='h1' ? heading : selector==='meta[property="og:type"]' ? {content:options.ogType||''} : selector==='meta[property="og:title"]' ? {content:options.ogTitle||''} : selector==='script#__NEXT_DATA__' && options.nextData !== undefined ? {type:'application/json',textContent:options.nextData} : options.elements?.[selector]?.[0] || null,
    querySelectorAll:selector=>selector.startsWith('script') ? scripts.map(textContent=>({textContent})) : options.elements?.[selector] || []
  };
  const url = new URL(options.url || 'https://example.test/film');
  return vm.runInNewContext(`(${f.collectPageData.toString()})()`, {document, URL, navigator:options.navigator||{}, location:{hostname:options.host||url.hostname,href:url.href,pathname:url.pathname}});
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

test('IMDb identities remain bound to series and episode nodes, including graph references', () => {
  const node = {'@graph':[
    {'@type':'WebPage',mainEntity:{'@id':'#episode'}},
    {'@type':'TVSeries','@id':'#series',name:'Breaking Bad',url:'https://www.imdb.com/title/tt0903747/'},
    {'@type':'TVEpisode','@id':'#episode',name:'Pilot',sameAs:'https://www.imdb.com/title/tt0959621/',
      episodeNumber:1,partOfSeason:{seasonNumber:1},partOfSeries:{'@id':'#series'}}
  ]};
  const media = f.detectMedia(collectWith([JSON.stringify(node)]));
  assert.equal(media.title,'Breaking Bad'); assert.equal(media.seriesImdbId,'tt0903747');
  assert.equal(media.episodeImdbId,'tt0959621'); assert.equal(media.imdbId,'');
  assert.equal(f.destinationUrl('letterboxd',media.title,media.episodeImdbId,'episode'),'https://letterboxd.com/search/films/Breaking%20Bad/');
});

test('IMDb rejects conflicting, shared and unscoped TV identities without inventing replacements', () => {
  const series={name:'Example Show',sameAs:['https://www.imdb.com/title/tt0903747/']};
  const episode={type:'episode',name:'Pilot',season:'1',episode:'1',series,sameAs:['https://www.imdb.com/title/tt0959621/']};
  const conflicting=f.detectMedia({media:[{...episode,sameAs:[...episode.sameAs,'https://www.imdb.com/title/tt1234567/']}]});
  assert.equal(conflicting.episodeImdbId,''); assert.equal(conflicting.seriesImdbId,'tt0903747');
  const shared=f.detectMedia({media:[{...episode,sameAs:series.sameAs}]});
  assert.equal(shared.seriesImdbId,''); assert.equal(shared.episodeImdbId,'');
  const unscoped=f.detectMedia({ogType:'video.tv_show',heading:'Example Show',imdbLinks:series.sameAs});
  assert.equal(unscoped.seriesImdbId,'');
  assert.equal(f.detectMedia({media:[{type:'series',name:'Example Show',sameAs:['https://imdb.com.evil.test/title/tt0903747/']}]}).seriesImdbId,'');
});

test('Typed series @id can identify IMDb without putting TV identities into the movie field', () => {
  const media=f.detectMedia(collectWith([JSON.stringify({'@type':'TVSeries','@id':'https://www.imdb.com/title/tt0903747/',name:'Breaking Bad'})]));
  assert.equal(media.seriesImdbId,'tt0903747'); assert.equal(media.imdbId,''); assert.equal(media.episodeImdbId,'');
});

test('IMDb fallback uses encoded titles and explicit episode numbers on a fixed HTTPS origin', () => {
  assert.equal(f.destinationUrl('imdb','Breaking Bad','tt0903747','series'),'https://www.imdb.com/title/tt0903747/');
  for (const id of ['','tt0903747/evil','https://evil.test/','tt1']) {
    const url=new URL(f.destinationUrl('imdb','Example & Show / Türkçe',id,'series'));
    assert.equal(url.origin,'https://www.imdb.com'); assert.equal(url.pathname,'/find/');
    assert.equal(url.searchParams.get('q'),'Example & Show / Türkçe'); assert.equal(url.searchParams.get('s'),'tt');
  }
  const query=f.destinationUrl('imdb','Example Show','','episode',{scope:'episode',season:'0',episode:'12'});
  assert.equal(new URL(query).searchParams.get('q'),'Example Show S00E12');
  assert.throws(()=>f.destinationUrl('imdb','Example Show','tt0959621','episode',{scope:'episode',season:'',episode:'1'}));
});

test('A changed player episode cannot inherit prior series or episode IMDb identities', () => {
  const media={type:'episode',name:'Pilot',season:'1',episode:'1',sameAs:['https://www.imdb.com/title/tt0959621/'],series:{name:'Breaking Bad',sameAs:['https://www.imdb.com/title/tt0903747/']}};
  const current=f.detectMedia({playerPage:true,player:{name:'Breaking Bad',subtitle:'S01E02'},media:[media]});
  assert.equal(current.episode,'2'); assert.equal(current.episodeImdbId,''); assert.equal(current.seriesImdbId,'');
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

const nestedEpisode = require('./fixtures/nested-episode.json');

test('Detection reasons distinguish ambiguity, unavailable metadata and missing player/video titles', () => {
  const malformed=collectWith(['{"broken":"first\nsecond"}'],{heading:'News'});
  assert.equal(malformed.invalidMetadata,true); assert.equal(f.detectMedia(malformed).issue,'detectMetadataUnavailable');
  const valid=collectWith(['{"broken":"first\nsecond"}',JSON.stringify({'@type':'Movie',name:'Raw'})]);
  assert.equal(f.detectMedia(valid).title,'Raw'); assert.equal(f.detectMedia(valid).issue,'');
  assert.equal(f.detectMedia({media:[{type:'movie',name:'A'},{type:'movie',name:'B'}]}).issue,'detectAmbiguous');
  assert.equal(f.detectMedia({playerPage:true,player:null}).issue,'detectPlayerMissing');
  assert.equal(f.detectMedia({playerPage:true,playerConflict:true}).issue,'detectPlayerConflict');
  assert.equal(f.detectMedia({playerPage:true,identityMismatch:true}).issue,'detectPlayerConflict');
  assert.equal(f.detectMedia({youtube:{id:'AbCdEfG1234',name:'',conflict:false}}).issue,'detectVideoMissing');
  assert.equal(f.detectMedia({youtube:{id:'AbCdEfG1234',name:'A',conflict:true}}).issue,'detectVideoConflict');
});

test('Diagnostic reasons do not weaken conservative title, episode or identity handling', () => {
  const conflict=f.detectMedia({...nestedEpisode,pathname:'/dizi/breaking-bad-izle-6/sezon-2/bolum-1-hd15/'});
  assert.equal(conflict.title,''); assert.equal(conflict.issue,'detectEpisodeConflict');
  const incomplete=f.detectMedia({heading:'Other Show S01E02',media:[{type:'episode',name:'Pilot',series:{name:'Example Show'}}]});
  assert.equal(incomplete.title,'Example Show'); assert.equal(incomplete.season,''); assert.equal(incomplete.issue,'detectEpisodeConflict');
  const ids=f.detectMedia({media:[{type:'movie',name:'Raw',sameAs:['https://imdb.com/title/tt4954522/','https://imdb.com/title/tt1234567/']}]});
  assert.equal(ids.title,'Raw'); assert.equal(ids.imdbId,''); assert.equal(ids.issue,'detectIdentityConflict');
  const nav=f.detectMedia({navigationChanged:true,media:[{type:'movie',name:'Old Movie'}]});
  assert.equal(nav.title,''); assert.equal(nav.issue,'detectNavigationChanged');
  const hostile=f.detectMedia({issue:'<img src=x onerror=alert(1)>',heading:'News'});
  assert.equal(hostile.issue,'detectNoMedia');
});
test('A nested episode route and matching primary heading identify an episode without valid JSON-LD or Open Graph', () => {
  const malformed = '{"@type":"TVEpisode","name":"Breaking Bad 1. Sezon 1. Bölüm izle","description":"line one\nline two"}';
  const page=collectWith([malformed],{heading:nestedEpisode.heading,pageTitle:nestedEpisode.pageTitle,url:'https://example.test'+nestedEpisode.pathname});
  assert.equal(page.media.length,0);
  const media=f.detectMedia(page);
  assert.equal(media.type,'episode'); assert.equal(media.title,'Breaking Bad');
  assert.equal(media.season,'1'); assert.equal(media.episode,'1');
  assert.equal(media.year,''); assert.equal(media.imdbId,''); assert.equal(media.episodeImdbId,'');
});

test('Nested path fallback preserves meaningful title numbers, original spelling and season zero', () => {
  for(const data of [
    {...nestedEpisode,heading:'Example Series 2049 0. Sezon 02. Bölüm İZLE',pageTitle:'',pathname:'/dizi/example-series-2049-izle-6/sezon-0/bolum-2-hd15/'},
    {...nestedEpisode,heading:'Example Series 2049 Season 0 Episode 2',pageTitle:'',pathname:'/series/example-series-2049/season-0/episode-2/'},
    {...nestedEpisode,heading:'Example Series 2049 Temporada 0 Episodio 2',pageTitle:'',pathname:'/shows/example-series-2049/temporada-0/episodio-2/'},
    {...nestedEpisode,heading:'Example Series 2049 Stagione 0 Episodio 2',pageTitle:'',pathname:'/tv/example-series-2049/stagione-0/episodio-2/'}
  ]) {
    const media=f.detectMedia(data);
    assert.equal(media.title,'Example Series 2049'); assert.equal(media.type,'episode');
    assert.equal(media.season,'0'); assert.equal(media.episode,'2');
  }
});

test('Nested episode inference requires a complete single heading, matching route and nonconflicting evidence', () => {
  for(const overrides of [
    {heading:''},{heading:'Breaking Bad'},{headingCount:2},
    {heading:'Breaking Bad 1. Sezon 1. Bölüm incelemesi'},
    {pageTitle:'Breaking Bad 1. Sezon 2. Bölüm izle | Example Catalog'},
    {pathname:'/dizi/other-show/sezon-1/bolum-1-hd15/'},
    {pathname:'/dizi/breaking-bad-izle-6/sezon-2/bolum-1-hd15/'},
    {pathname:'/dizi/breaking-bad-izle-6/sezon-1/bolum-0-hd15/'},
    {pathname:'/dizi/breaking-bad-izle-6/sezon-1000/bolum-1-hd15/'},
    {pathname:'/dizi/breaking-bad-izle-6/sezon-1/bolum-1-review/'},
    {pathname:'/articles/breaking-bad-izle-6/sezon-1/bolum-1-hd15/'},
    {pathname:'/dizi/%zz/sezon-1/bolum-1/'},
    {pathname:'/dizi/breaking%2fbad/sezon-1/bolum-1/'},
    {pathname:'/dizi/breaking-bad-izle-6/sezon-1/bolum-1-hd15/?episode=2'},
    {ogType:'article'}
  ]) assert.equal(f.detectMedia({...nestedEpisode,...overrides}).title,'',JSON.stringify(overrides));
  assert.equal(f.detectMedia({...nestedEpisode,ogType:'website'}).type,'episode');
  assert.equal(f.detectMedia({...nestedEpisode,ogType:'video.movie'}).type,'movie');
  assert.equal(f.detectMedia({...nestedEpisode,media:[{type:'movie',name:'Actual Movie'}]}).title,'Actual Movie');
  assert.equal(f.detectMedia({...nestedEpisode,media:[{type:'episode',name:'A'},{type:'episode',name:'B'}]}).title,'');
});

test('Nested paths fill missing episode numbers only for a supplied matching series title', () => {
  const base={...nestedEpisode,heading:'Pilot',pageTitle:'Pilot',media:[{type:'episode',name:'Pilot',series:{name:'Breaking Bad'}}]};
  const media=f.detectMedia(base); assert.equal(media.season,'1'); assert.equal(media.episode,'1');
  assert.equal(f.detectMedia({...base,media:[]}).title,'');
  assert.equal(f.detectMedia({...base,media:[{type:'episode',name:'Pilot',series:{name:'Other Show'}}]}).season,'');
});

test('Turkish dotted-I watch suffixes are cleaned only as complete trailing words', () => {
  for(const suffix of ['izle','İzle','İZLE','IZLE']) assert.equal(f.cleanTitle('Breaking Bad 1. Sezon 1. Bölüm '+suffix),'Breaking Bad 1. Sezon 1. Bölüm');
  assert.equal(f.cleanTitle('İzleyen'),'İzleyen'); assert.equal(f.cleanTitle('İzle'),'İzle');
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

test('MUBI numeric player identity works without a heading, Open Graph or visible controls', () => {
  for (const url of ['https://mubi.com/tr/films/294276/player','https://mubi.com/en/us/films/294276/player/']) {
    const film = f.detectMedia(collectWith([], {url,nextData:JSON.stringify(mubi)}));
    assert.equal(film.title,'Müstakbel Suçlar');
    assert.deepEqual(film.titles,['Müstakbel Suçlar','Crimes of the Future']);
    assert.equal(film.year,'2022');
    assert.equal(film.type,'movie');
  }
  const legacy = {props:{initialProps:{pageProps:mubi.props.pageProps}}};
  assert.equal(f.detectMedia(collectWith([],{url:'https://mubi.com/tr/films/294276/player',nextData:JSON.stringify(legacy)})).title,'Müstakbel Suçlar');
});
test('MUBI rejects stale player records and conflicting legacy records without using stale page labels', () => {
  const stale = {url:'https://mubi.com/tr/films/999999/player',nextData:JSON.stringify(mubi),ogType:'video.movie',heading:'Old Movie',
    elements:{video:[{}]},navigator:{mediaSession:{metadata:{title:'Old Movie'}}}};
  assert.equal(f.detectMedia(collectWith([JSON.stringify({'@type':'Movie',name:'Old Movie'})],stale)).title,'');
  const conflict=structuredClone(mubi);
  conflict.props.initialProps={pageProps:{initFilm:{id:294276,title:'Another Movie'}}};
  assert.equal(f.detectMedia(collectWith([],{...stale,url:'https://mubi.com/tr/films/294276/player',nextData:JSON.stringify(conflict)})).title,'');
});
test('MUBI player can use browser media title or explicit film/year label when its record is absent', () => {
  const base={url:'https://mubi.com/tr/films/294276/player',elements:{video:[{}]}};
  assert.equal(f.detectMedia(collectWith([],{...base,navigator:{mediaSession:{metadata:{title:'Crimes of the Future'}}}})).title,'Crimes of the Future');
  for (const pageTitle of ["Müstakbel Suçlar (2022) adlı filmi MUBI'de izle",'Crimes of the Future (2022) | MUBI','Watch Crimes of the Future (2022) on MUBI']) {
    assert.ok(f.detectMedia(collectWith([],{...base,pageTitle})).title);
  }
  for (const pageTitle of ['MUBI','Player | MUBI','Log in | MUBI','294276']) assert.equal(f.detectMedia(collectWith([],{...base,pageTitle})).title,'');
});
test('Player extraction never treats a URL ID, detail heading or stale unbound JSON-LD as the current title', () => {
  for (const url of ['https://www.netflix.com/watch/12345','https://www.disneyplus.com/play/id','https://play.hbomax.com/video/watch/id','https://www.hulu.com/watch/id','https://www.peacocktv.com/watch/playback/vod/id']) {
    const data=collectWith([JSON.stringify({'@type':'Movie',name:'Old Movie'})],{url,heading:'Old Movie',ogType:'video.movie'});
    assert.equal(data.playerPage,true);
    assert.equal(f.detectMedia(data).title,'');
  }
});
test('Netflix player header reads one title and does not default an unknown content type to movie', () => {
  const opts={url:'https://www.netflix.com/watch/12345',elements:{video:[{}],'[data-uia="video-title"] h4':[{textContent:'Example Show'}]}};
  const media=f.detectMedia(collectWith([],opts));
  assert.equal(media.title,'Example Show'); assert.equal(media.type,''); assert.equal(media.imdbId,'');
  assert.equal(f.detectMedia(collectWith([],{...opts,elements:{...opts.elements,'[data-uia="video-title"] h4':[{textContent:'A'},{textContent:'B'}]},navigator:{mediaSession:{metadata:{title:'A'}}}})).title,'');
  assert.equal(f.detectMedia(collectWith([],{...opts,url:'https://www.netflix.com/browse'})).title,'');
  assert.equal(f.detectMedia(collectWith([],{...opts,url:'https://www.netflix.com.evil.test/watch/12345'})).title,'');
  const schema={'@type':'Movie',name:'A',url:opts.url};
  assert.equal(f.detectMedia(collectWith([JSON.stringify(schema)],{...opts,elements:{...opts.elements,'[data-uia="video-title"] h4':[{textContent:'A'},{textContent:'B'}]}})).title,'');
});
test('Prime, Apple TV, Hulu and Peacock use scoped player fields rather than ordinary headings', () => {
  const fixtures=[
    {url:'https://www.primevideo.com/detail/ID',selector:'.atvwebplayersdk-player-container .atvwebplayersdk-title-text',gate:'.atvwebplayersdk-player-container video'},
    {url:'https://www.amazon.com/gp/video/detail/ID',selector:'.atvwebplayersdk-player-container .atvwebplayersdk-title-text',gate:'.atvwebplayersdk-player-container video'},
    {url:'https://tv.apple.com/us/movie/example/id',selector:'.video-metadata .title',gate:'.video-player__tabs'},
    {url:'https://www.hulu.com/watch/id',selector:'#web-player-app .PlayerMetadata__titleText'},
    {url:'https://www.peacocktv.com/watch/playback/vod/id',selector:'[data-testid="metadata-title"], .playback-header__title, .playback-metadata__container-title'}
  ];
  for (const {url,selector,gate} of fixtures) {
    const elements={video:[{}],[selector]:[{textContent:'Example Current Title'}]};
    if (gate) elements[gate]=[{}];
    assert.equal(f.detectMedia(collectWith([],{url,elements,heading:'Old detail title'})).title,'Example Current Title');
    assert.equal(f.detectMedia(collectWith([],{url:new URL(url).origin+'/',elements})).title,'');
    assert.equal(f.detectMedia(collectWith([],{url,elements:{}})).title,'');
  }
});
test('Media session supports gated Max and Disney playback without treating marketing or login as content', () => {
  for (const url of ['https://play.max.com/video/watch/id','https://www.disneyplus.com/play/id','https://www.apps.disneyplus.com/ph/play/id']) {
    const options={url,elements:{video:[{}]},navigator:{mediaSession:{metadata:{title:'Example Current Title'}}}};
    assert.equal(f.detectMedia(collectWith([],options)).title,'Example Current Title');
    assert.equal(f.detectMedia(collectWith([],{...options,url:new URL(url).origin+'/login'})).title,'');
    assert.equal(f.detectMedia(collectWith([],{...options,elements:{}})).title,'');
  }
  for (const title of ['Netflix','Disney+','MUBI','x'.repeat(181)]) assert.equal(f.detectMedia(collectWith([],{url:'https://www.netflix.com/watch/12345',elements:{video:[{}]},navigator:{mediaSession:{metadata:{title}}}})).title,'');
});
test('Current-page Paramount episode JSON-LD survives the playback identity boundary', () => {
  const url='https://www.paramountplus.com/shows/example/video/id';
  const node={'@type':'TVEpisode',url,name:'Pilot',episodeNumber:2,partOfSeason:{seasonNumber:1},partOfSeries:{name:'Example Show'}};
  const elements={video:[{}],'.video__player-area video':[{}]};
  assert.equal(f.detectMedia(collectWith([JSON.stringify(node)],{url,elements})).title,'Example Show');
  node.url='https://www.paramountplus.com/shows/other/video/id';
  assert.equal(f.detectMedia(collectWith([JSON.stringify(node)],{url,elements})).title,'');
});
test('Player episode labels are explicit, bounded, and leave missing or malformed numbers empty', () => {
  for (const subtitle of ['S01:E02 · Pilot','S1, E2, Pilot','Season 1, Episode 2 — Pilot','Temporada 1 Episódio 2 Pilot','Stagione 1 Episodio 2 Pilot','1. Sezon 2. Bölüm Pilot']) {
    const media=f.detectMedia({playerPage:true,player:{name:'Example Show',subtitle}});
    assert.equal(media.type,'episode'); assert.equal(media.season,'1'); assert.equal(media.episode,'2'); assert.equal(media.episodeTitle,'Pilot');
  }
  for (const subtitle of ['Pilot','S1:E0','S1000:E2','S1:E10000','S1:E2x','Episode 2','1']) {
    const media=f.detectMedia({playerPage:true,player:{name:'Example Show',subtitle}});
    assert.equal(media.type,''); assert.equal(media.season,''); assert.equal(media.episode,'');
  }
});
test('Conflicting player title cannot inherit the old movie IMDb identity', () => {
  const media=f.detectMedia({playerPage:true,player:{name:'New Movie'},media:[{type:'movie',name:'Old Movie',sameAs:['https://imdb.com/title/tt4954522/']}]});
  assert.equal(media.title,'New Movie'); assert.equal(media.type,''); assert.equal(media.imdbId,'');
});
test('Explicit player episode labels cannot inherit an old episode number or movie ID with the same title', () => {
  for (const item of [{type:'movie',name:'Example Show',sameAs:['https://imdb.com/title/tt4954522/']},
    {type:'episode',name:'Old Episode',series:{name:'Example Show'},season:'1',episode:'1'}]) {
    const media=f.detectMedia({playerPage:true,player:{name:'Example Show',subtitle:'S1:E2 Pilot'},media:[item]});
    assert.equal(media.type,'episode'); assert.equal(media.episode,'2'); assert.equal(media.imdbId,'');
  }
});
test('Disney MAIN-world reader returns only bounded current metadata and never account or artwork fields', () => {
  const read=(options={})=>vm.runInNewContext(`(${f.collectDisneyPlayerData.toString()})()`,{
    location:{hostname:options.host||'www.disneyplus.com',pathname:options.pathname||'/play/current'},
    document:{querySelector:()=>({}),querySelectorAll:()=>options.players||[{mediaPlayer:{mediaPlaybackCriteria:{metadata:{title:{text:'Example Show'},subtitle:{text:'S1:E2 Pilot'},token:'PRIVATE',images:{secret:'PRIVATE'}}}}}]}
  });
  assert.equal(read().name,'Example Show'); assert.ok(!JSON.stringify(read()).includes('PRIVATE'));
  assert.equal(read({host:'disneyplus.com.evil.test'}),null);
  assert.equal(read({pathname:'/home'}),null);
  assert.equal(read({players:[]}),null);
  assert.equal(read({players:[{},{}]}),null);
  assert.equal(read({players:[{mediaPlayer:{mediaPlaybackCriteria:{metadata:{title:{text:'x'.repeat(181)}}}}}]}),null);
});
test('Observed Disney detail SEO labels are replaced only by the agreeing heading on an entity page', () => {
  const base={url:'https://www.disneyplus.com/tr-tr/browse/entity-example',heading:'WALL-E',elements:{h1:[{}]}};
  for (const name of ['WALL-E İzleyin | Disney+','Watch WALL-E | Disney+','Ver WALL-E | Disney+','Guarda WALL-E | Disney+','Assista a WALL-E | Disney+']) {
    assert.equal(f.detectMedia(collectWith([JSON.stringify({'@type':'Movie',name})],base)).title,'WALL-E');
  }
  assert.equal(f.detectMedia(collectWith([JSON.stringify({'@type':'Movie',name:'Another Movie'})],base)).title,'Another Movie');
  assert.equal(f.detectMedia(collectWith([JSON.stringify({'@type':'Movie',name:'WALL-E İzleyin | Disney+'})],{...base,url:'https://www.disneyplus.com/home'})).title,'WALL-E İzleyin');
});
test('Prime detail title artwork and explicit episodes tab identify a series without examining episode cards', () => {
  const base={url:'https://www.primevideo.com/-/tr/detail/ID123',heading:' ',headingImages:['Fallout'],elements:{h1:[{}],'#tab-selector-episodes[role="tab"]':[{}]}};
  const series=f.detectMedia(collectWith([],base));
  assert.equal(series.title,'Fallout'); assert.equal(series.type,'series'); assert.equal(series.season,'');
  const unknown=f.detectMedia(collectWith([],{...base,elements:{h1:[{}]}}));
  assert.equal(unknown.title,'Fallout'); assert.equal(unknown.type,'');
  assert.equal(f.detectMedia(collectWith([],{...base,headingImages:['A','B']})).title,'');
  assert.equal(f.detectMedia(collectWith([],{...base,url:'https://www.primevideo.com/storefront'})).title,'');
});
test('Apple detail routes identify movie or show only with one heading and a canonical content identifier', () => {
  const base={heading:'Greyhound',elements:{h1:[{}]}};
  assert.equal(f.detectMedia(collectWith([],{...base,url:'https://tv.apple.com/us/movie/greyhound/umc.cmc.example'})).type,'movie');
  assert.equal(f.detectMedia(collectWith([],{...base,url:'https://tv.apple.com/us/show/example/umc.cmc.example'})).type,'series');
  for (const url of ['https://tv.apple.com/us/channel/example/id','https://tv.apple.com/us/movie/example/fake','https://tv.apple.com.evil.test/us/movie/example/umc.cmc.example']) assert.equal(f.detectMedia(collectWith([],{...base,url})).title,'');
  assert.equal(f.detectMedia(collectWith([],{...base,elements:{h1:[{},{}]},url:'https://tv.apple.com/us/movie/greyhound/umc.cmc.example'})).title,'');
});
