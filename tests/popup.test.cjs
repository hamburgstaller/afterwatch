const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const FilmTools = require('../film.js');
const AfterWatchI18n = require('../i18n.js');
const raw = require('./fixtures/raw.json');
const source = fs.readFileSync(require.resolve('../popup.js'),'utf8');
async function setup(options = {}) {
  const nodes = {};
  for (const id of ['filmTitle','status','filmDetail','alternatives','eksiBtn','redditBtn','letterboxdBtn','letterboxdRoute','imdbBtn','imdbRoute','imdbEnabled','eksiRoute','redditRoute','mediaType','discussionScope','seasonNumber','episodeNumber','language','languageStatus','episodeControls','spoilerNote','titleLabel','settingsBtn','settingsPanel','settingsStatus','watchPanel','closeSettings','eksiEnabled','redditEnabled','letterboxdEnabled','platformOptions','destinations','noPlatforms',...['eksi','reddit','letterboxd','imdb'].flatMap(id=>[`${id}Option`,`${id}Position`,`${id}Up`,`${id}Down`])]) nodes[id] = {id,value:'',textContent:'',disabled:true,hidden:false,checked:false,children:[],listeners:{},classList:{toggle(){}},attributes:{},setAttribute(name,value){this.attributes[name]=value;},focus(){this.focused=true;},addEventListener(type,fn){this.listeners[type]=fn;},append(node){this.children=this.children.filter(child=>child!==node);this.children.push(node);}};
  nodes.settingsPanel.hidden = true;
  nodes.mediaType.value = 'movie'; nodes.discussionScope.value = 'series'; nodes.language.value = 'en';
  const urls=[];
  let injections=0;
  const document={documentElement:{lang:'en'},listeners:{},addEventListener(type,fn){this.listeners[type]=fn;},querySelectorAll:()=>[],getElementById:id=>nodes[id],createElement:()=>({listeners:{},focus(){this.focused=true;},addEventListener(type,fn){this.listeners[type]=fn;}})};
  const scriptCalls=[];
  const chrome={tabs:{query:async()=>options.noTab?[]:[{id:0,url:options.url||'https://example.test/film'}],create:async({url})=>{if(options.openFails) throw Error('Failed'); urls.push(url); if(options.openWait) await options.openWait;}},scripting:{executeScript:async request=>{injections++; scriptCalls.push(request); if(options.injectFails || request.world==='MAIN' && options.mainFails) throw Error('Denied'); if(request.world==='MAIN' && options.mainWait) await options.mainWait; if(options.injectWait) await options.injectWait; return options.noResults?[]:[{result:request.world==='MAIN' ? options.mainData : options.data||raw}];}}};
  chrome.i18n={getUILanguage:()=>options.browserLanguage||'en-US'};
  const stored = options.firstRun ? {} : {language:options.language ?? 'en',platformSettings:Object.hasOwn(options,'platformSettings') ? options.platformSettings : {version:2,enabled:[...(Array.isArray(options.enabledPlatforms) ? options.enabledPlatforms : ['eksi']),'letterboxd'],order:['eksi','reddit','letterboxd','imdb']}};
  if (options.legacy || options.platformKeyMissing) {delete stored.platformSettings; stored.enabledPlatforms=options.enabledPlatforms ?? ['eksi'];}
  if (options.platformKeyMissing) delete stored.enabledPlatforms;
  const writes = [];
  chrome.storage={local:{get:async()=>{const snapshot=JSON.parse(JSON.stringify(stored)); if(options.loadWait) await options.loadWait; if(options.loadFails) throw Error('Denied'); return snapshot;},set:async data=>{const serialized=JSON.parse(JSON.stringify(data)); writes.push(serialized); if(options.saveWait) await options.saveWait; if(options.saveFails) throw Error('Denied'); Object.assign(stored,serialized);}}};
  vm.runInNewContext(source,{document,chrome,FilmTools,AfterWatchI18n});
  await new Promise(resolve=>setImmediate(resolve));
  return {nodes,urls,injections,stored,writes,document,scriptCalls,async click(id){nodes[id].listeners.click();await new Promise(resolve=>setImmediate(resolve));},input(value){nodes.filmTitle.value=value;nodes.filmTitle.listeners.input();},async toggle(id,checked){nodes[id].checked=checked;nodes[id].listeners.change();await new Promise(resolve=>setImmediate(resolve));},async change(id,value,event='change'){nodes[id].value=value;nodes[id].listeners[event]();await new Promise(resolve=>setImmediate(resolve));}};
}
test('Popup accepts tab id zero and opens exactly the intended destinations',async()=>{
  const p=await setup();
  assert.equal(p.nodes.filmTitle.value,'Raw');
  assert.equal(p.nodes.eksiBtn.disabled,false);
  await p.click('eksiBtn'); await p.click('letterboxdBtn');
  assert.deepEqual(p.urls,['https://eksisozluk.com/?q=Raw','https://letterboxd.com/imdb/tt4954522/']);
});
for (const language of ['en','es','pt','it','tr']) {
  test(`Player title without a type requires an explicit choice in ${language}`,async()=>{
    const p=await setup({language,data:{playerPage:true,player:{name:'Example Current Title'}}});
    assert.equal(p.nodes.filmTitle.value,'Example Current Title');
    assert.equal(p.nodes.mediaType.value,'');
    assert.equal(p.nodes.status.textContent,AfterWatchI18n.translate(language,'detectTypeMissing'));
    assert.equal(p.nodes.eksiBtn.disabled,true); assert.equal(p.nodes.letterboxdBtn.disabled,true);
    await p.click('eksiBtn'); await p.click('letterboxdBtn'); assert.equal(p.urls.length,0);
    await p.change('mediaType','movie'); await p.click('letterboxdBtn');
    assert.equal(p.urls[0],'https://letterboxd.com/search/films/Example%20Current%20Title/');
  });
}
test('Disney reader uses MAIN only for flagged player pages and fills explicit episode labels',async()=>{
  const p=await setup({data:{playerPage:true,disneyPlayer:true,pathname:'/play/id'},mainData:{name:'Example Show',subtitle:'S1:E2 Pilot',pathname:'/play/id'}});
  assert.equal(p.nodes.filmTitle.value,'Example Show'); assert.equal(p.nodes.mediaType.value,'episode');
  assert.equal(p.nodes.seasonNumber.value,'1'); assert.equal(p.nodes.episodeNumber.value,'2');
  assert.equal(p.scriptCalls.length,2); assert.equal(p.scriptCalls[1].world,'MAIN');
  assert.equal(p.scriptCalls[1].func,FilmTools.collectDisneyPlayerData);
  const other=await setup(); assert.equal(other.scriptCalls.length,1); assert.equal(other.scriptCalls[0].world,undefined);
});
test('Disney read failures preserve fallback; a known navigation race clears stale title and metadata',async()=>{
  const data={playerPage:true,disneyPlayer:true,pathname:'/play/id',player:{name:'Browser Title'}};
  for (const options of [{mainFails:true},{mainData:{name:'Wrong Episode',pathname:'/play/another'}}]) {
    const p=await setup({data:structuredClone(data),...options});
    assert.equal(p.nodes.filmTitle.value,options.mainFails ? 'Browser Title' : '');
    assert.equal(p.nodes.mediaType.value,options.mainFails ? '' : 'movie');
    if (!options.mainFails) p.input('Browser Title');
    await p.change('mediaType','movie'); await p.click('eksiBtn');
    assert.equal(new URL(p.urls[0]).searchParams.get('q'),'Browser Title');
  }
});
test('Manual edits during a delayed Disney metadata read remain intact',async()=>{
  let finish;
  const mainWait=new Promise(resolve=>{finish=resolve;});
  const p=await setup({data:{playerPage:true,disneyPlayer:true,pathname:'/play/id'},mainData:{name:'Example Show',pathname:'/play/id'},mainWait});
  p.input('My Title'); await p.change('mediaType','series'); finish();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(p.nodes.filmTitle.value,'My Title'); assert.equal(p.nodes.mediaType.value,'series');
});
for(const language of ['en','es','pt','it','tr']) {
  test(`YouTube raw title, selectable suggestions and restoration work in ${language}`,async()=>{
    const p=await setup({language,data:{youtube:{id:'AbCdEfG1234',name:'Raw (2016) — Full Movie'}},mainData:{id:'AbCdEfG1234',name:'Raw (2016) — Full Movie'}});
    assert.equal(p.nodes.mediaType.value,''); assert.equal(p.nodes.filmTitle.value,'Raw (2016) — Full Movie');
    assert.equal(p.scriptCalls[1].func,FilmTools.collectYouTubePlayerData);
    const suggestion=p.nodes.alternatives.children[2];
    assert.match(suggestion.textContent,/Raw/); suggestion.listeners.click();
    assert.equal(p.nodes.mediaType.value,'movie'); assert.equal(p.nodes.filmTitle.value,'Raw');
    await p.click('letterboxdBtn'); assert.equal(p.urls[0],'https://letterboxd.com/search/films/Raw/');
    await p.change('language',language==='en'?'tr':'en');
    assert.match(p.nodes.alternatives.children[0].textContent,language==='en'?/Başlık önerileri/:/Title suggestions/);
    p.nodes.alternatives.children[1].listeners.click();
    assert.equal(p.nodes.filmTitle.value,'Raw (2016) — Full Movie'); assert.equal(p.nodes.mediaType.value,'');
    assert.equal(p.nodes.letterboxdBtn.disabled,true);
  });
}
test('YouTube partial episode suggestion never creates a missing season and supports manual correction',async()=>{
  const p=await setup({data:{youtube:{id:'AbCdEfG1234',name:'Example Show 3. Bölüm'}},mainFails:true});
  p.nodes.alternatives.children[2].listeners.click();
  assert.equal(p.nodes.mediaType.value,'episode'); assert.equal(p.nodes.seasonNumber.value,''); assert.equal(p.nodes.episodeNumber.value,'3');
  await p.change('discussionScope','episode'); assert.equal(p.nodes.eksiBtn.disabled,true);
  await p.change('seasonNumber','2','input'); await p.click('eksiBtn');
  assert.equal(new URL(p.urls[0]).searchParams.get('q'),'Example Show 2. sezon 3. bölüm');
});
test('YouTube conflicting titles or a different current upload clear the stale title',async()=>{
  for(const mainData of [{id:'Zr_ONXsASgI',name:'Other Video'},{id:'AbCdEfG1234',name:'Other Title'},{id:'',name:''}]) {
    const p=await setup({data:{youtube:{id:'AbCdEfG1234',name:'Current Title'}},mainData});
    assert.equal(p.nodes.filmTitle.value,''); assert.equal(p.nodes.alternatives.children.length,0);
  }
});
test('A late YouTube read cannot replace a manually entered title or content type',async()=>{
  let finish; const mainWait=new Promise(resolve=>{finish=resolve;});
  const p=await setup({data:{youtube:{id:'AbCdEfG1234',name:''}},mainData:{id:'AbCdEfG1234',name:'Automatic'},mainWait});
  p.input('Manual'); await p.change('mediaType','series'); finish(); await new Promise(resolve=>setImmediate(resolve));
  assert.equal(p.nodes.filmTitle.value,'Manual'); assert.equal(p.nodes.mediaType.value,'series');
});
test('Editing the title stops using the previous film identity; empty input disables buttons',async()=>{
  const p=await setup(); p.input('1917'); await p.click('letterboxdBtn');
  assert.equal(p.urls[0],'https://letterboxd.com/search/films/1917/');
  assert.equal(p.nodes.filmDetail.textContent,'');
  p.input(' '); assert.equal(p.nodes.eksiBtn.disabled,true);
});
test('Protected pages, unavailable tabs, injection failures and empty results remain manually usable',async()=>{
  for (const option of [{url:'chrome://extensions/'},{noTab:true},{injectFails:true},{noResults:true},{data:{movies:[],heading:'News'}}]) {
    const p=await setup(option); assert.equal(p.nodes.eksiBtn.disabled,true);
    p.input('Raw'); await p.click('eksiBtn'); assert.equal(p.urls.length,1);
    if(option.url) assert.equal(p.injections,0);
  }
});
test('Opening failures produce actionable feedback and allow retry',async()=>{
  const p=await setup({openFails:true}); await p.click('eksiBtn');
  assert.match(p.nodes.status.textContent,/try again/); assert.equal(p.nodes.eksiBtn.disabled,false);
});
test('Alternatives use plain text; choosing one changes the query',async()=>{
  const p=await setup(); assert.equal(p.nodes.alternatives.children[0].textContent,'Mezar');
  p.nodes.alternatives.children[0].listeners.click(); await p.click('eksiBtn');
  assert.equal(p.urls[0],'https://eksisozluk.com/?q=Mezar');
});
test('Slow detection cannot overwrite the title the user has started typing',async()=>{
  let finish;
  const injectWait=new Promise(resolve=>{finish=resolve;});
  const p=await setup({injectWait}); p.input('1917'); finish();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(p.nodes.filmTitle.value,'1917');
  await p.click('letterboxdBtn'); assert.equal(p.urls[0],'https://letterboxd.com/search/films/1917/');
});
test('Repeated clicks during a pending tab creation open only one tab',async()=>{
  let finish;
  const openWait=new Promise(resolve=>{finish=resolve;});
  const p=await setup({openWait}); await p.click('eksiBtn'); await p.click('eksiBtn');
  assert.equal(p.urls.length,1); assert.equal(p.nodes.eksiBtn.disabled,true);
  finish(); await new Promise(resolve=>setImmediate(resolve));
  assert.equal(p.nodes.eksiBtn.disabled,false);
});

