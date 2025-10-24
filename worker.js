addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request))
})

// Allowed origin
const ALLOWED_ORIGIN = "https://pothabattulavinod.github.io";

// Base URL where all .m3u8 videos are hosted
const VIDEO_BASE_URL = "https://pothabattulavinod.github.io/pay/";

// Forbidden paths (optional)
const FORBIDDEN_PATHS = [
  "/pay/admin",
  "/pay/secret"
];

// Default cache duration in seconds (1 day)
const DEFAULT_CACHE_SECONDS = 86400;

async function handleRequest(request) {
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");
  const path = url.pathname;
  const searchParams = url.search; // Keep query params for cache-busting

  // Restrict by origin
  if (origin !== ALLOWED_ORIGIN) {
    return new Response("Forbidden: origin not allowed", { status: 403 });
  }

  // Restrict by forbidden paths
  for (const forbidden of FORBIDDEN_PATHS) {
    if (path.startsWith(forbidden)) {
      return new Response("Forbidden: path blocked", { status: 403 });
    }
  }

  // Only allow paths under /pay/
  if (!path.startsWith("/pay/")) {
    return new Response("Not Found", { status: 404 });
  }

  // Remove /pay/ from the path to map to VIDEO_BASE_URL
  const relativePath = path.replace("/pay/", "");
  const m3u8Url = `${VIDEO_BASE_URL}${relativePath}${searchParams}`;

  const cache = caches.default;

  // Try to get from cache first
  let response = await cache.match(m3u8Url);
  if (!response) {
    // Fetch from origin if not cached
    response = await fetch(m3u8Url);
    if (!response.ok) {
      return new Response("Video not found", { status: 404 });
    }

    // Cache the response at the edge for long-term
    response = new Response(response.body, response);
    response.headers.set("Cache-Control", `public, max-age=${DEFAULT_CACHE_SECONDS}`);
    event.waitUntil(cache.put(m3u8Url, response.clone()));
  }

  // Return the .m3u8 with correct headers
  const headers = new Headers(response.headers);
  headers.set("Content-Type", "application/vnd.apple.mpegurl");
  headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");

  return new Response(response.body, { headers });
}
