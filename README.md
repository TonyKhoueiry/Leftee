# T-Shirt Studio

A responsive React app for designing custom t-shirts — modern, minimalist, earth-tone design — with an admin panel to manage everything without touching code.

## Theme

All colors and fonts are defined in one place: the `@theme` block in `src/index.css` (cream, sand, clay/terracotta, olive, ink, stone + the Fraunces/Inter font pair). Change a hex value there and the whole app follows. Garment colors offered to customers are separate — those live in `config.json` like everything else.

## Shopify (later)

`config.json` has an `orderUrl` field. Leave it empty and the Order button shows a summary. Set it to any URL (e.g. your Shopify product page) and the button sends the customer there with their choices attached (`?cut=…&color=…&size=…&design=…`). That's the lightweight integration; a full "add to cart with print file" flow can come later via Shopify's API.

Everything the shop offers lives in one file: **`public/config.json`** — cuts (each with its own mockup image and print area), garment colors, sizes, and the design library. The app reads it at load time. Change the file, the shop changes. The admin panel at `/admin` is simply a friendly editor for this file.

## 1. Add your own mockup images

Replace the placeholder shirts with your PNGs (transparent background, ideally a white or light-gray shirt — the app tints them with the chosen garment color):

1. Copy your PNGs into `public/mockups/` (e.g. `long-sleeve.png`).
2. In `public/config.json`, add or edit an entry under `"cuts"`:

```json
{
  "id": "long-sleeve",
  "label": "Long Sleeve",
  "image": "/mockups/long-sleeve.png",
  "printArea": { "left": 30, "top": 34, "right": 70, "bottom": 76 }
}
```

`printArea` is the zone (in % of the canvas: 0 = left/top edge, 100 = right/bottom edge) where designs can be dragged. Tweak per cut.

You can also point `"image"` at any URL, including a GitHub raw link (`https://raw.githubusercontent.com/you/repo/main/file.png`) — but copying files into the repo is better: same hosting, no cross-site requests.

## 2. Add designs

Drop files into `public/designs/` (or upload via the admin panel) and list them under `"designs"`:

```json
{ "id": "logo", "title": "My Logo", "src": "/designs/logo.png" }
```

Supported formats: **PNG** (transparency respected), **JPG**, and **SVG** (sanitized and inlined, so `currentColor` fills are recolorable). Customers can also paste their own image URL or SVG code unless you set `"allowCustomerUploads": false`.

## 3. Publish free (GitHub + Netlify)

The admin panel needs the site connected to GitHub, so use this flow instead of drag-and-drop:

1. Put this folder in a GitHub repository (github.com → New repository → upload these files, or `git push` if you use git).
2. Go to https://app.netlify.com (free account) → **Add new site → Import an existing project** → pick your repo.
3. Build settings (usually auto-detected): build command `npm run build`, publish directory `dist`.
4. Deploy. You get a free HTTPS URL like `your-site.netlify.app`.

From now on, **every change pushed to GitHub republishes the site automatically** — including changes made through the admin panel.

## 4. Turn on the admin panel (/admin)

The admin uses Decap CMS (free, open source). It needs a login service; Netlify's old one (Identity) is deprecated, and DecapBridge is the free replacement:

1. Create a free account at https://decapbridge.com and connect your GitHub repo.
2. It gives you a `backend:` config block. Paste it over the `backend:` block in `public/admin/config.yml` (replacing the placeholder repo/site values).
3. Invite yourself as a user in DecapBridge, commit & push.
4. Open `your-site.netlify.app/admin` and log in.

You can now edit colors, sizes, cuts, print areas, and upload mockup/design images from any browser. Each save commits to GitHub and Netlify republishes in ~1 minute.

Until you set that up, the "admin panel" is simply editing `public/config.json` on github.com (pencil icon → commit) — Netlify republishes automatically.

## Develop locally

Requires Node.js (https://nodejs.org):

```bash
npm install     # once
npm run dev     # live preview at localhost:5173
npm run build   # regenerate dist/
```

## Project layout

```
public/
  config.json      ← everything the shop offers (the file the admin edits)
  mockups/         ← shirt mockup PNGs (transparent)
  designs/         ← design library files (png/jpg/svg)
  uploads/         ← images uploaded via the admin panel
  admin/           ← Decap CMS admin panel
src/
  App.jsx                    ← state + page layout
  components/ShirtPreview.jsx ← mockup rendering, color tint, drag & drop
  components/DesignArt.jsx    ← renders png/jpg/svg designs safely
  components/Modal.jsx
  lib/useConfig.js            ← loads config.json
  lib/media.js                ← SVG sanitizing/fetching
```

## Roadmap ideas (all fit this structure)

- Real checkout: point the Order button at a backend, or repurpose it to a Shopify "Buy" link.
- Front/back printing: add a `side` toggle and a second image per cut.
- Resize/rotate designs: extend the position state `{x, y}` with `{scale, rotation}`.
- Customer file upload (from disk): needs file storage — Supabase's free tier is the natural next step, and the moment to add order storage and accounts too.