const episodeData = {media:[{type:'episode',name:'A New Start',season:'1',episode:'2',date:'2021-02-01',series:{name:'Example Series 2049',alternateNames:['Example Series']},sameAs:['https://imdb.com/title/tt7654321/']}]};

test('Popup fills an episode from the matching nested route when the page has no usable structured metadata',async()=>{
  const p=await setup({data:require('./fixtures/nested-episode.json'),platformSettings:{version:2,enabled:['eksi','reddit','letterboxd','imdb'],order:['eksi','reddit','letterboxd','imdb']}});
  assert.equal(p.nodes.mediaType.value,'episode'); assert.equal(p.nodes.filmTitle.value,'Breaking Bad');
  assert.equal(p.nodes.seasonNumber.value,'1'); assert.equal(p.nodes.episodeNumber.value,'1');
  await p.change('discussionScope','episode');
  await p.click('eksiBtn'); assert.equal(new URL(p.urls[0]).searchParams.get('q'),'Breaking Bad 1. sezon 1. bölüm');
  await p.click('redditBtn'); assert.equal(new URL(p.urls[1]).searchParams.get('q'),'Breaking Bad S01E01 discussion');
  await p.click('imdbBtn'); assert.equal(new URL(p.urls[2]).searchParams.get('q'),'Breaking Bad S01E01');
  await p.click('letterboxdBtn'); assert.equal(p.urls[3],'https://letterboxd.com/search/films/Breaking%20Bad/');
});
test('Popup automatically fills heading-derived series, season and episode in the Turkish interface',async()=>{
  const p=await setup({language:'tr',data:{ogType:'video.episode',heading:'Breaking Bad 1. Sezon 1. Bölüm',
    pathname:'/bolum/breaking-bad-1-sezon-1-bolum-1-izle-16/'}});
  assert.equal(p.nodes.filmTitle.value,'Breaking Bad');
  assert.equal(p.nodes.mediaType.value,'episode');
  assert.equal(p.nodes.seasonNumber.value,'1');
  assert.equal(p.nodes.episodeNumber.value,'1');
  await p.change('discussionScope','episode');
  await p.click('eksiBtn');
  assert.equal(new URL(p.urls[0]).searchParams.get('q'),'Breaking Bad 1. sezon 1. bölüm');
});
test('Episode UI separates the series title from episode details and offers both discussion scopes',async()=>{
  const p=await setup({data:episodeData});
  assert.equal(p.nodes.mediaType.value,'episode');
  assert.equal(p.nodes.filmTitle.value,'Example Series 2049');
  assert.equal(p.nodes.episodeControls.hidden,false);
  assert.equal(p.nodes.seasonNumber.value,'1');
  assert.equal(p.nodes.episodeNumber.value,'2');
  assert.match(p.nodes.filmDetail.textContent,/A New Start/);
  await p.click('eksiBtn');
  assert.equal(new URL(p.urls[0]).searchParams.get('q'),'Example Series 2049');
  await p.change('discussionScope','episode'); await p.click('eksiBtn');
  assert.equal(new URL(p.urls[1]).searchParams.get('q'),'Example Series 2049 1. sezon 2. bölüm');
  await p.click('letterboxdBtn');
  assert.equal(p.urls[2],'https://letterboxd.com/search/films/Example%20Series%202049/');
  assert.match(p.nodes.letterboxdRoute.textContent,/Most TV shows/);
});
test('Missing episode numbers block only the episode discussion search, with manual correction available',async()=>{
  const p=await setup({data:{media:[{type:'episode',name:'Pilot',series:{name:'Example Show'}}]}});
  await p.change('discussionScope','episode');
  assert.equal(p.nodes.eksiBtn.disabled,true);
  assert.equal(p.nodes.letterboxdBtn.disabled,false);
  await p.click('eksiBtn'); assert.equal(p.urls.length,0);
  await p.change('seasonNumber','0','input'); await p.change('episodeNumber','1','input');
  assert.equal(p.nodes.eksiBtn.disabled,false);
  await p.click('eksiBtn');
  assert.equal(new URL(p.urls[0]).searchParams.get('q'),'Example Show 0. sezon 1. bölüm');
});
test('Missing series metadata is reported and never silently filled with the episode title',async()=>{
  const p=await setup({data:{media:[{type:'episode',name:'Pilot',season:1,episode:1}]}});
  assert.equal(p.nodes.filmTitle.value,'');
  assert.match(p.nodes.status.textContent,/series title is missing/);
  assert.equal(p.nodes.eksiBtn.disabled,true);
  p.input('Example Show'); await p.click('eksiBtn');
  assert.equal(new URL(p.urls[0]).searchParams.get('q'),'Example Show');
});
test('Changing movie type clears identity navigation and hides unrelated detected details',async()=>{
  const p=await setup(); await p.change('mediaType','series');
  assert.equal(p.nodes.filmDetail.textContent,'');
  await p.click('letterboxdBtn');
  assert.equal(p.urls[0],'https://letterboxd.com/search/films/Raw/');
  assert.equal(p.nodes.spoilerNote.hidden,false);
});
test('Correcting episode numbers clears the old episode details',async()=>{
  const p=await setup({data:episodeData});
  await p.change('episodeNumber','3','input');
  assert.equal(p.nodes.filmDetail.textContent,'');
});
test('Manual content-type selection during slow detection is preserved',async()=>{
  let finish;
  const injectWait=new Promise(resolve=>{finish=resolve;});
  const p=await setup({injectWait}); await p.change('mediaType','series'); p.input('Example Show'); finish();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(p.nodes.mediaType.value,'series');
  assert.equal(p.nodes.filmTitle.value,'Example Show');
});
for (const language of ['en','es','pt','it','tr']) {
  test(`Saved ${language} language translates dynamic messages without changing movie titles or URLs`,async()=>{
    const p=await setup({language});
    assert.equal(p.document.documentElement.lang,language);
    assert.equal(p.nodes.filmTitle.value,'Raw');
    assert.equal(p.nodes.status.textContent,AfterWatchI18n.translate(language,'check'));
    await p.click('eksiBtn'); assert.equal(p.urls[0],'https://eksisozluk.com/?q=Raw');
    await p.change('language','tr');
    assert.equal(p.stored.language,'tr');
    assert.deepEqual(p.writes,[{language:'tr'}]);
    assert.equal(p.nodes.filmTitle.value,'Raw');
  });
}
test('An unsupported saved language falls back to English',async()=>{
  const p=await setup({language:'__proto__'});
  assert.equal(p.document.documentElement.lang,'en');
});
test('Slow preference loading cannot overwrite a language selected by the user',async()=>{
  let finish;
  const loadWait=new Promise(resolve=>{finish=resolve;});
  const p=await setup({language:'es',loadWait});
  await p.change('language','tr'); finish();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(p.document.documentElement.lang,'tr');
});
test('Rapid language changes save the last selection even when an earlier write is pending',async()=>{
  let finish;
  const saveWait=new Promise(resolve=>{finish=resolve;});
  const p=await setup({saveWait});
  await p.change('language','es'); await p.change('language','it'); await p.change('language','tr');
  assert.deepEqual(p.writes,[{language:'es'}]);
  finish(); await new Promise(resolve=>setImmediate(resolve));
  assert.equal(p.stored.language,'tr');
  assert.deepEqual(p.writes,[{language:'es'},{language:'it'},{language:'tr'}]);
});
test('Storage failures keep navigation usable and explain an unsaved choice in the selected language',async()=>{
  const p=await setup({loadFails:true,saveFails:true});
  await p.change('language','es');
  assert.equal(p.nodes.languageStatus.hidden,false);
  assert.equal(p.nodes.languageStatus.textContent,AfterWatchI18n.translate('es','languageSaveFailed'));
  await p.click('redditBtn'); assert.equal(new URL(p.urls[0]).searchParams.get('q'),'Raw discussion');
});
test('Changing language while detection or navigation is pending preserves state and click locking',async()=>{
  let detectFinish, openFinish;
  const injectWait=new Promise(resolve=>{detectFinish=resolve;});
  const openWait=new Promise(resolve=>{openFinish=resolve;});
  const p=await setup({injectWait,openWait});
  await p.change('language','it'); detectFinish();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(p.nodes.status.textContent,AfterWatchI18n.translate('it','check'));
  await p.click('letterboxdBtn'); await p.change('language','pt'); await p.click('eksiBtn');
  assert.equal(p.urls.length,1);
  assert.equal(p.nodes.eksiBtn.disabled,true);
  openFinish(); await new Promise(resolve=>setImmediate(resolve));
  assert.equal(p.nodes.eksiBtn.disabled,false);
});

