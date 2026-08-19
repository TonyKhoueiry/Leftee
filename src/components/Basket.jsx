import { basketTotal } from '../lib/basket.js';

const fmt = (currency, value) =>
  value == null ? '—' : `${currency}${Number(value).toFixed(2).replace(/\.00$/, '')}`;

/**
 * The basket page — same earth-tone, hairline-divider language as the
 * customizer. Items are stored in the browser (localStorage).
 */
export default function Basket({ items, currency, onQty, onRemove, onCheckout }) {
  const total = basketTotal(items);

  if (items.length === 0) {
    return (
      <div className="py-24 text-center">
        <p className="font-display text-2xl text-ink">Your basket is empty</p>
        <p className="mt-2 text-sm text-stone">Design a shirt and add it here.</p>
        <a
          href="#/"
          className="mt-8 inline-block rounded-xl bg-clay px-8 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-cream transition-colors hover:bg-clay-dark"
        >
          Start designing
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-semibold text-ink">Basket</h2>
        <a href="#/" className="text-sm text-stone underline-offset-4 hover:text-ink hover:underline">
          ← Continue designing
        </a>
      </div>

      <ul className="divide-y divide-sand border-y border-sand">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-4 py-5">
            {/* Thumbnail: the design on a swatch of the garment color */}
            <div
              className="flex h-16 w-16 flex-none items-center justify-center rounded-xl border border-sand"
              style={{ backgroundColor: item.hex }}
            >
              {item.designSrc ? (
                <img
                  src={item.designSrc}
                  alt={item.designTitle ?? ''}
                  className="h-10 w-10 object-contain drop-shadow-sm"
                  draggable={false}
                />
              ) : (
                <span className="text-[10px] uppercase tracking-wider text-white mix-blend-difference">
                  plain
                </span>
              )}
            </div>

            <div className="min-w-0 flex-grow">
              <p className="truncate text-sm font-medium text-ink">
                {item.cutLabel} · {item.size}
              </p>
              <p className="truncate text-xs text-stone">
                {item.colorName}
                {item.designTitle ? ` · ${item.designTitle}` : ' · no design'}
              </p>
            </div>

            {/* Quantity */}
            <div className="flex flex-none items-center rounded-lg border border-sand bg-paper">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => onQty(item.id, -1)}
                className="px-2.5 py-1 text-stone transition-colors hover:text-ink"
              >
                −
              </button>
              <span className="min-w-6 text-center text-sm font-medium text-ink">
                {item.qty || 1}
              </span>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => onQty(item.id, 1)}
                className="px-2.5 py-1 text-stone transition-colors hover:text-ink"
              >
                +
              </button>
            </div>

            <p className="w-16 flex-none text-right text-sm font-medium text-ink">
              {fmt(currency, item.price != null ? item.price * (item.qty || 1) : null)}
            </p>

            <button
              type="button"
              aria-label="Remove item"
              onClick={() => onRemove(item.id)}
              className="flex-none pl-1 text-stone transition-colors hover:text-clay"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-baseline justify-between">
        <span className="text-sm uppercase tracking-[0.2em] text-stone">Total</span>
        <span className="font-display text-3xl font-semibold text-ink">{fmt(currency, total)}</span>
      </div>

      <button
        type="button"
        onClick={onCheckout}
        className="mt-6 w-full rounded-xl bg-clay py-4 text-sm font-semibold uppercase tracking-[0.15em] text-cream shadow-sm transition-colors hover:bg-clay-dark"
      >
        Checkout
      </button>
      <p className="mt-3 text-center text-xs text-stone">
        Your basket is saved in this browser.
      </p>
    </div>
  );
}
