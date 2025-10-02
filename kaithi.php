<?php
// --- CONFIG --------------------------------------------------
// Change these as needed
$correctPassword = "Kaithi123";
$videoUrl = "https://pothabattulavinod.github.io/wp/kaithi"; // set to direct .mp4/.webm if available to use <video>
// ------------------------------------------------------------

$showVideo = false;
$error = "";

// Allow direct access via ?direct=1 (use with caution)
if (isset($_GET['direct']) && $_GET['direct'] === '1') {
    $showVideo = true;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $entered = $_POST['password'] ?? '';
    if ($entered === $correctPassword) {
        $showVideo = true;
    } else {
        $error = "Incorrect password";
    }
}

// Helper: determine if URL looks like a raw video file
function is_raw_video($url) {
    $ext = strtolower(pathinfo(parse_url($url, PHP_URL_PATH), PATHINFO_EXTENSION));
    return in_array($ext, ['mp4','webm','ogg','ogv','m4v']);
}
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Kaithi — YOTT</title>
<style>
:root{--bg:#0b0f1a;--accent:#06b6d4;--muted:#9aa4b2;--radius:8px;--text-light:#e6eef6}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--text-light);font-family:'Inter',system-ui,-apple-system,'Segoe UI',Roboto,Arial}
.wrap{max-width:1200px;margin:24px auto;padding:16px;display:flex;flex-direction:column;gap:18px}
header{display:flex;align-items:center;justify-content:space-between;padding:12px;background:rgba(0,0,0,.45);border-radius:8px}
.logo{display:flex;gap:10px;align-items:center;font-weight:700}
.home-icon{display:grid;place-items:center;width:44px;height:44px;border-radius:8px;background:linear-gradient(135deg,#06b6d4,#4f46e5)}
.video-container{position:relative;width:100%;padding-top:56.25%;border-radius:8px;overflow:hidden;background:#000}
.video-container iframe, .video-container video{position:absolute;top:0;left:0;width:100%;height:100%;border:0}
#passwordForm{display:flex;flex-direction:column;gap:10px;align-items:center;padding:20px}
#passwordForm input{padding:10px;border-radius:6px;border:none;font-size:16px;width:100%;max-width:360px}
#passwordForm button{padding:10px 14px;border-radius:6px;border:none;background:var(--accent);color:#fff;font-size:16px;cursor:pointer}
.movie-info{padding:16px;background:rgba(0,0,0,.45);border-radius:8px;display:flex;flex-direction:column;gap:8px}
.movie-info .direct-links{display:flex;gap:12px;flex-wrap:wrap}
.movie-info a{color:var(--accent)}
.error{color:#ff6b6b}
@media(max-width:600px){ .wrap{padding:10px} }
</style>
</head>
<body>
<header>
  <div class="logo"><div class="home-icon" aria-hidden="true">Y</div><div>YOTT</div></div>
  <div><a href="index.html" style="color:var(--muted);text-decoration:none">index</a></div>
</header>

<div class="wrap">
  <div class="video-container">
    <?php if ($showVideo): ?>
        <?php if (is_raw_video($videoUrl)): ?>
            <!-- Use native HTML5 video when the URL is a raw video file -->
            <video controls autoplay playsinline muted>
                <source src="<?php echo htmlspecialchars($videoUrl); ?>" type="<?php echo htmlspecialchars(mime_content_type(parse_url($videoUrl, PHP_URL_PATH)) ?: 'video/mp4'); ?>">
                Your browser does not support the video element.
            </video>
        <?php else: ?>
            <!-- Fall back to embedding the external page in an iframe -->
            <iframe src="<?php echo htmlspecialchars($videoUrl); ?>" allowfullscreen allow="autoplay; encrypted-media" loading="lazy" referrerpolicy="no-referrer"></iframe>
        <?php endif; ?>
    <?php else: ?>
        <form id="passwordForm" method="POST" autocomplete="off" novalidate>
            <input type="password" name="password" placeholder="Enter password" required />
            <button type="submit">Submit</button>
            <?php if ($error): ?>
                <div class="error"><?php echo htmlspecialchars($error); ?></div>
            <?php endif; ?>
        </form>
    <?php endif; ?>
  </div>

  <div class="movie-info">
    <h1>Kaithi <span style="background:var(--accent);color:#fff;padding:4px 8px;border-radius:6px;font-size:12px;margin-left:8px">YOTT</span></h1>
    <div class="tags" style="color:var(--muted)">Telugu / 2019 / Action / Thriller</div>
    <div class="cast-director" style="color:var(--muted)">Cast: Karthi, Narain, Arjun Das — Director: Lokesh Kanagaraj</div>
    <div class="synopsis" style="color:var(--muted)">Dilli, an ex-convict, endeavours to meet his daughter for the first time after leaving prison. His attempts are interrupted by a drug raid planned by Inspector Bejoy.</div>

    <div class="direct-links">
      <!-- Open the source in a NEW TAB (this will open the raw HTML page) -->
      <a href="<?php echo htmlspecialchars($videoUrl); ?>" target="_blank" rel="noopener noreferrer">Open source (new tab)</a>

      <!-- Open the embedded player here (bypasses password) -->
      <a href="<?php echo htmlspecialchars($_SERVER['PHP_SELF']); ?>?direct=1">Open embedded (same page)</a>

      <!-- If the source is a direct video file, show a direct download link -->
      <?php if (is_raw_video($videoUrl)): ?>
        <a href="<?php echo htmlspecialchars($videoUrl); ?>" download>Download video</a>
      <?php endif; ?>
    </div>
  </div>
</div>

</body>
</html>
