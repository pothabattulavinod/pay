addEventListener("fetch", event => {
  event.respondWith(handleRequest(event, event.request))
})

const WORKER_SECRET = "mySuperSecretWorkerKey";
const VIDEO_BASE_URL = "https://pothabattulavinod.github.io/pay/";

// Generate HMAC signature
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
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2,"0")).join("");
}

// Generate signed URL
async function generateSignedUrl(path, ttlSeconds=600) {
  const expires = Math.floor(Date.now()/1000) + ttlSeconds;
  const sig = await signMessage(`${path}${expires}`, WORKER_SECRET);
  return `${path}?expires=${expires}&sig=${sig}`;
}

// Allow multiple domains
function isAllowedOrigin(request) {
  const allowedOrigins = [
    "https://yott.netlify.app",
    "http://pothabattulavinod.github.io"
  ];
  const origin = request.headers.get("Origin");
  const referer = request.headers.get("Referer");
  
  if (origin && allowedOrigins.includes(origin)) return true;
  if (referer) {
    for (const allowed of allowedOrigins) {
      if (referer.startsWith(allowed)) return true;
    }
  }
  return false;
}

async function handleRequest(event, request) {
  const url = new URL(request.url);
  const path = url.pathname;
  const searchParams = url.searchParams;

  // Only allow requests from allowed domains
  if (!isAllowedOrigin(request)) {
    return new Response("Forbidden: origin not allowed", { status: 403 });
  }

  // Endpoint to generate signed URL
  if (path === "/generate-signed-url") {
    const videoPath = searchParams.get("video"); // e.g., /pay/aay.m3u8
    if (!videoPath) return new Response("Missing video parameter", { status: 400 });
    const signedUrl = await generateSignedUrl(videoPath, 600);
    return new Response(JSON.stringify({ url: signedUrl }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  // Validate signed URL
  const expires = searchParams.get("expires");
  const sig = searchParams.get("sig");
  const now = Math.floor(Date.now()/1000);
  if (!expires || !sig || now > Number(expires)) {
    return new Response("Forbidden: expired or missing signature", { status: 403 });
  }
  const expectedSig = await signMessage(`${path}${expires}`, WORKER_SECRET);
  if (sig !== expectedSig) return new Response("Forbidden: invalid signature", { status: 403 });

  // Fetch video from GitHub Pages
  const videoUrl = `${VIDEO_BASE_URL}${path.replace("/pay/","")}?${searchParams.toString()}`;
  const response = await fetch(videoUrl, { cf: { cacheEverything: true } });

  // Rewrite .ts segments in .m3u8 playlists
  let body = response.body;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/vnd.apple.mpegurl")) {
    const text = await response.text();
    const proxiedText = text.replace(/(.*\.ts)/g, match => `${match}?expires=${expires}&sig=${sig}`);
    body = proxiedText;
  }

  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*"); // allow cross-origin for your allowed domains
  headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (path.endsWith(".m3u8")) headers.set("Content-Type", "application/vnd.apple.mpegurl");
  else if (path.endsWith(".ts")) headers.set("Content-Type", "video/MP2T");

  return new Response(body, { headers });
}