test('New installations use the browser language once to select an initial discussion platform',async()=>{
  for (const [browserLanguage,language,platform] of [['tr-TR','tr','eksi'],['en-US','en','reddit'],['es-ES','es','reddit'],['pt-BR','pt','reddit'],['it-IT','it','reddit'],['de-DE','en','reddit']]) {
    const p=await setup({firstRun:true,browserLanguage});
    assert.equal(p.document.documentElement.lang,language);
    assert.equal(p.nodes[`${platform}Btn`].hidden,false);
    assert.deepEqual(p.stored.platformSettings.enabled,[platform,'letterboxd','imdb']);
  }
});
test('Upgrade preserves the existing Ekşi destination even with an English interface',async()=>{
  const p=await setup({language:'en',platformKeyMissing:true,browserLanguage:'es-ES'});
  assert.equal(p.nodes.eksiBtn.hidden,false);
  assert.equal(p.nodes.redditBtn.hidden,true);
  assert.deepEqual(p.stored.platformSettings.enabled,['eksi','letterboxd']);
  assert.equal(p.document.documentElement.lang,'en');
});
test('Settings can enable both platforms or disable both while Letterboxd stays available',async()=>{
  const p=await setup();
  p.input('Custom Show');
  await p.click('settingsBtn');
  assert.equal(p.nodes.settingsPanel.hidden,false);
  assert.equal(p.nodes.watchPanel.hidden,true);
  assert.equal(p.nodes.settingsBtn.attributes['aria-expanded'],'true');
  await p.toggle('redditEnabled',true);
  assert.equal(p.nodes.redditBtn.hidden,false);
  assert.equal(p.nodes.eksiBtn.hidden,false);
  await p.toggle('eksiEnabled',false);
  await p.toggle('redditEnabled',false);
  assert.equal(p.nodes.eksiBtn.hidden,true);
  assert.equal(p.nodes.redditBtn.hidden,true);
  assert.equal(p.nodes.letterboxdBtn.hidden,false);
  assert.equal(p.nodes.letterboxdBtn.disabled,false);
  await p.click('eksiBtn'); await p.click('redditBtn');
  assert.equal(p.urls.length,0);
  await p.click('closeSettings');
  assert.equal(p.nodes.watchPanel.hidden,false);
  assert.equal(p.nodes.filmTitle.value,'Custom Show');
  assert.equal(p.nodes.settingsBtn.focused,true);
  await p.click('letterboxdBtn');
  assert.ok(p.urls[0].includes('/search/films/Custom%20Show/'));
  assert.deepEqual(p.stored.platformSettings.enabled,['letterboxd']);
});
test('Saved platform choices override browser language and remain independent of UI language',async()=>{
  const p=await setup({language:'tr',browserLanguage:'tr-TR',enabledPlatforms:['reddit']});
  assert.equal(p.nodes.redditBtn.hidden,false);
  assert.equal(p.nodes.eksiBtn.hidden,true);
  await p.change('language','en');
  assert.equal(p.nodes.redditBtn.hidden,false);
  assert.deepEqual(p.stored.platformSettings.enabled,['reddit','letterboxd']);
  assert.deepEqual(p.writes,[{language:'en'}]);
});
test('Slow saved preferences cannot overwrite explicit platform choices or open an unresolved destination',async()=>{
  let finish;
  const loadWait=new Promise(resolve=>{finish=resolve;});
  const p=await setup({loadWait});
  await p.click('redditBtn');
  assert.equal(p.urls.length,0);
  await p.toggle('redditEnabled',false);
  finish(); await new Promise(resolve=>setImmediate(resolve));
  assert.equal(p.nodes.redditBtn.hidden,true);
  assert.equal(p.nodes.eksiBtn.hidden,false);
  assert.deepEqual(p.stored.platformSettings.enabled,['eksi','letterboxd']);
});
test('Rapid platform and language changes preserve both final preferences across delayed writes',async()=>{
  let finish;
  const saveWait=new Promise(resolve=>{finish=resolve;});
  const p=await setup({saveWait});
  await p.toggle('redditEnabled',true);
  await p.change('language','it');
  await p.toggle('eksiEnabled',false);
  await p.toggle('redditEnabled',false);
  await p.toggle('eksiEnabled',true);
  finish(); await new Promise(resolve=>setImmediate(resolve));
  assert.equal(p.stored.language,'it');
  assert.deepEqual(p.stored.platformSettings.enabled,['eksi','letterboxd']);
});
test('Invalid saved platform data cannot add arbitrary destinations',async()=>{
  for (const enabledPlatforms of [['https://evil.test/'],{reddit:true},['reddit','eksi','letterboxd'],['__proto__']]) {
    const p=await setup({enabledPlatforms,legacy:true});
    assert.equal(p.nodes.eksiBtn.hidden,false);
    assert.equal(p.nodes.redditBtn.hidden,true);
    assert.deepEqual(p.stored.platformSettings.enabled,['eksi','letterboxd']);
  }
});
test('Explicitly disabled discussion platforms remain disabled after restoration',async()=>{
  const p=await setup({enabledPlatforms:[],browserLanguage:'tr-TR'});
  assert.equal(p.nodes.eksiBtn.hidden,true);
  assert.equal(p.nodes.redditBtn.hidden,true);
  assert.equal(p.nodes.letterboxdBtn.disabled,false);
  assert.deepEqual(p.writes,[]);
});
test('Platform storage failures are localized and do not prevent navigation with the current choice',async()=>{
  const p=await setup({saveFails:true,language:'it'});
  await p.toggle('redditEnabled',true);
  assert.equal(p.nodes.settingsStatus.hidden,false);
  assert.equal(p.nodes.settingsStatus.textContent,AfterWatchI18n.translate('it','platformSaveFailed'));
  await p.click('redditBtn');
  assert.equal(new URL(p.urls[0]).searchParams.get('q'),'Raw discussion');
});
test('Settings can be closed with Escape without losing manually entered episode numbers',async()=>{
  const p=await setup({data:episodeData});
  await p.change('episodeNumber','4','input');
  await p.click('settingsBtn');
  let prevented=false;
  p.document.listeners.keydown({key:'Escape',preventDefault(){prevented=true;}});
  assert.equal(prevented,true);
  assert.equal(p.nodes.settingsPanel.hidden,true);
  assert.equal(p.nodes.episodeNumber.value,'4');
});
test('Every platform including Letterboxd can be disabled; disabled handlers cannot navigate and empty state is shown',async()=>{
  const p=await setup();
  assert.equal(p.nodes.letterboxdEnabled.checked,true);
  await p.toggle('letterboxdEnabled',false);
  assert.equal(p.nodes.letterboxdBtn.hidden,true); await p.click('letterboxdBtn'); assert.equal(p.urls.length,0);
  await p.toggle('eksiEnabled',false);
  assert.equal(p.nodes.noPlatforms.hidden,false);
  assert.deepEqual(p.stored.platformSettings.enabled,[]);
  await p.toggle('letterboxdEnabled',true);
  assert.equal(p.nodes.noPlatforms.hidden,true); await p.click('letterboxdBtn'); assert.equal(p.urls.length,1);
});
test('An explicit all-disabled setting survives reload and never re-enables Letterboxd',async()=>{
  const p=await setup({platformSettings:{version:2,enabled:[],order:['letterboxd','eksi','reddit','imdb']}});
  assert.equal(p.nodes.letterboxdBtn.hidden,true); assert.equal(p.nodes.noPlatforms.hidden,false);
  assert.deepEqual(p.nodes.destinations.children.map(node=>node.id),['letterboxdBtn','eksiBtn','redditBtn','imdbBtn']);
  assert.deepEqual(p.writes,[]);
});
test('Order arrows reorder both settings and destination DOM, preserve media fields and bound keyboard focus',async()=>{
  const p=await setup({data:episodeData});
  await p.change('seasonNumber','0','input'); await p.change('episodeNumber','4','input');
  await p.click('letterboxdUp'); await p.click('letterboxdUp');
  assert.deepEqual(p.stored.platformSettings.order,['letterboxd','eksi','reddit','imdb']);
  assert.deepEqual(p.nodes.platformOptions.children.map(node=>node.id),['letterboxdOption','eksiOption','redditOption','imdbOption']);
  assert.deepEqual(p.nodes.destinations.children.map(node=>node.id),['letterboxdBtn','eksiBtn','redditBtn','imdbBtn']);
  assert.equal(p.nodes.letterboxdUp.disabled,true); assert.equal(p.nodes.letterboxdDown.focused,true);
  assert.equal(p.nodes.imdbDown.disabled,true);
  assert.equal(p.nodes.filmTitle.value,'Example Series 2049'); assert.equal(p.nodes.seasonNumber.value,'0'); assert.equal(p.nodes.episodeNumber.value,'4');
  const count=p.writes.length; await p.click('letterboxdUp'); assert.equal(p.writes.length,count);
  await p.change('language','tr');
  assert.equal(p.nodes.letterboxdDown.attributes['aria-label'],AfterWatchI18n.translate('tr','moveDown',{platform:'Letterboxd'}));
  assert.deepEqual(p.stored.platformSettings.order,['letterboxd','eksi','reddit','imdb']);
});
test('A hidden platform can be reordered and keeps its position when enabled again',async()=>{
  const p=await setup(); await p.toggle('letterboxdEnabled',false); await p.click('letterboxdUp');
  assert.equal(p.nodes.letterboxdBtn.hidden,true); assert.deepEqual(p.stored.platformSettings.order,['eksi','letterboxd','reddit','imdb']);
  await p.toggle('letterboxdEnabled',true); assert.equal(p.nodes.letterboxdBtn.hidden,false);
  assert.deepEqual(p.nodes.destinations.children.map(node=>node.id),['eksiBtn','letterboxdBtn','redditBtn','imdbBtn']);
});
test('Legacy choices migrate once with Letterboxd enabled, including previously empty discussion choices',async()=>{
  for(const enabledPlatforms of [[],['eksi'],['reddit'],['reddit','eksi']]) {
    const p=await setup({legacy:true,enabledPlatforms});
    assert.equal(p.nodes.letterboxdEnabled.checked,true);
    assert.deepEqual(new Set(p.stored.platformSettings.enabled),new Set([...enabledPlatforms,'letterboxd']));
    const upgraded=await setup({platformSettings:p.stored.platformSettings}); assert.deepEqual(upgraded.writes,[]);
  }
});
test('Invalid or incomplete platform settings cannot introduce a destination, duplicated order, or unknown version',async()=>{
  for(const platformSettings of [null,{version:3,enabled:[],order:['eksi','reddit','letterboxd','imdb']},
    {version:2,enabled:['evil'],order:['eksi','reddit','letterboxd','imdb']},
    {version:2,enabled:['eksi','eksi'],order:['eksi','reddit','letterboxd','imdb']},
    {version:2,enabled:[],order:['eksi','eksi','letterboxd','imdb']},
    {version:2,enabled:[],order:['letterboxd']},
    {version:2,enabled:[],order:['eksi','reddit','https://evil.test']}]) {
    const p=await setup({platformSettings}); assert.deepEqual(p.stored.platformSettings,{version:2,enabled:['eksi','letterboxd'],order:['eksi','reddit','letterboxd','imdb']});
  }
});
test('A toggle during delayed restoration preserves untouched saved order and choices',async()=>{
  let finish; const loadWait=new Promise(resolve=>{finish=resolve;});
  const p=await setup({platformSettings:{version:2,enabled:['eksi','letterboxd'],order:['letterboxd','reddit','eksi','imdb']},loadWait});
  await p.click('letterboxdBtn'); assert.equal(p.urls.length,0);
  await p.toggle('redditEnabled',true); assert.equal(p.writes.length,0);
  finish(); await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(p.stored.platformSettings.order,['letterboxd','reddit','eksi','imdb']);
  assert.deepEqual(p.stored.platformSettings.enabled,['letterboxd','reddit','eksi']);
});
test('A reorder during delayed restoration preserves untouched saved enable/disable choices',async()=>{
  let finish; const loadWait=new Promise(resolve=>{finish=resolve;});
  const p=await setup({platformSettings:{version:2,enabled:['eksi'],order:['eksi','reddit','letterboxd','imdb']},loadWait});
  await p.click('letterboxdUp'); finish(); await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(p.stored.platformSettings,{version:2,enabled:['eksi'],order:['eksi','letterboxd','reddit','imdb']});
  assert.equal(p.nodes.letterboxdBtn.hidden,true);
});
test('Rapid reordering, selection and language writes save the last complete platform setting',async()=>{
  let finish; const saveWait=new Promise(resolve=>{finish=resolve;}); const p=await setup({saveWait});
  await p.click('letterboxdUp'); await p.toggle('letterboxdEnabled',false); await p.click('letterboxdUp'); await p.change('language','pt');
  await p.toggle('redditEnabled',true); finish(); await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(p.stored.platformSettings,{version:2,enabled:['eksi','reddit'],order:['letterboxd','eksi','reddit','imdb']});
  assert.equal(p.stored.language,'pt');
});
test('Reddit episode search validates numbers, uses SxxExx, and respects navigation locking',async()=>{
  let finish;
  const openWait=new Promise(resolve=>{finish=resolve;});
  const p=await setup({enabledPlatforms:['reddit','eksi'],data:episodeData,openWait});
  await p.change('discussionScope','episode');
  await p.change('seasonNumber','','input');
  assert.equal(p.nodes.redditBtn.disabled,true);
  assert.equal(p.nodes.eksiBtn.disabled,true);
  assert.equal(p.nodes.letterboxdBtn.disabled,false);
  await p.change('seasonNumber','0','input');
  await p.click('redditBtn'); await p.click('eksiBtn'); await p.click('letterboxdBtn');
  assert.equal(p.urls.length,1);
  assert.equal(new URL(p.urls[0]).searchParams.get('q'),'Example Series 2049 S00E02 discussion');
  finish(); await new Promise(resolve=>setImmediate(resolve));
  assert.equal(p.nodes.redditBtn.disabled,false);
});

