import { useRef, useState } from 'react';
import { downloadShopData, shopDataBase64 } from '../lib/exportShopData.js';
import { clearAdminEdits } from '../lib/adminStore.js';
import {
  loadToken,
  saveToken,
  commitFile,
  deleteFileIfExists,
  fileToBase64,
} from '../lib/github.js';

/**
 * Admin toolbox — rendered only in ?admin mode, above the preview.
 *
 * With a GitHub token connected, designs can be uploaded and the spreadsheet
 * published straight from here (each action commits to the repo; Netlify
 * rebuilds in ~1 minute). Without a token, the download button still works.
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
  repo,
  onUploaded,
}) {
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');
  const [savedToken, setSavedToken] = useState(loadToken); // persisted token
  const [draftToken, setDraftToken] = useState('');
  const [editingToken, setEditingToken] = useState(false);
  const fileInputRef = useRef(null);

  const token = savedToken;
  const connected = Boolean(savedToken && repo);
  const showTokenForm = editingToken || !connected;

  const flash = (msg, sticky = false) => {
    setNote(msg);
    if (!sticky) setTimeout(() => setNote(''), 6000);
  };

  const run = async (label, fn) => {
    setBusy(label);
    try {
      await fn();
    } catch (err) {
      flash(`${label} failed: ${err.message}`, true);
    } finally {
      setBusy('');
    }
  };

  const handleUploadFiles = (files) =>
    run('Upload', async () => {
      let done = 0;
      for (const file of files) {
        const contentBase64 = await fileToBase64(file);
        await commitFile({
          repo,
          token,
          path: `public/designs/${file.name}`,
          contentBase64,
          message: `Add design: ${file.name}`,
        });
        done += 1;
        flash(`Uploading… ${done}/${files.length}`, true);
        // Show it in the gallery right away (from the local file) while
        // Netlify rebuilds the live site.
        onUploaded?.({ name: file.name, url: URL.createObjectURL(file) });
      }
      flash(
        `${done} design(s) sent to GitHub. The live site updates when the Netlify deploy turns green (~1–2 min); they're already in your gallery here.`,
        true
      );
    });

  const handlePublish = () =>
    run('Publish', async () => {
      const contentBase64 = await shopDataBase64(exportData());
      await commitFile({
        repo,
        token,
        path: 'shop-data.xlsx',
        contentBase64,
        message: 'Update shop data from admin',
      });
      // One source of truth: a stray .numbers file would override the published xlsx
      const removed = await deleteFileIfExists({
        repo,
        token,
        path: 'shop-data.numbers',
        message: 'Remove shop-data.numbers (superseded by admin publish)',
      });
      clearAdminEdits();
      flash(
        `Published — live in ~1 minute.${removed ? ' (Replaced shop-data.numbers.)' : ''}`
      );
    });

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
              flash('Default saved — publish to make it live.');
            }}
            className="rounded-lg border border-ink px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-ink hover:text-cream"
          >
            {hasDesignDefault ? 'Update default position' : 'Set as default position'}
          </button>
        </div>
      )}

      {/* GitHub connection */}
      <div className="mt-3 border-t border-sand pt-3">
        {showTokenForm ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="password"
              placeholder="GitHub token (fine-grained, Contents: read & write)"
              value={draftToken}
              onChange={(e) => setDraftToken(e.target.value)}
              className="min-w-0 flex-grow rounded-lg border border-sand bg-white px-3 py-2 text-xs text-ink placeholder:text-stone/70 focus:border-clay focus:outline-none"
            />
            <button
              type="button"
              disabled={!draftToken.trim()}
              onClick={() => {
                const t = draftToken.trim();
                saveToken(t);
                setSavedToken(t);
                setDraftToken('');
                setEditingToken(false);
                flash('Token saved in this browser.');
              }}
              className="rounded-lg border border-ink px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-ink hover:text-cream disabled:opacity-40"
            >
              Save
            </button>
            {connected && (
              <button
                type="button"
                onClick={() => {
                  setEditingToken(false);
                  setDraftToken('');
                }}
                className="text-xs text-stone underline-offset-2 hover:text-ink hover:underline"
              >
                Cancel
              </button>
            )}
          </div>
        ) : (
          <p className="text-xs text-stone">
            GitHub connected ({repo}).{' '}
            <button
              type="button"
              onClick={() => setEditingToken(true)}
              className="underline underline-offset-2 hover:text-ink"
            >
              Change token
            </button>
            {' · '}
            <button
              type="button"
              onClick={() => {
                saveToken('');
                setSavedToken('');
                flash('Token removed from this browser.');
              }}
              className="underline underline-offset-2 hover:text-ink"
            >
              Disconnect
            </button>
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-sand pt-3">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".png,.jpg,.jpeg,.webp,.gif,.svg"
          className="hidden"
          onChange={(e) => {
            const files = [...e.target.files];
            e.target.value = '';
            if (files.length) handleUploadFiles(files);
          }}
        />
        <button
          type="button"
          disabled={!connected || Boolean(busy)}
          onClick={() => fileInputRef.current?.click()}
          title={connected ? '' : 'Save a GitHub token first'}
          className="rounded-lg bg-clay px-4 py-2 text-xs font-semibold uppercase tracking-wider text-cream transition-colors hover:bg-clay-dark disabled:opacity-40"
        >
          {busy === 'Upload' ? 'Uploading…' : 'Upload designs'}
        </button>
        <button
          type="button"
          disabled={!connected || Boolean(busy)}
          onClick={handlePublish}
          title={connected ? '' : 'Save a GitHub token first'}
          className="rounded-lg bg-clay px-4 py-2 text-xs font-semibold uppercase tracking-wider text-cream transition-colors hover:bg-clay-dark disabled:opacity-40"
        >
          {busy === 'Publish' ? 'Publishing…' : 'Publish shop data'}
        </button>
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => run('Download', () => downloadShopData(exportData()))}
          className="rounded-lg border border-ink px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-ink hover:text-cream disabled:opacity-40"
        >
          Download sheet
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
