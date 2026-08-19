/**
 * Admin edits (print areas, design defaults) made in ?admin mode are kept in
 * this browser until you download the updated shop-data.xlsx and upload it to
 * GitHub — that's the permanent save.
 */
const load = (key, fallback) => {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v ?? fallback;
  } catch {
    return fallback;
  }
};

const save = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
};

const AREA_KEY = 'leftee-admin-areas';
const DEFAULTS_KEY = 'leftee-admin-design-defaults';

export const loadAreaOverrides = () => load(AREA_KEY, {});
export const saveAreaOverrides = (v) => save(AREA_KEY, v);
export const loadDesignDefaults = () => load(DEFAULTS_KEY, {});
export const saveDesignDefaults = (v) => save(DEFAULTS_KEY, v);
export const clearAdminEdits = () => {
  save(AREA_KEY, {});
  save(DEFAULTS_KEY, {});
};