test('Choosing a page-provided original title changes navigation without keeping the previous movie identity',async()=>{
  const p=await setup({data:{media:[{type:'movie',name:'Müstakbel Suçlar',alternateNames:['Crimes of the Future'],sameAs:['https://imdb.com/title/tt14549466/']}]}});
  assert.equal(p.nodes.filmTitle.value,'Müstakbel Suçlar');
  assert.equal(p.nodes.alternatives.children[0].textContent,'Crimes of the Future');
  p.nodes.alternatives.children[0].listeners.click();
  await p.click('letterboxdBtn');
  assert.equal(p.urls[0],'https://letterboxd.com/search/films/Crimes%20of%20the%20Future/');
  await p.click('eksiBtn');
  assert.equal(new URL(p.urls[1]).searchParams.get('q'),'Crimes of the Future');
});

for(const language of ['en','es','pt','it','tr']) test(`Title alternatives swap repeatedly without changing the interface language in ${language}`,async()=>{
  const p=await setup({language,data:{media:[{type:'movie',name:'Müstakbel Suçlar',alternateNames:['Crimes of the Future'],sameAs:['https://imdb.com/title/tt14549466/']}]}});
  const button=p.nodes.alternatives.children[0];
  for(let i=0;i<4;i++){
    const next=i%2===0?'Crimes of the Future':'Müstakbel Suçlar';
    const previous=p.nodes.filmTitle.value;
    button.listeners.click();
    assert.equal(p.nodes.filmTitle.value,next); assert.equal(button.textContent,previous);
    assert.equal(button.focused,true); assert.equal(p.nodes.alternatives.children.length,1);
    assert.equal(p.nodes.language.value,language); assert.equal(p.nodes.mediaType.value,'movie');
    await p.click('letterboxdBtn');
    assert.equal(p.urls.at(-1),i%2===0?'https://letterboxd.com/search/films/Crimes%20of%20the%20Future/':'https://letterboxd.com/imdb/tt14549466/');
  }
  assert.deepEqual(p.writes,[]);
});

