const fs   = require("node:fs/promises");
const fsSync = require("node:fs");
const path = require("node:path");

const PUBLIC_DIR = path.join(__dirname, "public");
const GALLERIES  = {
  home:             "home",
  landscape:        "landscape",
  woodland:         "woodland",
  "nature-macro":   "nature-macro",
  "other-projects": "other-projects",
};
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".tiff"]);
const IGNORED_FILES    = new Set(["wetland.jpg"]);

/**
 * For a given original file path, return the WebP thumbnail src path if it
 * exists in .thumbs/, otherwise fall back to the original.
 */
function thumbSrc(folder, fileName) {
  const base      = path.parse(fileName).name;
  const thumbFile = path.join(PUBLIC_DIR, "assets", folder, ".thumbs", `${base}.webp`);
  if (fsSync.existsSync(thumbFile)) {
    return `/assets/${folder}/.thumbs/${encodeURIComponent(base)}.webp`;
  }
  return `/assets/${folder}/${encodeURIComponent(fileName)}`;
}

/**
 * Read the tiny base64 blur placeholder for a file, or return null.
 */
function readPlaceholder(folder, fileName) {
  const base = path.parse(fileName).name;
  const phFile = path.join(PUBLIC_DIR, "assets", folder, ".placeholders", `${base}.b64`);
  try {
    return fsSync.readFileSync(phFile, "utf8").trim();
  } catch {
    return null;
  }
}

function buildEntry(folder, fileName) {
  return {
    src:         `/assets/${folder}/${encodeURIComponent(fileName)}`,   // full-res for lightbox
    thumb:       thumbSrc(folder, fileName),                            // WebP thumb for grid
    placeholder: readPlaceholder(folder, fileName),                     // tiny blur data-uri
    alt:         path.basename(fileName, path.extname(fileName)).replace(/[_-]/g, " "),
  };
}

async function readImageFiles(dirPath) {
  try {
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    return files.filter(
      f => f.isFile() &&
           IMAGE_EXTENSIONS.has(path.extname(f.name).toLowerCase()) &&
           !IGNORED_FILES.has(f.name.toLowerCase())
    );
  } catch {
    return [];
  }
}

async function getGalleryImages(galleryName) {
  if (galleryName === "home") {
    const homeDir = path.join(PUBLIC_DIR, "assets", "home");
    const homeFiles = await readImageFiles(homeDir);

    if (homeFiles.length > 0) {
      return homeFiles
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }))
        .slice(0, 15)
        .map(f => buildEntry("home", f.name));
    }

    // Fallback: pull a few from each gallery
    const fallbackFolders = ["landscape", "woodland", "nature-macro", "other-projects"];
    const collections = await Promise.all(
      fallbackFolders.map(async (folder) => {
        const files = await readImageFiles(path.join(PUBLIC_DIR, "assets", folder));
        return files
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }))
          .map(f => buildEntry(folder, f.name));
      })
    );
    return collections.flat().slice(0, 15);
  }

  const folder = GALLERIES[galleryName];
  if (!folder) return null;

  const files = await readImageFiles(path.join(PUBLIC_DIR, "assets", folder));
  return files
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }))
    .map(f => buildEntry(folder, f.name));
}

module.exports = { PUBLIC_DIR, getGalleryImages };
