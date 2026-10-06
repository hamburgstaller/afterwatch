const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const f = require('../film.js');
const videoId = 'AbCdEfG1234';
for (const fixture of require('./fixtures/youtube.json')) {
  test(`YouTube shared fixture: ${fixture.name}`,()=>assert.deepEqual(f.youTubeSuggestions(fixture.title),fixture.suggestion ? [fixture.suggestion] : []));
}
function collect(options={}) {
  const url = new URL(options.url || `https://www.youtube.com/watch?v=${videoId}`);
  const elements = {
    [`ytd-watch-flexy[video-id="${videoId}"]:not([hidden]) #title h1`]:(options.headings||[]).map(textContent=>({textContent})),
    'meta[itemprop="videoId"]':options.metaId ? [{content:options.metaId}] : [],
    'meta[property="og:title"]':options.ogTitle ? [{content:options.ogTitle}] : []
  };
  const document={title:'Old video - YouTube',querySelector:selector=>elements[selector]?.[0]||null,
    querySelectorAll:selector=>elements[selector]||[]};
  return vm.runInNewContext(`(${f.collectPageData.toString()})()`,{document,URL,location:{href:url.href,hostname:url.hostname,pathname:url.pathname}});
}
test('YouTube takes only the heading attached to the current video ID, preserving the raw title',()=>{
  const data=collect({headings:['Raw (2016) — Full Movie']});
  const media=f.detectMedia(data);
  assert.equal(media.title,'Raw (2016) — Full Movie'); assert.equal(media.type,'');
  assert.equal(media.imdbId,''); assert.equal(media.year,'');
  assert.deepEqual(media.suggestions,[{title:'Raw',type:'movie',year:'2016',season:'',episode:''}]);
});
test('Video-bound Open Graph is a fallback; stale or conflicting titles are not combined',()=>{
  assert.equal(f.detectMedia(collect({metaId:videoId,ogTitle:'Current Video'})).title,'Current Video');
  assert.equal(f.detectMedia(collect({metaId:'Zr_ONXsASgI',ogTitle:'Old Video'})).title,'');
  assert.equal(f.detectMedia(collect({headings:['A','B']})).title,'');
  assert.equal(f.detectMedia(collect({headings:['A'],metaId:videoId,ogTitle:'B'})).title,'');
});
test('YouTube routes reject malformed/duplicate IDs and do not leak unrelated URL parameters',()=>{
  for(const url of ['https://www.youtube.com/','https://www.youtube.com/results?search_query=movie',
    `https://www.youtube.com/watch?v=${videoId}&v=${videoId}`, 'https://www.youtube.com/watch?v=short',
    `https://www.youtube.com.evil.test/watch?v=${videoId}`]) assert.equal(f.detectMedia(collect({url,headings:['Movie']})).title,'');
  const data=collect({url:`https://www.youtube.com/watch?v=${videoId}&private=SECRET#token`,headings:['Movie']});
  assert.ok(!JSON.stringify(data).includes('SECRET')); assert.ok(!JSON.stringify(data).includes('token'));
  assert.equal(data.youtube.id,videoId);
});
test('Embed, mobile, Shorts and live IDs are gated; generic VideoObject/upload dates never identify a movie',()=>{
  for(const url of [`https://m.youtube.com/watch?v=${videoId}`,`https://www.youtube.com/embed/${videoId}`,`https://www.youtube.com/shorts/${videoId}`,`https://www.youtube.com/live/${videoId}`]) {
    assert.equal(collect({url}).youtube.id,videoId);
  }
  const media=f.detectMedia({youtube:{id:videoId,name:'Example Video'},media:[{type:'movie',name:'Unrelated Movie',date:'2026-10-06',sameAs:['https://imdb.com/title/tt4954522/']} ]});
  assert.equal(media.title,'Example Video'); assert.equal(media.type,''); assert.equal(media.year,''); assert.equal(media.imdbId,'');
});
test('YouTube main-world response requires the same upload ID and returns no private player data',()=>{
  const read=(options={})=>{
    const url=new URL(options.url||`https://www.youtube.com/watch?v=${videoId}`);
    return vm.runInNewContext(`(${f.collectYouTubePlayerData.toString()})()`,{URL,location:{href:url.href,hostname:url.hostname},
      window:{ytInitialPlayerResponse:{videoDetails:{videoId:options.id||videoId,title:options.title||'Current Video',shortDescription:'SECRET'},streamingData:{token:'SECRET'},account:{secret:'SECRET'}}}});
  };
  assert.equal(read().name,'Current Video'); assert.ok(!JSON.stringify(read()).includes('SECRET'));
  assert.equal(read({id:'Zr_ONXsASgI'}).name,'');
  assert.equal(read({title:'x'.repeat(181)}).name,'');
  assert.equal(read({url:`https://youtube.com.evil.test/watch?v=${videoId}`}),null);
  assert.equal(read({url:'https://www.youtube.com/'}).id,'');
});
test('Film suggestions strip only recognized suffixes, preserving meaningful numbers and punctuation',()=>{
  for(const title of ['1917','Blade Runner 2049','12 Angry Men','Full Metal Jacket','2001: A Space Odyssey']) {
    assert.equal(f.youTubeSuggestions(`${title} — Full Movie 1080p`)[0].title,title);
  }
  for(const title of ['Raw (2016) | Full Movie','Raw (2016) — Película completa','Raw (2016) — Filme completo','Raw (2016) — Film completo']) {
    assert.equal(f.youTubeSuggestions(title)[0].title,'Raw');
  }
  for(const title of ['Top 10 movies','Raw | Movie Review','Example Show S01E02 | Fan Edit','Full Movie','x'.repeat(181)]) assert.deepEqual(f.youTubeSuggestions(title),[]);
});
test('Episode suggestions require explicit numbers and leave an absent season empty',()=>{
  for(const title of ['Example Show 2. Sezon 3. Bölüm','Example Show Season 2 Episode 3','Example Show Temporada 2 Episodio 3','Example Show Stagione 2 Episodio 3','Example Show S02E03']) {
    const suggestion=f.youTubeSuggestions(title)[0];
    assert.equal(suggestion.title,'Example Show'); assert.equal(suggestion.season,'2'); assert.equal(suggestion.episode,'3');
  }
  const suggestion=f.youTubeSuggestions('Gönül Dağı 1. bölüm')[0];
  assert.equal(suggestion.title,'Gönül Dağı'); assert.equal(suggestion.season,''); assert.equal(suggestion.episode,'1');
  for(const title of ['Show S1000E03','Show S01E00','Show 0. Bölüm','Show 10000. Bölüm','Show S01E02 Review']) assert.deepEqual(f.youTubeSuggestions(title),[]);
});