test('With three titles, the clicked option trades places with the selected title and keeps other options',async()=>{
  const p=await setup({data:{media:[{type:'movie',name:'Primary',alternateNames:['Second','Third']}]}});
  const buttons=p.nodes.alternatives.children;
  buttons[1].listeners.click();
  assert.equal(p.nodes.filmTitle.value,'Third'); assert.deepEqual(buttons.filter(b=>!b.hidden).map(b=>b.textContent),['Second','Primary']);
  buttons[1].listeners.click();
  assert.equal(p.nodes.filmTitle.value,'Primary'); assert.deepEqual(buttons.filter(b=>!b.hidden).map(b=>b.textContent),['Second','Third']);
  buttons[0].listeners.click();
  assert.equal(p.nodes.filmTitle.value,'Second'); assert.deepEqual(buttons.filter(b=>!b.hidden).map(b=>b.textContent),['Primary','Third']);
});

test('Manual input filters aliases and never presents a manually invented title as page metadata',async()=>{
  const p=await setup({data:{media:[{type:'movie',name:'Primary',alternateNames:['Second']}]}});
  p.input('  second  ');
  assert.deepEqual(p.nodes.alternatives.children.filter(b=>!b.hidden).map(b=>b.textContent),['Primary']);
  p.input('Custom');
  assert.deepEqual(new Set(p.nodes.alternatives.children.filter(b=>!b.hidden).map(b=>b.textContent)),new Set(['Primary','Second']));
  const last=p.nodes.alternatives.children.at(-1); last.listeners.click();
  assert.equal(last.hidden,true);
  assert.equal(p.nodes.alternatives.children.find(b=>!b.hidden).focused,true);
  assert.ok(!p.nodes.alternatives.children.some(b=>b.textContent==='Custom'));
  const count=p.nodes.filmTitle.value; last.listeners.click(); assert.equal(p.nodes.filmTitle.value,count);
});

