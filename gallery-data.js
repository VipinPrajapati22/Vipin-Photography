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

// Rich curated metadata lookup for all photography works
const METADATA_MAP = {
  // ─── Hero Slides & Special Features ───
  "img_20260318_074327_timeburst10": {
    title: "Spiny Orb-Weaver on Web",
    species: "Gasteracantha sp. (Spiny Orb-Weaver)",
    location: "Western Ghats, India",
    year: "2026",
    category: "Nature Macro",
    camera: "100mm 2:1 Macro · Handheld focus stack · Diffused lighting"
  },
  "img_20260310_065943_2 (1)": {
    title: "Dew-Coated Orange Ladybird",
    species: "Coccinellidae (Ladybird Beetle)",
    location: "Dehradun Foothills, India",
    year: "2026",
    category: "Nature Macro",
    camera: "100mm Macro · 24-shot focus stack · Morning dew"
  },

  // ─── Nature Macro ───
  "bee": {
    title: "Wild Honeybee on Morning Blossom",
    species: "Apis cerana indica (Indian Honeybee)",
    location: "Western Ghats, India",
    year: "2024",
    category: "Nature Macro",
    camera: "100mm 2:1 Macro · 18-shot handheld stack · Dual diffused flash"
  },
  "dragonfly stack (1 of 1)": {
    title: "Compound Eye Structure - Dragonfly",
    species: "Anisoptera (Dragonfly compound eyes)",
    location: "Wetlands of Uttarakhand, India",
    year: "2024",
    category: "Nature Macro",
    camera: "Laowa 2.5-5x Ultra Macro · 42-shot stack · Studio rail"
  },
  "dragonfly": {
    title: "Dewdrop Perched Dragonfly",
    species: "Sympetrum sp. (Meadowhawk Dragonfly)",
    location: "Wetlands of Uttarakhand, India",
    year: "2024",
    category: "Nature Macro",
    camera: "90mm Macro · f/7.1 · 1/160s · ISO 100 · Focus bracketed"
  },
  "white-ladybug": {
    title: "Ashy Grey Ladybird on Lichen",
    species: "Oenopia conglobata / Harmonia (Ladybird beetle)",
    location: "Dehradun Valley, India",
    year: "2025",
    category: "Nature Macro",
    camera: "100mm Macro · f/8 · 1/250s · Custom botanical diffuser"
  },
  "fire": {
    title: "Bioluminescent Glow & Insect Geometry",
    species: "Lampyridae (Firefly detail)",
    location: "Western Ghats, India",
    year: "2024",
    category: "Nature Macro",
    camera: "100mm Macro · f/5.6 · 1/50s · Ambient low light"
  },
  "img_20260417_064837_timeburst1": {
    title: "Micro Arthropod on Wet Leaf",
    species: "Micro-fauna detail",
    location: "Rainforest Buffer, India",
    year: "2026",
    category: "Nature Macro",
    camera: "100mm Macro · f/8 · Multi-frame focus stack"
  },
  "img_20260417_073207_timeburst1": {
    title: "Dewdrop Refraction on Flower Setae",
    species: "Botanical micro-structures",
    location: "Dehradun Foothills, India",
    year: "2026",
    category: "Nature Macro",
    camera: "100mm Macro · f/9 · Ambient morning sidelight"
  },

  // ─── Landscape ───
  "wetland": {
    title: "Highland Wetland at Twilight",
    species: "Montane Wetland Ecosystem",
    location: "Ladakh / Western Himalayas, India",
    year: "2024",
    category: "Landscape",
    camera: "24mm f/2.8 · 1/8s · ISO 64 · 3-stop soft GND"
  },
  "img_20230909_135112 (1)": {
    title: "Golden Ridge Mountain Sunset",
    species: "Subtropical Mountain Terrain",
    location: "Western Ghats, India",
    year: "2023",
    category: "Landscape",
    camera: "28mm prime · f/11 · 1/60s · ISO 100"
  },
  "img_20240608_054206 (1) (1)": {
    title: "Alpine Lake Morning Reflections",
    species: "High Altitude Lake Ecosystem",
    location: "Himalayan Valleys, India",
    year: "2024",
    category: "Landscape",
    camera: "24mm wide · f/8 · 1/15s · Circular polariser"
  },
  "img_20240612_192514_1 - img_20240612_192518_1 (6)": {
    title: "Evening Mountain Mist & Valley Glow",
    species: "Montane Valley Atmosphere",
    location: "Dehradun Foothills, India",
    year: "2024",
    category: "Landscape",
    camera: "35mm prime · f/8 · 1/30s · ISO 100"
  },
  "img_20260317_071032": {
    title: "Morning Light Over Mountain Pass",
    species: "Alpine Valley",
    location: "Himachal Pradesh, India",
    year: "2026",
    category: "Landscape",
    camera: "24-70mm at 35mm · f/9 · 1/125s · ISO 100"
  },
  "img_20260324_055543_1": {
    title: "First Light on High Altitude Ridge",
    species: "Himalayan Mountain Range",
    location: "Ladakh Foothills, India",
    year: "2026",
    category: "Landscape",
    camera: "70-200mm at 85mm · f/8 · 1/200s · ISO 64"
  },
  "img_20260409_064728": {
    title: "Sunburst Over Highland Plains",
    species: "Grassland Horizon",
    location: "Northern Plains, India",
    year: "2026",
    category: "Landscape",
    camera: "24mm f/2.8 · f/11 · 1/250s · Golden hour"
  },
  "img_20260424_064643_2": {
    title: "Misty River Basin at Sunrise",
    species: "Riparian Woodland & River",
    location: "Uttarakhand, India",
    year: "2026",
    category: "Landscape",
    camera: "35mm prime · f/8 · 1/80s · ISO 100"
  },

  // ─── Woodland ───
  "woodland-path": {
    title: "Moss-Covered Canopy Path",
    species: "Subtropical Evergreen Forest",
    location: "Silent Valley National Park, Kerala, India",
    year: "2024",
    category: "Woodland",
    camera: "35mm prime · f/9 · 0.6s · Circular polariser"
  },
  "sun rize tree (1 of 1)-topaz-denoise": {
    title: "Solitary Acacia in Morning Mist",
    species: "Acacia nilotica (Gum Arabic Tree)",
    location: "Ranthambore Buffer Zone, India",
    year: "2024",
    category: "Woodland",
    camera: "70-200mm f/4 · 1/120s · ISO 100 · Golden hour dawn"
  },
  "img_20240612_193403_1 (1)": {
    title: "Ancient Forest Canopy & Filtered Light",
    species: "Old-Growth Deciduous Canopy",
    location: "Western Ghats, India",
    year: "2024",
    category: "Woodland",
    camera: "50mm prime · f/5.6 · 1/40s · ISO 200"
  },

  // ─── Other / Projects ───
  "city-at-dusk": {
    title: "Atmospheric Twilight Skyline",
    species: "Urban Geography & Lighting",
    location: "North India",
    year: "2024",
    category: "Other / Projects",
    camera: "50mm prime · f/8 · 4s exposure · Blue hour"
  },
  "1685432006286": {
    title: "Monochrome Minimalist Texture",
    species: "Natural Geometries",
    location: "Himalayan Foothills, India",
    year: "2023",
    category: "Other / Projects",
    camera: "Macro prime · f/11 · Studio natural sidelight"
  },
  "img_20240610_192050": {
    title: "Monsoon Evening Silhouette",
    species: "Atmospheric Twilight Series",
    location: "North India",
    year: "2024",
    category: "Other / Projects",
    camera: "50mm prime · f/4 · 1/60s · Low light"
  }
};

