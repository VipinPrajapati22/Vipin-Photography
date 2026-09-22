const fs = require("node:fs");
const fsp = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const { PUBLIC_DIR, getGalleryImages } = require("./gallery-data");

const port = Number(process.env.PORT) || 8000;
const MIME_TYPES = {
  ".avif": "image/avif",
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function sendJson(response, status, data) {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(data));
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const galleryMatch = url.pathname.match(/^\/api\/gallery\/([^/]+)$/);

  if (galleryMatch) {
    const images = await getGalleryImages(decodeURIComponent(galleryMatch[1]));
    if (!images) return sendJson(response, 404, { error: "Gallery not found" });
    return sendJson(response, 200, { images });
  }

  const requestedPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.resolve(PUBLIC_DIR, `.${requestedPath}`);
  if (!filePath.startsWith(`${PUBLIC_DIR}${path.sep}`)) {
    response.writeHead(403).end();
    return;
  }

  try {
    const stats = await fsp.stat(filePath);
    const resolvedFile = stats.isDirectory() ? path.join(filePath, "index.html") : filePath;
    const extension = path.extname(resolvedFile).toLowerCase();
    response.writeHead(200, {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Content-Type": MIME_TYPES[extension] || "application/octet-stream",
    });
    fs.createReadStream(resolvedFile).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

server.listen(port, () => {
  console.log(`Macro Vipin Photography is running at http://localhost:${port}`);
});
