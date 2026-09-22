const fs = require("node:fs/promises");
const path = require("node:path");

const PUBLIC_DIR = path.join(__dirname, "public");
const GALLERIES = {
  landscape: "landscape",
  woodland: "woodland",
  "nature-macro": "nature-macro",
  "other-projects": "other-projects",
};
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
const IGNORED_FILES = new Set(["wetland.jpg"]);

async function getGalleryImages(galleryName) {
  const folders =
    galleryName === "home"
      ? Object.values(GALLERIES)
      : GALLERIES[galleryName]
        ? [GALLERIES[galleryName]]
        : null;

  if (!folders) return null;

  const collections = await Promise.all(
    folders.map(async (folder) => {
      const directory = path.join(PUBLIC_DIR, "assets", folder);
      const files = await fs.readdir(directory, { withFileTypes: true });
      return files
        .filter(
          (file) =>
            file.isFile() &&
            IMAGE_EXTENSIONS.has(path.extname(file.name).toLowerCase()) &&
            !IGNORED_FILES.has(file.name.toLowerCase()),
        )
        .sort((first, second) => first.name.localeCompare(second.name))
        .map((file) => ({
          src: `/assets/${folder}/${encodeURIComponent(file.name)}`,
          alt: path.basename(file.name, path.extname(file.name)).replace(/[_-]/g, " "),
        }));
    }),
  );

  return collections.flat();
}

module.exports = { PUBLIC_DIR, getGalleryImages };