function getMetadataForFile(fileName, folder) {
  const baseName = path.parse(fileName).name.toLowerCase();
  
  // Exact or substring match in metadata map
  for (const [key, meta] of Object.entries(METADATA_MAP)) {
    if (baseName === key.toLowerCase() || baseName.includes(key.toLowerCase())) {
      return meta;
    }
  }

  // Fallback metadata generator
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
    title: cleanTitle.length > 2 ? cleanTitle : `${folderCategory} Study`,
    species: folder === "nature-macro" ? "Macro Fauna & Flora" : "Natural Habitat",
    location: "India",
    year: "2024–2026",
    category: folderCategory,
    camera: "High-resolution Macro Optics & Field Lighting"
  };
}

/**
 * Return WebP thumbnail src path if it exists in .thumbs/, otherwise original.
 */
function thumbSrc(folder, fileName) {
  const base = path.parse(fileName).name;
  const thumbFile = path.join(PUBLIC_DIR, "assets", folder, ".thumbs", `${base}.webp`);
  if (fsSync.existsSync(thumbFile)) {
    return `/assets/${folder}/.thumbs/${encodeURIComponent(base)}.webp`;
  }
  return `/assets/${folder}/${encodeURIComponent(fileName)}`;
}

/**
 * Read tiny base64 blur placeholder
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
  const meta = getMetadataForFile(fileName, folder);
  return {
    src: `/assets/${folder}/${encodeURIComponent(fileName)}`,
    thumb: thumbSrc(folder, fileName),
    placeholder: readPlaceholder(folder, fileName),
    alt: `${meta.title} — ${meta.species} by Macro Vipin Photography`,
    title: meta.title,
    species: meta.species,
    location: meta.location,
    year: meta.year,
    category: meta.category,
    camera: meta.camera,
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
  // Return all works across all 4 genre collections
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

    // Fallback: pull from genre folders
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