test('Series title exchange preserves episode numbers, scope, preferences and inert page text',async()=>{
  const p=await setup({data:{media:[{type:'episode',name:'Pilot',season:'1',episode:'2',series:{name:'Example Show',alternateNames:['<img src=x onerror=alert(1)>']}}]}});
  await p.change('discussionScope','episode'); await p.change('episodeNumber','3','input');
  p.nodes.alternatives.children[0].listeners.click();
  assert.equal(p.nodes.filmTitle.value,'<img src=x onerror=alert(1)>');
  assert.equal(p.nodes.alternatives.children[0].textContent,'Example Show');
  assert.equal(p.nodes.mediaType.value,'episode'); assert.equal(p.nodes.seasonNumber.value,'1');
  assert.equal(p.nodes.episodeNumber.value,'3'); assert.equal(p.nodes.discussionScope.value,'episode');
  await p.click('eksiBtn'); assert.equal(new URL(p.urls[0]).searchParams.get('q'),'<img src=x onerror=alert(1)> 1. sezon 3. bölüm');
  assert.deepEqual(p.writes,[]);
});


const imdbEpisodeData={media:[{type:'episode',name:'Pilot',season:'1',episode:'1',sameAs:['https://www.imdb.com/title/tt0959621/'],series:{name:'Breaking Bad',sameAs:['https://www.imdb.com/title/tt0903747/']}}]};
const imdbSettings={version:2,enabled:['imdb','letterboxd'],order:['imdb','eksi','reddit','letterboxd']};

