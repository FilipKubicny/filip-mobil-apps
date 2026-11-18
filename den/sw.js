const CACHE='den-v11.2';
const FILES=['./','index.html','app.js','app.js?v=11.2','style.css','style.css?v=11.2','qr.js','qr.js?v=11.2','manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png','icon-512-maskable.png','favicon.png','icon.svg','fonts/Geist-Variable.woff2'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('message',e=>{if(e.data&&e.data.type==='SKIP_WAITING')self.skipWaiting()});
function isInbox(path){return /inbox\.enc$/.test(path)||/\.enc$/.test(path)}
function isVersion(path){return /version\.json$/.test(path)}
function isShell(path){return /\.(?:js|css|html)$/.test(path)||path.endsWith('/')||path.endsWith('sw.js')||path.endsWith('manifest.webmanifest')}
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  const path=url.pathname;
  if(isInbox(path)||isVersion(path)){
    e.respondWith(fetch(new Request(e.request,{cache:'no-store'})));
    return;
  }
  const netReq=isShell(path)?new Request(e.request,{cache:'no-store'}):e.request;
  e.respondWith((async()=>{
    const cached=await caches.match(e.request,{ignoreSearch:true});
    const fetching=fetch(netReq).then(async r=>{
      if(r&&r.ok){
        const copy=r.clone();
        const cache=await caches.open(CACHE);
        await cache.put(e.request,copy);
        if(url.search)await cache.put(new Request(url.pathname+url.search),r.clone());
        if(cached&&isShell(path)){
          try{
            const a=await cached.clone().text();
            const b=await r.clone().text();
            if(a!==b){
              const clients=await self.clients.matchAll({type:'window'});
              clients.forEach(c=>c.postMessage({type:'sw-update'}));
            }
          }catch(err){}
        }
      }
      return r;
    }).catch(()=>cached||caches.match('index.html',{ignoreSearch:true}));
    return cached||fetching;
  })());
});
