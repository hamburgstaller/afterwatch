const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const i18n = require('../i18n.js');
const keys = Object.keys(i18n.messages.en).sort();
const placeholders = value => [...value.matchAll(/\{(\w+)\}/g)].map(match=>match[1]).sort();
test('Every language has complete nonempty messages and matching interpolation fields',()=>{
  assert.deepEqual(Object.keys(i18n.messages),['en','es','pt','it','tr']);
  for (const [language,catalog] of Object.entries(i18n.messages)) {
    assert.deepEqual(Object.keys(catalog).sort(),keys,language);
    for (const key of keys) {
      assert.equal(typeof catalog[key],'string',`${language}.${key}`);
      assert.ok(catalog[key].trim(),`${language}.${key}`);
      assert.deepEqual(placeholders(catalog[key]),placeholders(i18n.messages.en[key]),`${language}.${key}`);
    }
  }
});
test('All static popup translation keys exist and are safe to render as text',()=>{
  const html=fs.readFileSync(require.resolve('../popup.html'),'utf8');
  for (const [,key] of html.matchAll(/data-i18n(?:-placeholder|-aria)?="([^"]+)"/g)) assert.ok(keys.includes(key),key);
  assert.equal(i18n.translate('__proto__','check'),i18n.messages.en.check);
  assert.equal(i18n.translate('tr','unknownKey'),'');
  assert.equal(i18n.translate('en','eksiEpisode',{title:'<img src=x>',season:1,episode:2}),'Search: <img src=x> · Season 1, episode 2');
});
test('Language application translates accessible labels and placeholders using textContent',()=>{
  const text={dataset:{i18n:'intro'}};
  const placeholder={dataset:{i18nPlaceholder:'placeholder'},setAttribute(name,value){this[name]=value;}};
  const aria={dataset:{i18nAria:'selection'},setAttribute(name,value){this[name]=value;}};
  const document={documentElement:{},querySelectorAll:selector=>selector==='[data-i18n]'?[text]:selector==='[data-i18n-placeholder]'?[placeholder]:[aria]};
  i18n.applyLanguage(document,'tr');
  assert.equal(document.documentElement.lang,'tr');
  assert.equal(text.textContent,i18n.messages.tr.intro);
  assert.equal(placeholder.placeholder,i18n.messages.tr.placeholder);
  assert.equal(aria['aria-label'],i18n.messages.tr.selection);
});
