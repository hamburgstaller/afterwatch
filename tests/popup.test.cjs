const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const FilmTools = require('../film.js');
const raw = require('./fixtures/raw.json');
const source = fs.readFileSync(require.resolve('../popup.js'),'utf8');
async function setup(options = {}) {
  const nodes = {};
  for (const id of ['filmTitle','status','filmDetail','alternatives','eksiBtn','letterboxdBtn','letterboxdRoute']) nodes[id] = {value:'',textContent:'',disabled:true,children:[],listeners:{},addEventListener(type,fn){this.listeners[type]=fn;},append(node){this.children.push(node);}};
  const urls=[];
  let injections=0;
  const document={getElementById:id=>nodes[id],createElement:()=>({listeners:{},addEventListener(type,fn){this.listeners[type]=fn;}})};
  const chrome={tabs:{query:async()=>options.noTab?[]:[{id:0,url:options.url||'https://example.test/film'}],create:async({url})=>{if(options.openFails) throw Error('Failed'); urls.push(url); if(options.openWait) await options.openWait;}},scripting:{executeScript:async()=>{injections++; if(options.injectFails) throw Error('Denied'); if(options.injectWait) await options.injectWait; return options.noResults?[]:[{result:options.data||raw}];}}};
  vm.runInNewContext(source,{document,chrome,FilmTools});
  await new Promise(resolve=>setImmediate(resolve));
  return {nodes,urls,injections,async click(id){nodes[id].listeners.click();await new Promise(resolve=>setImmediate(resolve));},input(value){nodes.filmTitle.value=value;nodes.filmTitle.listeners.input();}};
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
