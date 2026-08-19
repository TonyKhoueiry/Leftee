/**
 * Scans public/designs/ and writes public/designs-manifest.json.
 * Runs automatically before every build (see "prebuild" in package.json),
 * so uploading a design file to GitHub is all it takes — Netlify rebuilds
 * and the design appears in the app. Titles come from the filenames.
 */
import { readdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const DESIGNS_DIR = 'public/designs';
const OUT_FILE = 'public/designs-manifest.json';
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);

const toTitle = (name) =>
  name
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1));

let designs = [];
if (existsSync(DESIGNS_DIR)) {
  designs = readdirSync(DESIGNS_DIR)
    .filter((file) => IMAGE_EXTS.has(path.extname(file).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    .map((file) => {
      const stem = file.replace(/\.[^.]+$/, '');
      return {
        id: stem.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        title: toTitle(stem),
        src: `/designs/${file}`,
      };
    });
}

writeFileSync(OUT_FILE, JSON.stringify(designs, null, 2) + '\n');
console.log(`designs-manifest.json written: ${designs.length} design(s)`);
