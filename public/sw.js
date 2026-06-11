self.addEventListener("install", (event) => {
  event.waitUntil(caches.open("dunia-ai-v1").then((cache) => cache.addAll(["/", "/manifest.json", "/icon.svg"])));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // Ne pas intercepter les appels API pour éviter les conflits en développement
  if (event.request.url.includes("/api/")) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      // Retourner une erreur réseau propre au lieu d'undefined
      return new Response("Network error and not in cache", {
        status: 408,
        headers: { "Content-Type": "text/plain" }
      });
    })
  );
});
