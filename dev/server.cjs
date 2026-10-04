const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const files = new Map([
  ['/popup.css',['popup.css','text/css']], ['/film.js',['film.js','text/javascript']],
  ['/popup.js',['popup.js','text/javascript']], ['/dev/preview.js',['dev/preview.js','text/javascript']],
  ['/tests/fixtures/raw.json',['tests/fixtures/raw.json','application/json']]
]);
http.createServer((req,res)=>{
  const url = new URL(req.url,'http://127.0.0.1');
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