for(const language of ['en','es','pt','it','tr']) test(`Detection explanations are actionable, localized and update after correction in ${language}`,async()=>{
  const cases=[
    [{media:[{type:'movie',name:'A'},{type:'movie',name:'B'}]},'detectAmbiguous'],
    [{playerPage:true,player:null},'detectPlayerMissing'],
    [{playerPage:true,playerConflict:true},'detectPlayerConflict'],
    [{youtube:{id:'AbCdEfG1234',name:'A',conflict:true}},'detectVideoConflict'],
    [{youtube:{id:'AbCdEfG1234',name:''}},'detectVideoMissing'],
    [{invalidMetadata:true},'detectMetadataUnavailable'],
    [{},'detectNoMedia'],
    [{media:[{type:'movie'}]},'detectTitleMissing'],
    [{media:[{type:'episode',name:'Pilot'}]},'missingSeries'],
    [{playerPage:true,player:null,media:[{type:'episode',name:'Pilot'}]},'missingSeries'],
    [{media:[{type:'episode',series:{name:'Show'}}]},'detectNumbersMissing'],
    [{media:[{type:'episode',episode:'2',series:{name:'Show'}}]},'detectSeasonMissing'],
    [{media:[{type:'episode',season:'1',series:{name:'Show'}}]},'detectEpisodeMissing'],
    [{heading:'Other Show S01E02',media:[{type:'episode',name:'Pilot',series:{name:'Show'}}]},'detectEpisodeConflict']
  ];
  for(const [data,key] of cases){
    const p=await setup({language,data});
    assert.equal(p.nodes.status.textContent,AfterWatchI18n.translate(language,key));
    assert.equal(p.stored.detection,undefined); assert.equal(p.writes.length,0);
    p.input('Manual Title'); await p.change('mediaType','movie');
    assert.equal(p.nodes.status.textContent,AfterWatchI18n.translate(language,'entered'));
    await p.click('eksiBtn'); assert.equal(new URL(p.urls[0]).searchParams.get('q'),'Manual Title');
  }
});

test('Episode explanations track individual missing or invalid fields and do not block series search',async()=>{
  const p=await setup({data:{media:[{type:'episode',name:'Pilot',series:{name:'Show'}}]}});
  assert.equal(p.nodes.eksiBtn.disabled,false);
  await p.change('discussionScope','episode'); assert.equal(p.nodes.eksiBtn.disabled,true);
  await p.change('seasonNumber','0','input'); assert.equal(p.nodes.status.textContent,AfterWatchI18n.translate('en','detectEpisodeMissing'));
  await p.change('episodeNumber','0','input'); assert.equal(p.nodes.status.textContent,AfterWatchI18n.translate('en','detectNumbersInvalid'));
  assert.equal(p.nodes.episodeNumber.attributes['aria-invalid'],'true');
  await p.change('episodeNumber','2','input'); assert.equal(p.nodes.status.textContent,AfterWatchI18n.translate('en','entered'));
  assert.equal(p.nodes.episodeNumber.attributes['aria-invalid'],'false'); assert.equal(p.nodes.eksiBtn.disabled,false);
  p.input('..'); assert.equal(p.nodes.status.textContent,AfterWatchI18n.translate('en','detectTitleInvalid'));
  assert.equal(p.nodes.filmTitle.attributes['aria-invalid'],'true'); assert.equal(p.nodes.eksiBtn.disabled,true);
});

test('Changing search scope or interface language does not dismiss an unresolved episode conflict',async()=>{
  const p=await setup({data:{heading:'Other Show S01E02',media:[{type:'episode',name:'Pilot',series:{name:'Show'}}]}});
  await p.change('discussionScope','episode');
  assert.equal(p.nodes.status.textContent,AfterWatchI18n.translate('en','detectEpisodeConflict'));
  await p.change('language','tr');
  assert.equal(p.nodes.status.textContent,AfterWatchI18n.translate('tr','detectEpisodeConflict'));
  await p.change('seasonNumber','1','input');
  assert.equal(p.nodes.status.textContent,AfterWatchI18n.translate('tr','detectEpisodeMissing'));
});

