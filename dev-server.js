const fs   = require("node:fs");
const fsp  = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const sharp = require("sharp");
const { PUBLIC_DIR, getGalleryImages } = require("./gallery-data");

const port = Number(process.env.PORT) || 8000;

const MIME_TYPES = {
  ".avif": "image/avif",
  ".css":  "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg":  "image/jpeg",
  ".js":   "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png":  "image/png",
  ".svg":  "image/svg+xml",
  ".txt":  "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".xml":  "application/xml; charset=utf-8",
};

// Image extensions that get long-lived browser cache (1 year)
const IMAGE_EXTS   = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".svg"]);
// Image extensions we watch and auto-convert
const WATCH_EXTS   = new Set([".jpg", ".jpeg", ".png", ".tiff", ".tif", ".webp"]);
const GALLERIES    = ["hero", "home", "landscape", "woodland", "nature-macro", "other-projects"];
const ASSETS_DIR   = path.join(PUBLIC_DIR, "assets");

/* ─── Auto-thumbnail generator ─────────────────────────────────── */
// Debounce map: filename → timeout, avoids double-processing on copy
const pending = new Map();

async function generateThumb(galleryFolder, fileName) {
  const ext = path.extname(fileName).toLowerCase();
  if (!WATCH_EXTS.has(ext)) return;

  const src          = path.join(ASSETS_DIR, galleryFolder, fileName);
  const base         = path.parse(fileName).name;
  const thumbDir     = path.join(ASSETS_DIR, galleryFolder, ".thumbs");
  const phDir        = path.join(ASSETS_DIR, galleryFolder, ".placeholders");
  const thumbPath    = path.join(thumbDir, `${base}.webp`);
  const phPath       = path.join(phDir,    `${base}.b64`);

  // Wait until the file is fully written (copy in progress guard)
  await new Promise(r => setTimeout(r, 800));

  // Verify file still exists and is readable
  try { await fsp.access(src); } catch { return; }

  fs.mkdirSync(thumbDir, { recursive: true });
  fs.mkdirSync(phDir,    { recursive: true });

  try {
    // Generate WebP thumbnail (900px wide, quality 82)
    await sharp(src)
      .rotate()
      .resize({ width: 900, withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toFile(thumbPath);

    // Generate tiny blur placeholder (20px wide, base64)
    const buf = await sharp(src)
      .rotate()
      .resize({ width: 20 })
      .blur(2)
      .webp({ quality: 20 })
      .toBuffer();
    fs.writeFileSync(phPath, `data:image/webp;base64,${buf.toString("base64")}`, "utf8");

    const srcKB   = Math.round(fs.statSync(src).size / 1024);
    const thumbKB = Math.round(fs.statSync(thumbPath).size / 1024);
    console.log(`  📷 [auto] ${fileName}  ${srcKB} KB → ${thumbKB} KB WebP thumb`);
  } catch (err) {
    console.warn(`  ⚠️  [auto] Could not process ${fileName}: ${err.message}`);
  }
}

function watchGallery(galleryFolder) {
  const dir = path.join(ASSETS_DIR, galleryFolder);
  if (!fs.existsSync(dir)) return;

  fs.watch(dir, (eventType, fileName) => {
    if (!fileName) return;
    const ext = path.extname(fileName).toLowerCase();
    if (!WATCH_EXTS.has(ext)) return;
    // Skip files inside .thumbs / .placeholders subdirs (watch is shallow)
    if (fileName.startsWith(".")) return;

    // Debounce — many OSes fire multiple events per file drop
    const key = `${galleryFolder}/${fileName}`;
    clearTimeout(pending.get(key));
    pending.set(key, setTimeout(() => {
      pending.delete(key);
      generateThumb(galleryFolder, fileName);
    }, 300));
  });

  console.log(`  👁  Watching ${galleryFolder}/`);
}

/* ─── HTTP server ───────────────────────────────────────────────── */
function sendJson(response, status, data) {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type":  "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(data));
}

const server = http.createServer(async (request, response) => {
  const url          = new URL(request.url, `http://${request.headers.host}`);
  const galleryMatch = url.pathname.match(/^\/api\/gallery\/([^/]+)$/);

  if (galleryMatch) {
    const images = await getGalleryImages(decodeURIComponent(galleryMatch[1]));
    if (!images) return sendJson(response, 404, { error: "Gallery not found" });
    return sendJson(response, 200, { images });
  }

  const requestedPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath      = path.resolve(PUBLIC_DIR, `.${requestedPath}`);
  if (!filePath.startsWith(`${PUBLIC_DIR}${path.sep}`)) {
    response.writeHead(403).end();
    return;
  }

  try {
    const stats       = await fsp.stat(filePath);
    const resolvedFile = stats.isDirectory() ? path.join(filePath, "index.html") : filePath;
    const extension   = path.extname(resolvedFile).toLowerCase();

    // Images get long-lived cache (1 year). HTML/JS/CSS always fresh in dev.
    const cacheControl = IMAGE_EXTS.has(extension)
      ? "public, max-age=31536000, immutable"
      : "no-store, no-cache, must-revalidate";

    response.writeHead(200, {
      "Cache-Control": cacheControl,
      "Content-Type":  MIME_TYPES[extension] || "application/octet-stream",
    });
    fs.createReadStream(resolvedFile).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

server.listen(port, () => {
  console.log(`\n🌿 Macro Vipin Photography → http://localhost:${port}\n`);
  console.log("🖼  Auto-thumbnail watcher active:");
  GALLERIES.forEach(watchGallery);
  console.log("\n  Drop any JPG/PNG into an assets folder and it will be\n  auto-converted to WebP instantly.\n");
});
