"""Local portfolio server with dynamic gallery-folder discovery."""

from __future__ import annotations

import json
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import quote, unquote, urlparse


ROOT = Path(__file__).resolve().parent
PUBLIC_ASSETS = ROOT / "public" / "assets"
GALLERIES = {
    "home": PUBLIC_ASSETS / "home",
    "landscape": PUBLIC_ASSETS / "landscape",
    "woodland": PUBLIC_ASSETS / "woodland",
    "nature-macro": PUBLIC_ASSETS / "nature-macro",
    "other-projects": PUBLIC_ASSETS / "other-projects",
}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".avif"}
IGNORED_FILES = {"wetland.jpg"}


class PortfolioHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / "public"), **kwargs)

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
            home_dir = GALLERIES["home"]
            if home_dir.exists() and any(f.is_file() and f.suffix.lower() in IMAGE_EXTENSIONS for f in home_dir.iterdir()):
                directories = [home_dir]
            else:
                directories = [
                    GALLERIES["landscape"],
                    GALLERIES["woodland"],
                    GALLERIES["nature-macro"],
                    GALLERIES["other-projects"],
                ]
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
