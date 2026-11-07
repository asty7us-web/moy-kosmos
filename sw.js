/* «Мой космос»: зашифрованные фото и картинки оформления берутся из памяти телефона — второй раз сайт открывается сразу.
   Фото в памяти остаются зашифрованными. Страница, пароль-замок, список альбомов и удалённых — всегда свежие с сайта.
   С 07.11 фото идут с raw.githubusercontent.com; в памяти лежат под прежними адресами — уже сохранённые заново не качаются. */
const C = "mk-v1", RAW = "https://raw.githubusercontent.com";
self.addEventListener("install", e => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || (u.origin !== location.origin && u.origin !== RAW)) return;
  const p = u.pathname, m = p.match(/\/data\/[ft]\/[^/]+\.bin$/), art = u.origin === location.origin && /\/assets\/[^/]+\.(webp|js)$/.test(p);
  if (!m && !art) return;
  const src = u.origin + p, key = m ? new URL("." + m[0], self.registration.scope).href : src;
  if (u.searchParams.has("fresh")) {   // фото не расшифровалось (пересобрали сайт) — берём заново и кладём в память
    e.respondWith(fetch(src, { cache: "reload" }).then(r => { if (r.ok) { const c = r.clone(); caches.open(C).then(x => x.put(key, c)); } return r; }));
    return;
  }
  e.respondWith(caches.open(C).then(x => x.match(key).then(hit => hit || fetch(src).then(r => { if (r.ok) x.put(key, r.clone()); return r; }))));
});
