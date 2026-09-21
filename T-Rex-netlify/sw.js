const CACHE="trex-v2";
const CORE=["./","./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png","./apple-touch-icon.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",e=>{
  const req=e.request; if(req.method!=="GET") return;
  const url=new URL(req.url);
  if(url.pathname.includes("/.netlify/functions/")){ e.respondWith(fetch(req).catch(()=>new Response('{"error":"offline"}',{headers:{"Content-Type":"application/json"}}))); return; }
  if(req.mode==="navigate"){ e.respondWith(fetch(req).catch(()=>caches.match("./index.html"))); return; }
  e.respondWith(caches.match(req).then(r=>r||fetch(req).then(res=>{ if(url.origin===location.origin){const cc=res.clone();caches.open(CACHE).then(c=>c.put(req,cc));} return res;}).catch(()=>r)));
});

// ---- Web Push (fires even when the app/tab is closed) ----
self.addEventListener("push",e=>{
  let d={title:"T-Rex alert",body:""};
  try{ d=e.data.json(); }catch(_){ try{ if(e.data) d.body=e.data.text(); }catch(__){} }
  e.waitUntil(self.registration.showNotification(d.title||"T-Rex alert",{
    body:d.body||"", icon:"icon-192.png", badge:"icon-192.png",
    tag:d.tag||"trex", renotify:true, data:{url:(d.url||"./")}
  }));
});
self.addEventListener("notificationclick",e=>{
  e.notification.close();
  const target=(e.notification.data&&e.notification.data.url)||"./";
  e.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(cs=>{
    for(const c of cs){ if("focus" in c){ c.navigate&&c.navigate(target); return c.focus(); } }
    if(clients.openWindow) return clients.openWindow(target);
  }));
});
