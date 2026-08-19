import { useState } from 'react';
import { downloadShopData } from '../lib/exportShopData.js';
import { clearAdminEdits } from '../lib/adminStore.js';

/**
 * Admin toolbox — rendered only in ?admin mode, above the preview.
 * Edits live in this browser until you download shop-data.xlsx and
 * upload it to the repo root; Netlify then republishes.
 */
export default function AdminPanel({
  areaEdit,
  onAreaEditChange,
  area,
  cutLabel,
  design,
  position,
  size,
  onSaveDesignDefault,
  hasDesignDefault,
  exportData,
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const flash = (msg) => {
    setNote(msg);
    setTimeout(() => setNote(''), 3000);
  };

  return (
    <div className="mb-6 rounded-2xl border border-clay/40 bg-paper p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-clay">
          Admin toolbox
        </span>
        {note && <span className="text-xs text-olive">{note}</span>}
      </div>

      {/* Print area */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={areaEdit}
            onChange={(e) => onAreaEditChange(e.target.checked)}
            className="h-4 w-4 accent-clay"
          />
          Edit print area ({cutLabel})
        </label>
        <span className="font-mono text-xs text-stone">
          L {area.left} · T {area.top} · R {area.right} · B {area.bottom}
        </span>
      </div>

      {/* Design default */}
      {design && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-sand pt-3">
          <span className="text-sm text-ink">“{design.title}”</span>
          <span className="font-mono text-xs text-stone">
            X {position.x.toFixed(1)} · Y {position.y.toFixed(1)} · Scale {size.toFixed(1)}
          </span>
          <button
            type="button"
            onClick={() => {
              onSaveDesignDefault();
              flash('Default saved — download the sheet to publish.');
            }}
            className="rounded-lg border border-ink px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-ink hover:text-cream"
          >
            {hasDesignDefault ? 'Update default position' : 'Set as default position'}
          </button>
        </div>
      )}

      {/* Export */}
      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-sand pt-3">
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await downloadShopData(exportData());
              flash('Downloaded — upload it to the repo root on GitHub.');
            } catch (err) {
              flash(`Export failed: ${err.message}`);
            } finally {
              setBusy(false);
            }
          }}
          className="rounded-lg bg-clay px-4 py-2 text-xs font-semibold uppercase tracking-wider text-cream transition-colors hover:bg-clay-dark disabled:opacity-50"
        >
          {busy ? 'Preparing…' : 'Download shop-data.xlsx'}
        </button>
        <button
          type="button"
          onClick={() => {
            clearAdminEdits();
            window.location.reload();
          }}
          className="text-xs text-stone underline-offset-4 hover:text-ink hover:underline"
        >
          Discard local edits
        </button>
      </div>
    </div>
  );
}
