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
    title:'Mezar izle',
    querySelector:selector=>selector==='h1' ? heading : selector==='meta[property="og:type"]' ? {content:options.ogType||''} : null,
    querySelectorAll:selector=>selector.startsWith('script') ? scripts.map(textContent=>({textContent})) : []
  };
  return vm.runInNewContext(`(${f.collectPageData.toString()})()`, {document, location:{hostname:options.host||'example.test',href:'https://example.test/film'}});
}
test('Serialized collector handles graph, mainEntity, schema type arrays and malformed JSON', () => {
  const data = collectWith(['{broken', JSON.stringify({'@graph':[{'@type':'WebPage',mainEntity:{'@type':['Thing','Movie'],name:'Raw',sameAs:'https://imdb.com/title/tt4954522'}}]})]);
  assert.equal(f.detectFilm(data).title,'Raw');
  assert.equal(f.detectFilm(data).imdbId,'tt4954522');
});
test('Collector ignores recommendations and large payloads', () => {
  const data = collectWith([JSON.stringify({'@type':'ItemList',itemListElement:[{'@type':'Movie',name:'Raw'}]}), ' '.repeat(100001)]);
  assert.equal(data.movies.length,0);
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
  assert.deepEqual(manifest.permissions,['activeTab','scripting']);
  assert.equal(manifest.host_permissions,undefined);
  assert.equal(manifest.content_scripts,undefined);
  assert.match(manifest.content_security_policy.extension_pages,/connect-src 'none'/);
  for (const file of ['popup.html','popup.css','film.js','popup.js']) assert.ok(fs.existsSync(path.join(__dirname,'..',file)));
});