test('Navigation changes and conflicting IMDb IDs get explicit explanations without reusing stale identities',async()=>{
  const moved=await setup({data:{youtube:{id:'AbCdEfG1234',name:'First'}},mainData:{id:'Zr_ONXsASgI',name:'Second'}});
  assert.equal(moved.nodes.status.textContent,AfterWatchI18n.translate('en','detectNavigationChanged'));
  const data={media:[{type:'movie',name:'Raw',sameAs:['https://imdb.com/title/tt4954522/','https://imdb.com/title/tt1234567/']}]};
  const p=await setup({data,platformSettings:imdbSettings});
  assert.equal(p.nodes.status.textContent,AfterWatchI18n.translate('en','detectIdentityConflict'));
  await p.click('imdbBtn'); assert.equal(new URL(p.urls[0]).searchParams.get('q'),'Raw');
  await p.change('language','tr'); assert.equal(p.nodes.status.textContent,AfterWatchI18n.translate('tr','detectIdentityConflict'));
});

test('Read and opening failures retain their actionable messages over validation hints',async()=>{
  const read=await setup({injectFails:true}); assert.equal(read.nodes.status.textContent,AfterWatchI18n.translate('en','readFailed'));
  read.input('Manual'); assert.equal(read.nodes.status.textContent,AfterWatchI18n.translate('en','entered'));
  const open=await setup({openFails:true}); await open.click('eksiBtn'); assert.equal(open.nodes.status.textContent,AfterWatchI18n.translate('en','openFailed'));
});

test('Slow automatic reads cannot replace a manual correction or its explanation',async()=>{
  let finish; const injectWait=new Promise(resolve=>{finish=resolve;});
  const p=await setup({data:{media:[{type:'movie',name:'A'},{type:'movie',name:'B'}]},injectWait});
  p.input('Manual'); await p.change('mediaType','series'); finish(); await new Promise(resolve=>setImmediate(resolve));
  assert.equal(p.nodes.filmTitle.value,'Manual'); assert.equal(p.nodes.status.textContent,AfterWatchI18n.translate('en','entered'));
});
test('IMDb selects the parent series or exact episode according to the chosen scope',async()=>{
  const p=await setup({data:imdbEpisodeData,platformSettings:imdbSettings});
  await p.click('imdbBtn'); assert.equal(p.urls[0],'https://www.imdb.com/title/tt0903747/');
  await p.change('discussionScope','episode'); await p.click('imdbBtn');
  assert.equal(p.urls[1],'https://www.imdb.com/title/tt0959621/');
  assert.match(p.nodes.imdbRoute.textContent,/identified IMDb page/);
  await p.click('letterboxdBtn'); assert.equal(p.urls[2],'https://letterboxd.com/search/films/Breaking%20Bad/');
});
test('IMDb stops using episode identity after number, title or media-type edits',async()=>{
  const p=await setup({data:imdbEpisodeData,platformSettings:imdbSettings});
  await p.change('discussionScope','episode');
  await p.change('episodeNumber','2','input'); await p.click('imdbBtn');
  assert.equal(new URL(p.urls[0]).searchParams.get('q'),'Breaking Bad S01E02');
  p.input('Other Show'); await p.click('imdbBtn');
  assert.equal(new URL(p.urls[1]).searchParams.get('q'),'Other Show S01E02');
  await p.change('mediaType','series'); await p.click('imdbBtn');
  assert.equal(new URL(p.urls[2]).searchParams.get('q'),'Other Show');
});
test('IMDb does not substitute an episode ID for a missing parent series ID',async()=>{
  const data=structuredClone(imdbEpisodeData); delete data.media[0].series.sameAs;
  const p=await setup({data,platformSettings:imdbSettings});
  await p.click('imdbBtn'); assert.equal(new URL(p.urls[0]).searchParams.get('q'),'Breaking Bad');
  await p.change('discussionScope','episode'); await p.click('imdbBtn');
  assert.equal(p.urls[1],'https://www.imdb.com/title/tt0959621/');
});
test('IMDb episode scope needs explicit numbers; series scope stays usable without them',async()=>{
  const data=structuredClone(imdbEpisodeData); delete data.media[0].season;
  const p=await setup({data,platformSettings:imdbSettings});
  await p.change('discussionScope','episode'); assert.equal(p.nodes.imdbBtn.disabled,true);
  await p.click('imdbBtn'); assert.equal(p.urls.length,0);
  await p.change('discussionScope','series'); await p.click('imdbBtn');
  assert.equal(p.urls[0],'https://www.imdb.com/title/tt0903747/');
});
test('IMDb movie and series IDs are direct only while the detected type and title match',async()=>{
  for(const data of [raw,{media:[{type:'series',name:'Breaking Bad',sameAs:['https://www.imdb.com/title/tt0903747/']}]}]) {
    const p=await setup({data,platformSettings:imdbSettings});
    await p.click('imdbBtn'); assert.equal(new URL(p.urls[0]).origin,'https://www.imdb.com');
    assert.match(new URL(p.urls[0]).pathname,/^\/title\/tt\d+\/$/);
    p.input('Replacement'); await p.click('imdbBtn'); assert.equal(new URL(p.urls[1]).searchParams.get('q'),'Replacement');
  }
});
test('IMDb visibility, order and disabled navigation persist like every other platform',async()=>{
  const p=await setup({platformSettings:imdbSettings});
  await p.click('imdbDown'); assert.deepEqual(p.stored.platformSettings.order,['eksi','imdb','reddit','letterboxd']);
  await p.toggle('imdbEnabled',false); await p.click('imdbBtn'); assert.equal(p.urls.length,0);
  const reloaded=await setup({platformSettings:p.stored.platformSettings});
  assert.equal(reloaded.nodes.imdbBtn.hidden,true); await reloaded.click('imdbBtn'); assert.equal(reloaded.urls.length,0);
});
test('Three-platform settings upgrade once without changing explicit disabled choices or order',async()=>{
  for(const enabled of [[],['eksi'],['letterboxd','reddit']]) {
    const p=await setup({platformSettings:{version:1,enabled,order:['letterboxd','reddit','eksi']}});
    assert.deepEqual(p.stored.platformSettings,{version:2,enabled:['letterboxd','reddit','eksi'].filter(id=>enabled.includes(id)),order:['letterboxd','reddit','eksi','imdb']});
    assert.equal(p.nodes.imdbBtn.hidden,true);
    const reloaded=await setup({platformSettings:p.stored.platformSettings}); assert.deepEqual(reloaded.writes,[]);
  }
});
test('A late preference restoration cannot overwrite a manually disabled IMDb selection',async()=>{
  let finish; const loadWait=new Promise(resolve=>{finish=resolve;});
  const p=await setup({platformSettings:imdbSettings,loadWait});
  await p.toggle('imdbEnabled',false); await p.click('imdbBtn'); assert.equal(p.urls.length,0);
  finish(); await new Promise(resolve=>setImmediate(resolve));
  assert.equal(p.nodes.imdbBtn.hidden,true); assert.deepEqual(p.stored.platformSettings.enabled,['letterboxd']);
});
