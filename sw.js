// ReefKeeper — service worker minimal et sûr.
// Stratégie : network-first pour la page principale (on ne sert jamais une
// vieille version quand le réseau marche), avec repli sur le cache si hors
// ligne. Les photos Supabase ne sont pas mises en cache ici (trop lourdes).
const CACHE = 'reefkeeper-v10';
const SHELL = ['/', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // On ne gère que notre propre origine (jamais Supabase ni les CDN)
  if (url.origin !== location.origin) return;

  if (e.request.mode === 'navigate') {
    // Page : réseau d'abord, cache en secours
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/'))
    );
  } else {
    // Icônes/manifest : cache d'abord (contenu stable)
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request))
    );
  }
});
