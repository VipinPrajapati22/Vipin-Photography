"""Local portfolio server with dynamic gallery-folder discovery."""

from __future__ import annotations

import json
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import quote, unquote, urlparse


ROOT = Path(__file__).resolve().parent
GALLERIES = {
    "landscape": ROOT / "assets" / "landscape",
    "woodland": ROOT / "assets" / "woodland",
    "nature-macro": ROOT / "assets" / "nature-macro",
    "other-projects": ROOT / "assets" / "other-projects",
}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".avif"}
IGNORED_FILES = {"wetland.jpg"}


class PortfolioHandler(SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        # Local development should always reflect the current HTML and JavaScript.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path.startswith("/api/gallery/"):
            self.send_gallery(path.removeprefix("/api/gallery/"))
            return
        super().do_GET()

    def send_gallery(self, gallery_name: str) -> None:
        gallery_name = unquote(gallery_name)
        if gallery_name == "home":
            directories = GALLERIES.values()
        elif gallery_name in GALLERIES:
            directories = [GALLERIES[gallery_name]]
        else:
            self.send_error(HTTPStatus.NOT_FOUND, "Gallery not found")
            return

        images = [
            {
                "src": f"/assets/{directory.name}/{quote(file.name)}",
                "alt": file.stem.replace("_", " ").replace("-", " "),
            }
            for directory in directories
            for file in sorted(directory.iterdir(), key=lambda item: item.name.lower())
            if file.is_file() and file.suffix.lower() in IMAGE_EXTENSIONS and file.name.lower() not in IGNORED_FILES
        ]
        body = json.dumps({"images": images}).encode("utf-8")
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("", 8000), PortfolioHandler)
    print("Portfolio available at http://localhost:8000")
    server.serve_forever()
