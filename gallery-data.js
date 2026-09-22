const fs = require("node:fs/promises");
const path = require("node:path");

const PUBLIC_DIR = path.join(__dirname, "public");
const GALLERIES = {
  home: "home",
  landscape: "landscape",
  woodland: "woodland",
  "nature-macro": "nature-macro",
  "other-projects": "other-projects",
};
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
const IGNORED_FILES = new Set(["wetland.jpg"]);

async function getGalleryImages(galleryName) {
  if (galleryName === "home") {
    const homeDir = path.join(PUBLIC_DIR, "assets", "home");
    try {
      const files = await fs.readdir(homeDir, { withFileTypes: true });
      const homeImages = files
        .filter(
          (file) =>
            file.isFile() &&
            IMAGE_EXTENSIONS.has(path.extname(file.name).toLowerCase()) &&
            !IGNORED_FILES.has(file.name.toLowerCase()),
        )
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }))
        .map((file) => ({
          src: `/assets/home/${encodeURIComponent(file.name)}`,
          alt: path.basename(file.name, path.extname(file.name)).replace(/[_-]/g, " "),
        }));

      if (homeImages.length > 0) {
        return homeImages.slice(0, 15);
      }
    } catch {
      // folder empty or missing
    }

    const fallbackFolders = ["landscape", "woodland", "nature-macro", "other-projects"];
    const collections = await Promise.all(
      fallbackFolders.map(async (folder) => {
        const directory = path.join(PUBLIC_DIR, "assets", folder);
        try {
          const files = await fs.readdir(directory, { withFileTypes: true });
          return files
            .filter(
              (file) =>
                file.isFile() &&
                IMAGE_EXTENSIONS.has(path.extname(file.name).toLowerCase()) &&
                !IGNORED_FILES.has(file.name.toLowerCase()),
            )
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }))
            .map((file) => ({
              src: `/assets/${folder}/${encodeURIComponent(file.name)}`,
              alt: path.basename(file.name, path.extname(file.name)).replace(/[_-]/g, " "),
            }));
        } catch {
          return [];
        }
      }),
    );

    return collections.flat().slice(0, 15);
  }

  const folder = GALLERIES[galleryName];
  if (!folder) return null;

  const directory = path.join(PUBLIC_DIR, "assets", folder);
  try {
    const files = await fs.readdir(directory, { withFileTypes: true });
    return files
      .filter(
        (file) =>
          file.isFile() &&
          IMAGE_EXTENSIONS.has(path.extname(file.name).toLowerCase()) &&
          !IGNORED_FILES.has(file.name.toLowerCase()),
      )
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }))
      .map((file) => ({
        src: `/assets/${folder}/${encodeURIComponent(file.name)}`,
        alt: path.basename(file.name, path.extname(file.name)).replace(/[_-]/g, " "),
      }));
  } catch {
    return [];
  }
}

module.exports = { PUBLIC_DIR, getGalleryImages };
