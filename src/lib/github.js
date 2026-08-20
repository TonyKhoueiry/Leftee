/**
 * Direct-to-GitHub publishing from the admin page.
 *
 * Uses GitHub's REST API with a fine-grained personal access token that is
 * stored only in this browser (localStorage) and sent only to api.github.com.
 * Every commit triggers a Netlify rebuild, so changes go live in ~1 minute.
 */
const TOKEN_KEY = 'leftee-gh-token';

export const loadToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
};

export const saveToken = (t) => {
  try {
    localStorage.setItem(TOKEN_KEY, t.trim());
  } catch {
    /* ignore */
  }
};

const headers = (token) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
});

const encodePath = (path) => path.split('/').map(encodeURIComponent).join('/');

async function apiError(res) {
  let msg = `HTTP ${res.status}`;
  try {
    const body = await res.json();
    if (body.message) msg += ` — ${body.message}`;
  } catch {
    /* ignore */
  }
  return new Error(msg);
}

/** List a directory in the repo; returns [] if it doesn't exist. */
async function listDir(repo, token, dir) {
  const res = await fetch(
    `https://api.github.com/repos/${repo}/contents/${encodePath(dir)}`,
    { headers: headers(token) }
  );
  if (res.status === 404) return [];
  if (!res.ok) throw await apiError(res);
  const body = await res.json();
  return Array.isArray(body) ? body : [];
}

/** Find the blob sha of an existing file (needed to overwrite it), or null. */
async function findSha(repo, token, path) {
  const idx = path.lastIndexOf('/');
  const dir = idx === -1 ? '' : path.slice(0, idx);
  const name = idx === -1 ? path : path.slice(idx + 1);
  const entries = await listDir(repo, token, dir);
  return entries.find((e) => e.name === name)?.sha ?? null;
}

/** Create or overwrite a file in the repo. contentBase64 = raw base64 (no data: prefix). */
export async function commitFile({ repo, token, path, contentBase64, message }) {
  const sha = await findSha(repo, token, path);
  const res = await fetch(
    `https://api.github.com/repos/${repo}/contents/${encodePath(path)}`,
    {
      method: 'PUT',
      headers: { ...headers(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, content: contentBase64, ...(sha ? { sha } : {}) }),
    }
  );
  if (!res.ok) throw await apiError(res);
}

/** Delete a file if it exists; quietly does nothing if it doesn't. */
export async function deleteFileIfExists({ repo, token, path, message }) {
  const sha = await findSha(repo, token, path);
  if (!sha) return false;
  const res = await fetch(
    `https://api.github.com/repos/${repo}/contents/${encodePath(path)}`,
    {
      method: 'DELETE',
      headers: { ...headers(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sha }),
    }
  );
  if (!res.ok) throw await apiError(res);
  return true;
}

/** Read a browser File as raw base64. */
export const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',', 2)[1] ?? '');
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
