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
  for (const id of ['filmTitle','status','filmDetail','alternatives','eksiBtn','redditBtn','letterboxdBtn','letterboxdRoute','eksiRoute','redditRoute','mediaType','discussionScope','seasonNumber','episodeNumber','language','languageStatus','episodeControls','spoilerNote','titleLabel','settingsBtn','settingsPanel','settingsStatus','watchPanel','closeSettings','eksiEnabled','redditEnabled']) nodes[id] = {value:'',textContent:'',disabled:true,hidden:false,checked:false,children:[],listeners:{},classList:{toggle(){}},attributes:{},setAttribute(name,value){this.attributes[name]=value;},focus(){this.focused=true;},addEventListener(type,fn){this.listeners[type]=fn;},append(node){this.children.push(node);}};
  nodes.settingsPanel.hidden = true;
  nodes.mediaType.value = 'movie'; nodes.discussionScope.value = 'series'; nodes.language.value = 'en';
  const urls=[];
  let injections=0;
  const document={documentElement:{lang:'en'},listeners:{},addEventListener(type,fn){this.listeners[type]=fn;},querySelectorAll:()=>[],getElementById:id=>nodes[id],createElement:()=>({listeners:{},addEventListener(type,fn){this.listeners[type]=fn;}})};
  const chrome={tabs:{query:async()=>options.noTab?[]:[{id:0,url:options.url||'https://example.test/film'}],create:async({url})=>{if(options.openFails) throw Error('Failed'); urls.push(url); if(options.openWait) await options.openWait;}},scripting:{executeScript:async()=>{injections++; if(options.injectFails) throw Error('Denied'); if(options.injectWait) await options.injectWait; return options.noResults?[]:[{result:options.data||raw}];}}};
  chrome.i18n={getUILanguage:()=>options.browserLanguage||'en-US'};
  const stored = options.firstRun ? {} : {language:options.language ?? 'en',enabledPlatforms:options.enabledPlatforms ?? ['eksi']};
  if (options.platformKeyMissing) delete stored.enabledPlatforms;
  const writes = [];
  chrome.storage={local:{get:async()=>{const snapshot=JSON.parse(JSON.stringify(stored)); if(options.loadWait) await options.loadWait; if(options.loadFails) throw Error('Denied'); return snapshot;},set:async data=>{const serialized=JSON.parse(JSON.stringify(data)); writes.push(serialized); if(options.saveWait) await options.saveWait; if(options.saveFails) throw Error('Denied'); Object.assign(stored,serialized);}}};
  vm.runInNewContext(source,{document,chrome,FilmTools,AfterWatchI18n});
  await new Promise(resolve=>setImmediate(resolve));
  return {nodes,urls,injections,stored,writes,document,async click(id){nodes[id].listeners.click();await new Promise(resolve=>setImmediate(resolve));},input(value){nodes.filmTitle.value=value;nodes.filmTitle.listeners.input();},async toggle(id,checked){nodes[id].checked=checked;nodes[id].listeners.change();await new Promise(resolve=>setImmediate(resolve));},async change(id,value,event='change'){nodes[id].value=value;nodes[id].listeners[event]();await new Promise(resolve=>setImmediate(resolve));}};
}
test('Popup accepts tab id zero and opens exactly the intended destinations',async()=>{
  const p=await setup();
  assert.equal(p.nodes.filmTitle.value,'Raw');
  assert.equal(p.nodes.eksiBtn.disabled,false);
  await p.click('eksiBtn'); await p.click('letterboxdBtn');
  assert.deepEqual(p.urls,['https://eksisozluk.com/?q=Raw','https://letterboxd.com/imdb/tt4954522/']);
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
    assert.deepEqual(p.stored.enabledPlatforms,[platform]);
  }
});
test('Upgrade preserves the existing Ekşi destination even with an English interface',async()=>{
  const p=await setup({language:'en',platformKeyMissing:true,browserLanguage:'es-ES'});
  assert.equal(p.nodes.eksiBtn.hidden,false);
  assert.equal(p.nodes.redditBtn.hidden,true);
  assert.deepEqual(p.stored.enabledPlatforms,['eksi']);
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
  assert.deepEqual(p.stored.enabledPlatforms,[]);
});
test('Saved platform choices override browser language and remain independent of UI language',async()=>{
  const p=await setup({language:'tr',browserLanguage:'tr-TR',enabledPlatforms:['reddit']});
  assert.equal(p.nodes.redditBtn.hidden,false);
  assert.equal(p.nodes.eksiBtn.hidden,true);
  await p.change('language','en');
  assert.equal(p.nodes.redditBtn.hidden,false);
  assert.deepEqual(p.stored.enabledPlatforms,['reddit']);
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
  assert.equal(p.nodes.eksiBtn.hidden,true);
  assert.deepEqual(p.stored.enabledPlatforms,[]);
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
  assert.deepEqual(p.stored.enabledPlatforms,['eksi']);
});
test('Invalid saved platform data cannot add arbitrary destinations',async()=>{
  for (const enabledPlatforms of [['https://evil.test/'],{reddit:true},['reddit','eksi','letterboxd'],['__proto__']]) {
    const p=await setup({enabledPlatforms});
    assert.equal(p.nodes.eksiBtn.hidden,false);
    assert.equal(p.nodes.redditBtn.hidden,true);
    assert.deepEqual(p.stored.enabledPlatforms,['eksi']);
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
