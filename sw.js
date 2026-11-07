/* «Мой космос»: зашифрованные фото и картинки оформления берутся из памяти телефона — второй раз сайт открывается сразу.
   Фото в памяти остаются зашифрованными. Страница, пароль-замок, список альбомов и удалённых — всегда свежие с сайта. */
const C = "mk-v1";
self.addEventListener("install", e => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  const p = u.pathname, photo = /\/data\/[ft]\/[^/]+\.bin$/.test(p), art = /\/assets\/[^/]+\.(webp|js)$/.test(p);
  if (!photo && !art) return;
  const key = u.origin + p;
  if (u.searchParams.has("fresh")) {   // фото не расшифровалось (пересобрали сайт) — берём заново и кладём в память
    e.respondWith(fetch(key, { cache: "reload" }).then(r => { if (r.ok) { const c = r.clone(); caches.open(C).then(x => x.put(key, c)); } return r; }));
    return;
  }
  e.respondWith(caches.open(C).then(x => x.match(key).then(hit => hit || fetch(e.request).then(r => { if (r.ok) x.put(key, r.clone()); return r; }))));
});
