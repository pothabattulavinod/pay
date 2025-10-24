addEventListener("fetch", event => {
  event.respondWith(handleRequest(event, event.request));
});

// Allowed domains
const ALLOWED_ORIGINS = [
  "https://yott.netlify.app",
  "https://pothabattulavinod.github.io"
];

// Worker secret
const WORKER_SECRET = "mySuperSecretWorkerKey";

// Base GitHub raw URL where videos are hosted
const VIDEO_BASE_URL = "https://raw.githubusercontent.com/pothabattulavinod/ga/refs/heads/main/";

// Utility: HMAC-SHA256 signature
async function signMessage(message, key) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2,"0"))
    .join("");
}

// Generate signed URL
async function generateSignedUrl(path, ttlSeconds=600) {
  const expires = Math.floor(Date.now()/1000) + ttlSeconds;
  const sig = await signMessage(`${path}${expires}`, WORKER_SECRET);
  return `${path}?expires=${expires}&sig=${sig}`;
}

// Check origin/referrer
function isAllowedOrigin(request) {
  const origin = request.headers.get("Origin");
  const referer = request.headers.get("Referer");
  return ALLOWED_ORIGINS.includes(origin) || (referer && ALLOWED_ORIGINS.some(o => referer.startsWith(o)));
}

// Handle request
async function handleRequest(event, request) {
  const url = new URL(request.url);
  const path = url.pathname;
  const searchParams = url.searchParams;

  if (!isAllowedOrigin(request)) {
    return new Response("Forbidden: origin not allowed", { status: 403 });
  }

  // Special endpoint to generate signed URL
  if (path === "/generate-signed-url") {
    const videoPath = searchParams.get("video"); // e.g., /pay/aay.m3u8
    if (!videoPath) return new Response("Missing video parameter", { status: 400 });
    const signedUrl = await generateSignedUrl(videoPath, 600);
    return new Response(JSON.stringify({ url: signedUrl }), { headers: { "Content-Type": "application/json" } });
  }

  // Validate signature for video/playlist requests
  const expires = searchParams.get("expires");
  const sig = searchParams.get("sig");
  const now = Math.floor(Date.now()/1000);

  if (!expires || !sig || now > Number(expires)) {
    return new Response("Forbidden: expired or missing signature", { status: 403 });
  }

  const expectedSig = await signMessage(`${path}${expires}`, WORKER_SECRET);
  if (sig !== expectedSig) return new Response("Forbidden: invalid signature", { status: 403 });

  // Map Worker path to GitHub raw URL
  let githubPath = path.replace("/pay/", "");
  const targetUrl = `${VIDEO_BASE_URL}${githubPath}`;

  const response = await fetch(targetUrl, { cf: { cacheEverything: true } });
  if (!response.ok) return new Response("Video not found", { status: 404 });

  const contentType = response.headers.get("content-type") || "";
  let body;

  // If it's a playlist, rewrite nested URLs to go through Worker
  if (contentType.includes("application/vnd.apple.mpegurl")) {
    const text = await response.text();
    body = text.replace(/^(https?:\/\/.*\.(m3u8|ts))$/gm, match => {
      // Remove GitHub base, map to Worker path
      let relative = match.replace(VIDEO_BASE_URL, "");
      return `/pay/${relative}?expires=${expires}&sig=${sig}`;
    });
  } else {
    // TS segment or other file
    body = response.body;
  }

  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGINS[0]);
  headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (path.endsWith(".m3u8")) headers.set("Content-Type", "application/vnd.apple.mpegurl");
  else if (path.endsWith(".ts")) headers.set("Content-Type", "video/MP2T");

  return new Response(body, { headers });
}
