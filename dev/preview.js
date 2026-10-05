'use strict';
// Development-only Chrome API simulation. This file is never loaded by popup.html.
const scenario = new URLSearchParams(location.search).get('scenario') || 'raw';
const opened = [];
window.chrome = {
  i18n:{getUILanguage:()=>navigator.language},
  storage:{local:{get:async()=>{
    const preferences={};
    const savedLanguage=localStorage.getItem('afterwatch-preview-language');
    if (savedLanguage !== null) preferences.language=savedLanguage;
    try {preferences.enabledPlatforms=JSON.parse(localStorage.getItem('afterwatch-preview-platforms')||'null');} catch { /* Production validates stored data. */ }
    return preferences;
  },set:async preferences=>{
    if (Object.hasOwn(preferences,'language')) localStorage.setItem('afterwatch-preview-language',preferences.language);
    if (Object.hasOwn(preferences,'enabledPlatforms')) localStorage.setItem('afterwatch-preview-platforms',JSON.stringify(preferences.enabledPlatforms));
  }}},
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
    if (scenario === 'episode-heading') return [{result:{heading:'Breaking Bad 1. Sezon 1. Bölüm',ogType:'video.episode',pathname:'/bolum/breaking-bad-1-sezon-1-bolum-1-izle-16/'}}];
    const response = await fetch('/tests/fixtures/raw.json');
    return [{result:await response.json()}];
  }}
};
