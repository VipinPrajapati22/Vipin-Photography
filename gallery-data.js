const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const path = require("node:path");

const PUBLIC_DIR = path.join(__dirname, "public");
const GALLERIES = {
  hero: "hero",
  home: "home",
  landscape: "landscape",
  woodland: "woodland",
  "nature-macro": "nature-macro",
  "other-projects": "other-projects",
};
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".tiff", ".tif"]);
const IGNORED_FILES = new Set(["wetland.jpg"]);

// Clean titles and basic locations for photography works
const METADATA_MAP = {
  // ─── Hero Slides & Special Features ───
  "img_20260318_074327_timeburst10": {
    title: "Spiny Orb-Weaver on Web",
    location: "Western Ghats, India",
    category: "Nature Macro"
  },
  "img_20260310_065943_2 (1)": {
    title: "Orange Ladybird with Dewdrops",
    location: "Dehradun, India",
    category: "Nature Macro"
  },

  // ─── Nature Macro ───
  "bee": {
    title: "Honeybee on Flower",
    location: "Western Ghats, India",
    category: "Nature Macro"
  },
  "dragonfly stack (1 of 1)": {
    title: "Dragonfly Detail",
    location: "Uttarakhand, India",
    category: "Nature Macro"
  },
  "dragonfly": {
    title: "Perched Dragonfly",
    location: "Uttarakhand, India",
    category: "Nature Macro"
  },
  "white-ladybug": {
    title: "Ladybird on Leaf",
    location: "Dehradun, India",
    category: "Nature Macro"
  },
  "fire": {
    title: "Night Nature Detail",
    location: "Western Ghats, India",
    category: "Nature Macro"
  },
  "img_20260417_064837_timeburst1": {
    title: "Small Insect on Leaf",
    location: "India",
    category: "Nature Macro"
  },
  "img_20260417_073207_TIMEBURST1": {
    title: "Dewdrops on Flower",
    location: "Dehradun, India",
    category: "Nature Macro"
  },

  // ─── Landscape ───
  "wetland": {
    title: "Highland Wetland at Twilight",
    location: "Ladakh, India",
    category: "Landscape"
  },
  "img_20230909_135112 (1)": {
    title: "Mountain Ridge Sunset",
    location: "Western Ghats, India",
    category: "Landscape"
  },
  "img_20240608_054206 (1) (1)": {
    title: "Mountain Lake View",
    location: "Himalayas, India",
    category: "Landscape"
  },
  "img_20240612_192514_1 - img_20240612_192518_1 (6)": {
    title: "Misty Mountain Evening",
    location: "Dehradun, India",
    category: "Landscape"
  },
  "img_20260317_071032": {
    title: "Mountain Valley Morning",
    location: "Himachal Pradesh, India",
    category: "Landscape"
  },
  "img_20260324_055543_1": {
    title: "First Light on Mountain Ridge",
    location: "Ladakh, India",
    category: "Landscape"
  },
  "img_20260409_064728": {
    title: "Sunrise Over Hills",
    location: "India",
    category: "Landscape"
  },
  "img_20260424_064643_2": {
    title: "River Basin at Dawn",
    location: "Uttarakhand, India",
    category: "Landscape"
  },

  // ─── Woodland ───
  "woodland-path": {
    title: "Forest Path",
    location: "Kerala, India",
    category: "Woodland"
  },
  "sun rize tree (1 of 1)-topaz-denoise": {
    title: "Tree in Morning Mist",
    location: "Rajasthan, India",
    category: "Woodland"
  },
  "img_20240612_193403_1 (1)": {
    title: "Forest Canopy",
    location: "Western Ghats, India",
    category: "Woodland"
  },

  // ─── Other / Projects ───
  "city-at-dusk": {
    title: "City at Dusk",
    location: "India",
    category: "Other / Projects"
  },
  "1685432006286": {
    title: "Natural Texture",
    location: "India",
    category: "Other / Projects"
  },
  "img_20240610_192050": {
    title: "Monsoon Silhouette",
    location: "India",
    category: "Other / Projects"
  }
};

function getMetadataForFile(fileName, folder) {
  const baseName = path.parse(fileName).name.toLowerCase();
  
  for (const [key, meta] of Object.entries(METADATA_MAP)) {
    if (baseName === key.toLowerCase() || baseName.includes(key.toLowerCase())) {
      return meta;
    }
  }

  const cleanTitle = path.basename(fileName, path.extname(fileName))
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b(IMG|\d{8,}|TIMEBURST\d*|\(\d+\))\b/gi, "")
    .trim();

  let folderCategory = "Landscape";
  if (folder === "nature-macro") folderCategory = "Nature Macro";
  else if (folder === "woodland") folderCategory = "Woodland";
  else if (folder === "landscape") folderCategory = "Landscape";
  else if (folder === "other-projects") folderCategory = "Other / Projects";

  return {
    title: cleanTitle.length > 2 ? cleanTitle : `${folderCategory} Photo`,
    location: "India",
    category: folderCategory
  };
}

function thumbSrc(folder, fileName) {
  const base = path.parse(fileName).name;
  const thumbFile = path.join(PUBLIC_DIR, "assets", folder, ".thumbs", `${base}.webp`);
  if (fsSync.existsSync(thumbFile)) {
    return `/assets/${folder}/.thumbs/${encodeURIComponent(base)}.webp`;
  }
  return `/assets/${folder}/${encodeURIComponent(fileName)}`;
}

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
  const meta = getMetadataForFile(fileName, folder);
  return {
    src: `/assets/${folder}/${encodeURIComponent(fileName)}`,
    thumb: thumbSrc(folder, fileName),
    placeholder: readPlaceholder(folder, fileName),
    alt: `${meta.title} by Macro Vipin Photography`,
    title: meta.title,
    location: meta.location,
    category: meta.category,
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
  if (galleryName === "all") {
    const genreFolders = ["nature-macro", "landscape", "woodland", "other-projects"];
    const collections = await Promise.all(
      genreFolders.map(async (folder) => {
        const files = await readImageFiles(path.join(PUBLIC_DIR, "assets", folder));
        return files.map(f => buildEntry(folder, f.name));
      })
    );
    return collections.flat();
  }

  if (galleryName === "home") {
    const homeDir = path.join(PUBLIC_DIR, "assets", "home");
    const homeFiles = await readImageFiles(homeDir);

    if (homeFiles.length > 0) {
      return homeFiles
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }))
        .map(f => buildEntry("home", f.name));
    }

    const fallbackFolders = ["nature-macro", "landscape", "woodland", "other-projects"];
    const collections = await Promise.all(
      fallbackFolders.map(async (folder) => {
        const files = await readImageFiles(path.join(PUBLIC_DIR, "assets", folder));
        return files
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }))
          .map(f => buildEntry(folder, f.name));
      })
    );
    return collections.flat().slice(0, 16);
  }

  const folder = GALLERIES[galleryName];
  if (!folder) return null;

  const files = await readImageFiles(path.join(PUBLIC_DIR, "assets", folder));
  return files
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }))
    .map(f => buildEntry(folder, f.name));
}

module.exports = { PUBLIC_DIR, getGalleryImages };
