'use strict';
// Development-only Chrome API simulation. This file is never loaded by popup.html.
const scenario = new URLSearchParams(location.search).get('scenario') || 'raw';
const opened = [];
window.chrome = {
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
    const response = await fetch('/tests/fixtures/raw.json');
    return [{result:await response.json()}];
  }}
};
