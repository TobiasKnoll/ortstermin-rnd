const CACHE='knoll-ortstermin-shell-1.1.0-r1';
const FILES=['./','./index.html','./styles.css','./app.mjs','./schema.mjs','./model.mjs','./modernization.mjs','./brand.mjs','./knoll-header.png','./knoll-mark.png','./storage.mjs','./export.mjs','./report.mjs','./print.html','./print.mjs','./jszip.min.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('knoll-ortstermin-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);if(url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
  event.respondWith(caches.open(CACHE).then(async cache=>{
    const cached=await cache.match(event.request,{ignoreSearch:true});if(cached)return cached;
    return fetch(event.request);
  }));
});
