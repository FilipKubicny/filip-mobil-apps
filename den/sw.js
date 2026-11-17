const CACHE='den-v3';
const FILES=['./','index.html','app.js','app.js?v=3','style.css','style.css?v=3','manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  const path=url.pathname;
  const isCode=/\.(?:js|css|html)$/.test(path)||path.endsWith('/')||path.endsWith('sw.js')||path.endsWith('manifest.webmanifest');
  const req=isCode?new Request(e.request,{cache:'no-store'}):e.request;
  e.respondWith(
    fetch(req).then(r=>{const cp=r.clone();caches.open(CACHE).then(c=>{c.put(e.request,cp);if(url.search)c.put(new Request(url.pathname+url.search),r.clone())});return r})
    .catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match('index.html')))
  );
});
