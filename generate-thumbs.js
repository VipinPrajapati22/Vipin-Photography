/**
 * generate-thumbs.js
 * Generates compressed WebP thumbnails + tiny blur placeholders for all gallery images.
 * Uses short slugs (max 40 chars, e.g. "landscape-01.webp", "landscape-01.b64") to avoid Windows path limits.
 *
 * Output structure:
 *   public/assets/<gallery>/.thumbs/<slug>.webp
 *   public/assets/<gallery>/.placeholders/<slug>.b64
 */

const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const ASSETS_DIR = path.join(__dirname, 'public', 'assets');
const GALLERIES  = ['hero', 'home', 'landscape', 'woodland', 'nature-macro', 'other-projects'];

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif']);
const IGNORED_FILES = new Set(['wetland.jpg']);

const THUMB_WIDTH   = 900;
const THUMB_QUALITY = 82;
const PLACEHOLDER_W = 20;

function getImageSlug(folder, index) {
  const pad = String(index + 1).padStart(2, '0');
  return `${folder}-${pad}`;
}

async function processGallery(galleryName) {
  const dir = path.join(ASSETS_DIR, galleryName);
  if (!fs.existsSync(dir)) {
    console.log(`  [skip] ${galleryName} — folder not found`);
    return;
  }

  const thumbDir       = path.join(dir, '.thumbs');
  const placeholderDir = path.join(dir, '.placeholders');

  // Clean old generated files to purge long names
  if (fs.existsSync(thumbDir)) {
    fs.rmSync(thumbDir, { recursive: true, force: true });
  }
  if (fs.existsSync(placeholderDir)) {
    fs.rmSync(placeholderDir, { recursive: true, force: true });
  }

  fs.mkdirSync(thumbDir,       { recursive: true });
  fs.mkdirSync(placeholderDir, { recursive: true });

  const files = fs.readdirSync(dir)
    .filter(f => {
      const ext = path.extname(f).toLowerCase();
      return IMAGE_EXTS.has(ext) && !f.startsWith('.') && !IGNORED_FILES.has(f.toLowerCase());
    })
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  console.log(`\n  📂 ${galleryName} — ${files.length} images`);

  for (let i = 0; i < files.length; i++) {
    const file      = files[i];
    const src       = path.join(dir, file);
    const slug      = getImageSlug(galleryName, i);
    const thumbPath = path.join(thumbDir, `${slug}.webp`);
    const phPath    = path.join(placeholderDir, `${slug}.b64`);

    // ── Thumbnail ──────────────────────────────────────────
    try {
      await sharp(src)
        .rotate()
        .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
        .webp({ quality: THUMB_QUALITY, effort: 4 })
        .toFile(thumbPath);

      const srcSize   = (fs.statSync(src).size / 1024).toFixed(0);
      const thumbSize = (fs.statSync(thumbPath).size / 1024).toFixed(0);
      console.log(`    ✓ ${slug}.webp (${file}) — ${srcSize} KB → ${thumbSize} KB`);
    } catch (err) {
      console.warn(`    ✗ ${file} — ${err.message}`);
    }

    // ── Blur placeholder ───────────────────────────────────
    try {
      const buf = await sharp(src)
        .rotate()
        .resize({ width: PLACEHOLDER_W })
        .blur(2)
        .webp({ quality: 20 })
        .toBuffer();
      const b64 = `data:image/webp;base64,${buf.toString('base64')}`;
      fs.writeFileSync(phPath, b64, 'utf8');
    } catch (err) {
      // placeholder failure is non-critical
    }
  }
}

async function main() {
  console.log('🖼  Generating short-slug WebP thumbnails & blur placeholders…\n');
  for (const g of GALLERIES) {
    await processGallery(g);
  }
  console.log('\n✅  Done.\n');
}

if (require.main === module) {
  main().catch(err => { console.error(err); process.exit(1); });
}

module.exports = { getImageSlug };
