// Service Worker בסיסי — מאפשר התקנה למסך הבית (PWA).
// אין קאשינג אגרסיבי של דפים דינמיים (הנתונים חיים ב-Neon ומשתנים תדיר) —
// רק קאשינג של קבצים סטטיים (אייקונים וכו') לטעינה מהירה יותר.

const CACHE_NAME = "likut-shell-v1";
const SHELL_ASSETS = ["/icons/icon-192.png", "/icons/icon-512.png", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // קבצים סטטיים — קאש קודם, רשת כגיבוי
  if (SHELL_ASSETS.some((a) => request.url.endsWith(a))) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
    return;
  }

  // כל השאר — רשת קודם (נתונים חיים), בלי קאש (לא רוצים דפים/API מיושנים)
});
