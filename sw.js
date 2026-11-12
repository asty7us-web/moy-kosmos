/* «Мой космос», версия 2. Память телефона:
   • зашифрованные фото — как и раньше, в «mk-v1» под прежними адресами: то, что уже скачано, заново не качается;
     фото в памяти остаются зашифрованными;
   • шрифты и значки — в «mk2-shell», берутся из памяти сразу;
   • страница, замок, список альбомов и список удалённых — всегда свежие с сайта, а без связи — последние сохранённые
     (сайт открывается и без интернета, с теми фото, что уже смотрели);
   • «Моя планета» (mir.html и assets/mir — библиотека, открытка) — так же: страница свежая с сайта, без связи последняя
     сохранённая; библиотека из памяти сразу, обновление подтягивается к следующему разу (12.11.2026).
   Музыка идёт потоком мимо памяти. */
const PHOTOS = "mk-v1", SHELL = "mk2-shell", RAW = "https://raw.githubusercontent.com";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== PHOTOS && k !== SHELL) await caches.delete(k);
  const c = await caches.open(PHOTOS);                       // оформление прежней версии из памяти убираем, фото оставляем
  for (const r of await c.keys()) if (!/\/data\/[ft]\/[^/]+\.bin$/.test(new URL(r.url).pathname)) await c.delete(r);
  await self.clients.claim();
})()));
const fresh = async (url, key) => {                          // сначала сеть; нет связи или она очень медленная — последнее сохранённое
  const c = await caches.open(SHELL), hit = await c.match(key);
  const net = fetch(url, { cache: "no-cache" }).then(r => { if (r.ok) c.put(key, r.clone()); return r; });
  if (!hit) return net;
  return Promise.race([net, new Promise(res => setTimeout(() => res(hit.clone()), 7000))]).catch(() => hit);
};
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const u = new URL(req.url), same = u.origin === location.origin, p = u.pathname;
  const ph = (same || u.origin === RAW) && p.match(/\/data\/[ft]\/[^/]+\.bin$/);
  if (ph) {
    const src = u.origin + p, key = new URL("." + ph[0], self.registration.scope).href;
    if (u.searchParams.has("fresh")) {                       // фото не расшифровалось (на сайте его заменили) — берём заново
      e.respondWith(fetch(src, { cache: "reload" }).then(r => { if (r.ok) { const c = r.clone(); caches.open(PHOTOS).then(x => x.put(key, c)); } return r; }));
      return;
    }
    e.respondWith(caches.open(PHOTOS).then(x => x.match(key).then(hit => hit || fetch(src).then(r => { if (r.ok) x.put(key, r.clone()); return r; }))));
    return;
  }
  if (!same || req.headers.has("range")) return;
  if (/\/assets\/(fonts\/[^/]+\.woff2|ic[^/]*\.webp)$/.test(p)) {
    e.respondWith(caches.open(SHELL).then(x => x.match(p).then(hit => hit || fetch(req).then(r => { if (r.ok) x.put(p, r.clone()); return r; }))));
    return;
  }
  if (/\/assets\/mir\/[^/]+$/.test(p)) {                      // «Моя планета»: библиотека и открытка — из памяти сразу, а свежие подтягиваются к следующему разу
    const got = caches.open(SHELL).then(x => x.match(p).then(hit => {
      const net = fetch(req).then(r => { if (r.ok) x.put(p, r.clone()); return r; });
      if (!hit) return net;
      e.waitUntil(net.catch(() => {})); return hit;
    }));
    e.respondWith(got); return;
  }
  const page = req.mode === "navigate" && (p.endsWith("/") || p.endsWith("/index.html"));
  const mir = req.mode === "navigate" && p.endsWith("/mir.html");                          // страница мира — тоже свежая с сайта, без связи последняя сохранённая
  if (page || mir || /\/(lock\.json|manifest\.webmanifest|data\/(m|del)\.bin)$/.test(p)) e.respondWith(fresh(req.url, page ? "page" : p));
});
