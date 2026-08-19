import { useEffect, useState } from 'react';

const jsonOrNull = (res) => (res.ok ? res.json() : null);

/**
 * Loads and merges three sources:
 * - /config.json          — shop settings (name, orderUrl, sizes, fallbacks)
 * - /shop-data.json       — generated from shop-data.xlsx (colors, cuts)
 * - /designs-manifest.json — generated from the files in public/designs/
 *
 * Result shape:
 *   colors: [{ name, hex, pantone? }]
 *   cuts:   [{ id, label, image, printArea, sizes: [], colors: [] }]
 *   designs:[{ id, title, src, printSrc? }]
 */
export function useConfig() {
  const [config, setConfig] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch('/config.json', { cache: 'no-store' }).then((res) => {
        if (!res.ok) throw new Error(`Could not load config.json (HTTP ${res.status})`);
        return res.json();
      }),
      fetch('/shop-data.json', { cache: 'no-store' }).then(jsonOrNull).catch(() => null),
      fetch('/designs-manifest.json', { cache: 'no-store' }).then(jsonOrNull).catch(() => null),
    ])
      .then(([cfg, shop, manifest]) => {
        // Colors: Excel wins; config.json strings are the fallback
        const colors =
          shop?.colors?.length
            ? shop.colors
            : (cfg.colors ?? []).map((c) =>
                typeof c === 'string' ? { name: c, hex: c } : c
              );

        // Cuts: Excel wins; config.json cuts are the fallback
        const cuts = (shop?.cuts?.length ? shop.cuts : cfg.cuts ?? []).map((cut) => ({
          sizes: [],
          colors: [],
          ...cut,
        }));

        // Designs: manual entries in config.json win over the auto manifest
        const manual = cfg.designs ?? [];
        const listed = new Set(manual.map((d) => d.src));
        const designs = [
          ...manual,
          ...(Array.isArray(manifest) ? manifest : []).filter(
            (d) => !listed.has(d.src) && !listed.has(d.printSrc)
          ),
        ];

        // Attach default placement (from the "Designs" sheet) by filename
        const defaultsByFile = new Map(
          (shop?.designDefaults ?? []).map((d) => [d.file, d])
        );
        for (const design of designs) {
          const file = String(design.printSrc ?? design.src ?? '').split('/').pop();
          const def = defaultsByFile.get(file);
          if (def) design.default = { x: def.x, y: def.y, scale: def.scale };
        }

        setConfig({ ...cfg, colors, cuts, designs });
      })
      .catch((err) => setError(err.message));
  }, []);

  return { config, error };
}
