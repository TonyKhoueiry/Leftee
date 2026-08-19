/**
 * Runs before every build (see "prebuild"/"predev" in package.json).
 *
 * 1. DESIGNS — scans public/designs/, creates compressed web copies in
 *    public/designs-web/ (originals stay untouched for printing), and writes
 *    public/designs-manifest.json. Titles come from filenames.
 *
 * 2. SHOP DATA — reads shop-data.xlsx from the repo root:
 *      - "Colors" sheet: Name | Hex | Pantone  → garment colors
 *      - "Cuts" sheet:   File | Label | Left | Top | Right | Bottom | Sizes | Colors
 *        (File = image in public/mockups; Sizes/Colors = comma lists, empty = all)
 *    and writes public/shop-data.json. If the xlsx is missing, the app falls
 *    back to the values in public/config.json.
 */
import {
  readdirSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  rmSync,
} from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const DESIGNS_DIR = 'public/designs';
const WEB_DIR = 'public/designs-web';
const MANIFEST_FILE = 'public/designs-manifest.json';
const MOCKUPS_DIR = 'public/mockups';
// Accepts either format — use whichever you have (Excel or Apple Numbers).
// If both exist, the .xlsx wins.
const DATA_FILES = ['shop-data.xlsx', 'shop-data.numbers'];
const SHOP_FILE = 'public/shop-data.json';

const RASTER_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
const MAX_DIM = 1000; // px, longest side of the web copy

const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'item';

const toTitle = (name) =>
  name
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1));

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;
const normalizeHex = (v) => {
  const s = String(v ?? '').trim().toLowerCase();
  if (!HEX_RE.test(s)) return null;
  return s.startsWith('#') ? s : `#${s}`;
};

const splitList = (v) =>
  String(v ?? '')
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

/* ---------------- 1. Designs: scan + compress ---------------- */

async function buildDesigns() {
  rmSync(WEB_DIR, { recursive: true, force: true });
  mkdirSync(WEB_DIR, { recursive: true });

  let sharp = null;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.warn('! sharp not available — web copies skipped, using originals');
  }

  const designs = [];
  if (existsSync(DESIGNS_DIR)) {
    const files = readdirSync(DESIGNS_DIR).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    );
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      const stem = file.replace(/\.[^.]+$/, '');
      const printSrc = `/designs/${file}`;

      if (ext === '.svg') {
        designs.push({ id: slug(stem), title: toTitle(stem), src: printSrc, printSrc });
      } else if (RASTER_EXTS.has(ext)) {
        let src = printSrc;
        if (sharp) {
          try {
            const webName = `${stem}.webp`;
            await sharp(path.join(DESIGNS_DIR, file))
              .resize(MAX_DIM, MAX_DIM, { fit: 'inside', withoutEnlargement: true })
              .webp({ quality: 82 })
              .toFile(path.join(WEB_DIR, webName));
            src = `/designs-web/${webName}`;
          } catch (err) {
            console.warn(`! could not compress ${file}: ${err.message} — using original`);
          }
        }
        designs.push({ id: slug(stem), title: toTitle(stem), src, printSrc });
      }
    }
  }
  writeFileSync(MANIFEST_FILE, JSON.stringify(designs, null, 2) + '\n');
  console.log(`designs-manifest.json: ${designs.length} design(s)`);
}

/* ---------------- 2. Shop data from Excel ---------------- */

function buildShopData() {
  const dataFile = DATA_FILES.find((f) => existsSync(f));
  if (!dataFile) {
    rmSync(SHOP_FILE, { force: true });
    console.log('shop-data.xlsx / shop-data.numbers not found — using config.json values');
    return;
  }
  const XLSX = require('xlsx');
  const wb = XLSX.readFile(dataFile);
  console.log(`reading shop data from ${dataFile}`);

  // Colors
  const colors = [];
  if (wb.Sheets['Colors']) {
    for (const row of XLSX.utils.sheet_to_json(wb.Sheets['Colors'])) {
      const name = String(row.Name ?? '').trim();
      const hex = normalizeHex(row.Hex);
      const pantone = String(row.Pantone ?? '').trim();
      if (!hex) {
        if (name) console.warn(`! Colors: "${name}" skipped — needs a valid Hex value` +
          (pantone ? ` (Pantone "${pantone}" alone isn't enough; add its hex equivalent)` : ''));
        continue;
      }
      colors.push({ name: name || hex, hex, ...(pantone ? { pantone } : {}) });
    }
  }

  // Cuts
  const cuts = [];
  const mockupFiles = existsSync(MOCKUPS_DIR) ? new Set(readdirSync(MOCKUPS_DIR)) : new Set();
  if (wb.Sheets['Cuts']) {
    for (const row of XLSX.utils.sheet_to_json(wb.Sheets['Cuts'])) {
      const file = String(row.File ?? '').trim();
      if (!file) continue;
      if (!mockupFiles.has(file)) {
        console.warn(`! Cuts: "${file}" not found in ${MOCKUPS_DIR} — row skipped`);
        continue;
      }
      const num = (v, fallback) => (Number.isFinite(Number(v)) && v !== '' && v != null ? Number(v) : fallback);
      cuts.push({
        id: slug(file.replace(/\.[^.]+$/, '')),
        label: String(row.Label ?? '').trim() || toTitle(file.replace(/\.[^.]+$/, '')),
        image: `/mockups/${file}`,
        printArea: {
          left: num(row.Left, 30),
          top: num(row.Top, 34),
          right: num(row.Right, 70),
          bottom: num(row.Bottom, 76),
        },
        sizes: splitList(row.Sizes),
        colors: splitList(row.Colors),
        price: num(row.Price, null),
      });
    }
  }

  writeFileSync(SHOP_FILE, JSON.stringify({ colors, cuts }, null, 2) + '\n');
  console.log(`shop-data.json: ${colors.length} color(s), ${cuts.length} cut(s)`);
}

await buildDesigns();
try {
  buildShopData();
} catch (err) {
  // Never let a malformed spreadsheet break the deploy — the app falls back
  // to the last generated data / config.json instead.
  console.warn(`! could not read shop data (${err.message}) — using previous/fallback values`);
}
