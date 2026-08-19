import { useEffect } from 'react';

/**
 * Minimal dialog. Pass `rows` ([[label, value], ...]) for structured content
 * (e.g. an order summary) or `body` for a plain text message.
 */
export default function Modal({ title, body, rows, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-sand bg-paper p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-2xl text-ink">{title}</h3>

        {rows ? (
          <dl className="mt-5 divide-y divide-sand border-y border-sand">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 py-3">
                <dt className="text-sm text-stone">{label}</dt>
                <dd className="flex items-center gap-2 text-sm font-medium text-ink">
                  {/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) && (
                    <span
                      className="inline-block h-4 w-4 rounded-full border border-sand"
                      style={{ backgroundColor: value }}
                    />
                  )}
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-4 text-sm leading-relaxed text-ink">{body}</p>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-ink py-3 text-sm font-semibold tracking-wide text-cream transition-colors hover:bg-ink/85"
        >
          Close
        </button>
      </div>
    </div>
  );
}
