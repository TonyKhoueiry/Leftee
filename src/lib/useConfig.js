import { useEffect, useState } from 'react';

/**
 * Loads /config.json at runtime. Everything the shop offers (cuts, colors,
 * sizes, print areas, designs) lives there — editable in the admin panel
 * or directly on GitHub, no code changes needed.
 */
export function useConfig() {
  const [config, setConfig] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/config.json', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`Could not load config.json (HTTP ${res.status})`);
        return res.json();
      })
      .then(setConfig)
      .catch((err) => setError(err.message));
  }, []);

  return { config, error };
}
