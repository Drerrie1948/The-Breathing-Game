const CACHE='breathing-game-beta-v27';
const FILES=['./','./index.html','./styles.css?v=27','./game3d.js?v=27','./manifest.webmanifest','./vendor/three.module.min.js','./assets/gorilla-run.png','./assets/officer-run-back.png','./assets/urban-obstacles.png','./assets/overhead-gantry.png','./assets/city-facades.png','./assets/convenience-store-escape.png','./assets/vervet-monkey-calls.mp3'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put('./index.html',copy));return response;}).catch(()=>caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response;})));
});
