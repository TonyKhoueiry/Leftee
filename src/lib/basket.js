const KEY = 'leftee-basket';

export function loadBasket() {
  try {
    const items = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

export function saveBasket(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* storage unavailable — basket lives for the session only */
  }
}

export const basketTotal = (items) =>
  items.reduce((sum, it) => sum + (Number(it.price) || 0) * (it.qty || 1), 0);
