const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const files = new Map([
  ['/popup.css',['popup.css','text/css']], ['/film.js',['film.js','text/javascript']],
  ['/popup.js',['popup.js','text/javascript']], ['/dev/preview.js',['dev/preview.js','text/javascript']],
  ['/i18n.js',['i18n.js','text/javascript']],
  ['/tests/fixtures/raw.json',['tests/fixtures/raw.json','application/json']]
]);
http.createServer((req,res)=>{
  const url = new URL(req.url,'http://127.0.0.1');
  if(url.pathname==='/favicon.ico') {res.writeHead(204);res.end();return;}
  if (url.pathname==='/fixtures/episode-heading') {
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
    res.end('<!doctype html><html lang="en"><meta charset="utf-8"><title>Breaking Bad 1. Sezon 1. Bölüm izle | Example Catalog</title><meta property="og:type" content="video.episode"><h1>Breaking Bad 1. Sezon 1. Bölüm</h1><p>Synthetic episode page with incomplete metadata. No video.</p></html>');
    return;
  }
  if (url.pathname==='/fixtures/series' || url.pathname==='/fixtures/episode') {
    const kind=url.pathname.endsWith('episode')?'episode':'series';
    const fixture=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/tv.json'),'utf8'))[kind];
    const name=kind==='episode'?'A New Start':'Example Series 2049';
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
    res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><title>${name}</title><script type="application/ld+json">${JSON.stringify(fixture)}</script><h1>${name}</h1><p>Synthetic ${kind} page for testing the unpacked AfterWatch extension. No video or real catalog entry.</p></html>`);
    return;
  }
  if(url.pathname==='/') {
    let html=fs.readFileSync(path.join(root,'popup.html'),'utf8');
    html=html.replace('<script src="film.js">','<script src="/dev/preview.js"></script><script src="film.js">');
    html=html.replace('</body>','<pre id="opened" style="white-space:pre-wrap;overflow-wrap:anywhere;font-size:10px;padding:12px" aria-label="Destination URLs in this test"></pre></body>');
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);return;
  }
  const entry=files.get(url.pathname);
  if(!entry){res.writeHead(404);res.end('Not found');return;}
  res.writeHead(200,{'Content-Type':entry[1]+'; charset=utf-8'});
  res.end(fs.readFileSync(path.join(root,entry[0])));
}).listen(4173,'127.0.0.1',()=>console.log('AfterWatch preview: http://127.0.0.1:4173 (simulated Chrome APIs)'));
