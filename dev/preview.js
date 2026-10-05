'use strict';
// Development-only Chrome API simulation. This file is never loaded by popup.html.
const scenario = new URLSearchParams(location.search).get('scenario') || 'raw';
const opened = [];
window.chrome = {
  storage:{local:{get:async()=>({language:localStorage.getItem('afterwatch-preview-language')||'en'}),set:async({language})=>{localStorage.setItem('afterwatch-preview-language',language);}}},
  tabs: {
    query: async () => [{id:1,url:scenario==='protected'?'chrome://extensions/':'https://example.test/film'}],
    create: async ({url}) => {
      opened.push(url);
      document.getElementById('opened').textContent = opened.join('\n');
      return {id:2,url};
    }
  },
  scripting: {executeScript: async () => {
    if (scenario === 'error') throw new Error('Simulated injection failure');
    if (scenario === 'generic') return [{result:{heading:'News',movies:[]}}];
    if (scenario === 'numeric') return [{result:{movies:[{name:'Blade Runner 2049',date:'2017-01-01'}]}}];
    if (scenario === 'hostile') return [{result:{movies:[{name:'<img src=x onerror=alert(1)>'}]}}];
    if (scenario === 'series') return [{result:{media:[{type:'series',name:'Example Series 2049',date:'2020-01-01'}]}}];
    if (scenario === 'episode') return [{result:{media:[{type:'episode',name:'A New Start',date:'2021-02-01',season:'1',episode:'2',series:{name:'Example Series 2049',alternateNames:['Example Series']}}]}}];
    if (scenario === 'missing-series') return [{result:{media:[{type:'episode',name:'Pilot',season:'1',episode:'1'}]}}];
    const response = await fetch('/tests/fixtures/raw.json');
    return [{result:await response.json()}];
  }}
};
