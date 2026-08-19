import { useEffect, useState } from 'react';

/**
 * Loads /config.json (shop settings) and /designs-manifest.json (auto-generated
 * from the files in public/designs/ at build time), and merges the two design
 * lists. Entries in config.json win over manifest entries for the same file,
 * so you can still pin a custom title there if you want; everything else is
 * automatic — upload a file to the designs folder and it appears.
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
      fetch('/designs-manifest.json', { cache: 'no-store' })
        .then((res) => (res.ok ? res.json() : []))
        .catch(() => []),
    ])
      .then(([cfg, manifest]) => {
        const manual = cfg.designs ?? [];
        const listedSrcs = new Set(manual.map((d) => d.src));
        const merged = [
          ...manual,
          ...(Array.isArray(manifest) ? manifest : []).filter((d) => !listedSrcs.has(d.src)),
        ];
        setConfig({ ...cfg, designs: merged });
      })
      .catch((err) => setError(err.message));
  }, []);

  return { config, error };
}
