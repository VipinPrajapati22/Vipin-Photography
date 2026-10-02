/**
 * generate-thumbs.js
 * Generates compressed WebP thumbnails + tiny blur placeholders for all gallery images.
 * Run once: node generate-thumbs.js
 * Re-run whenever you add new photos.
 *
 * Output structure:
 *   public/assets/<gallery>/.thumbs/<filename>.webp   (grid thumbnail ~800×533, ~50-150 KB)
 *   public/assets/<gallery>/.placeholders/<filename>.b64  (20px wide base64 blur placeholder)
 */

const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const ASSETS_DIR = path.join(__dirname, 'public', 'assets');
const GALLERIES  = ['home', 'landscape', 'woodland', 'nature-macro', 'other-projects'];

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif']);

const THUMB_WIDTH   = 900;   // grid thumbnail width (px)
const THUMB_QUALITY = 82;    // WebP quality (0-100) — 82 is visually lossless for grids
const PLACEHOLDER_W = 20;    // tiny blur placeholder width (px)

async function processGallery(galleryName) {
  const dir = path.join(ASSETS_DIR, galleryName);
  if (!fs.existsSync(dir)) {
    console.log(`  [skip] ${galleryName} — folder not found`);
    return;
  }

  const thumbDir       = path.join(dir, '.thumbs');
  const placeholderDir = path.join(dir, '.placeholders');
  fs.mkdirSync(thumbDir,       { recursive: true });
  fs.mkdirSync(placeholderDir, { recursive: true });

  const files = fs.readdirSync(dir).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return IMAGE_EXTS.has(ext) && !f.startsWith('.');
  });

  console.log(`\n  📂 ${galleryName} — ${files.length} images`);

  for (const file of files) {
    const src       = path.join(dir, file);
    const base      = path.parse(file).name;
    const thumbPath = path.join(thumbDir, `${base}.webp`);
    const phPath    = path.join(placeholderDir, `${base}.b64`);

    // ── Thumbnail ──────────────────────────────────────────
    if (!fs.existsSync(thumbPath)) {
      try {
        await sharp(src)
          .rotate()                          // auto-orient from EXIF
          .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
          .webp({ quality: THUMB_QUALITY, effort: 4 })
          .toFile(thumbPath);

        const srcSize   = (fs.statSync(src).size / 1024).toFixed(0);
        const thumbSize = (fs.statSync(thumbPath).size / 1024).toFixed(0);
        console.log(`    ✓ ${file} — ${srcSize} KB → ${thumbSize} KB WebP`);
      } catch (err) {
        console.warn(`    ✗ ${file} — ${err.message}`);
      }
    } else {
      console.log(`    · ${file} — thumb exists, skipping`);
    }

    // ── Blur placeholder ───────────────────────────────────
    if (!fs.existsSync(phPath)) {
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
}

async function main() {
  console.log('🖼  Generating WebP thumbnails & blur placeholders…\n');
  for (const g of GALLERIES) {
    await processGallery(g);
  }
  console.log('\n✅  Done. Restart your dev server to serve the new thumbnails.\n');
}

main().catch(err => { console.error(err); process.exit(1); });
