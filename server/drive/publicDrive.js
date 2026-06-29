// Public Google Drive folder provider (no credentials).
//
// Works against a folder shared as "anyone with the link". It scrapes the
// folder's HTML for each file's id + name and serves the images straight from
// Google's public image host. No service account, no API key.
//
//   DRIVE_PROVIDER=google-public DRIVE_FOLDER_ID=<folder id> npm run dev
//
// Primary source is the lightweight "embeddedfolderview" page — a tiny static
// HTML meant for embedding. Unlike the full /drive/folders SPA (hundreds of KB),
// it does NOT get swapped for a consent/interstitial page when fetched from a
// datacenter IP, so it works the same locally and on a host like Railway. The
// old SPA page is kept as a fallback in case Google changes the embed markup.
//
// Caveat: this relies on Drive's public HTML, which Google can change. For a
// private folder or a stable contract, use the "google" provider instead.

import { config } from "../config.js";

// 軽量な埋め込み用ページ。データセンターIPからでも同意ページに化けにくい。
const EMBED_URL = (id) => `https://drive.google.com/embeddedfolderview?id=${id}#grid`;
// 旧来のフォルダSPA（フォールバック用）。
const FOLDER_URL = (id) => `https://drive.google.com/drive/folders/${id}`;
// Public image host. =w<px> asks for a resized JPEG suitable for a big screen.
const imageUrl = (id) => `https://lh3.googleusercontent.com/d/${id}=w1600`;

// embeddedfolderview をパース。各ファイルは
//   <div class="flip-entry" id="entry-<fileId>" ...> … flip-entry-title">名前 …
// の塊で並ぶので、各 id にその直後の title を対応付ける。
function parseEmbedHtml(html) {
  const titles = [];
  for (const m of html.matchAll(/flip-entry-title">([^<]+)</g)) {
    titles.push({ name: m[1].trim(), idx: m.index });
  }
  const out = [];
  for (const m of html.matchAll(/id="entry-([A-Za-z0-9_-]{20,})"/g)) {
    const t = titles.find((x) => x.idx > m.index);
    out.push({ id: m[1], name: t ? t.name : m[1] });
  }
  return out;
}

// 旧来の /drive/folders ページをパース（フォールバック）。`data-id="<id>"` と
// `aria-label="<name> <Kind> Shared"` を位置で対応付ける。
function parseFolderHtml(html) {
  const idRe = /data-id="([A-Za-z0-9_-]{20,})"/g;
  const labelRe =
    /aria-label="([^"]+?) (?:Image|Audio|Video|PDF|File|Photoshop|TIFF|Document|Spreadsheet|Presentation)[^"]*"/g;

  const ids = [];
  for (let m; (m = idRe.exec(html)); ) {
    if (!ids.find((x) => x.id === m[1])) ids.push({ id: m[1], idx: m.index });
  }
  const labels = [];
  for (let m; (m = labelRe.exec(html)); ) labels.push({ name: m[1], idx: m.index });

  return ids.map(({ id, idx }) => {
    let name = id;
    let best = Infinity;
    for (const l of labels) {
      const d = Math.abs(l.idx - idx);
      if (d < best) {
        best = d;
        name = l.name;
      }
    }
    return { id, name };
  });
}

async function fetchFiles(folderId) {
  // 1) 軽量な embeddedfolderview を優先。
  try {
    const res = await fetch(EMBED_URL(folderId), { headers: { "User-Agent": "Mozilla/5.0" } });
    if (res.ok) {
      const files = parseEmbedHtml(await res.text());
      if (files.length) return files;
    }
  } catch {
    /* フォールバックへ */
  }
  // 2) フォールバック: 旧来のフォルダSPA。
  const res = await fetch(FOLDER_URL(folderId), { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`folder fetch failed: HTTP ${res.status}`);
  return parseFolderHtml(await res.text());
}

export function createPublicDriveProvider() {
  const { folderId } = config.google;

  return {
    name: "google-public",
    async list() {
      if (!folderId) throw new Error("DRIVE_FOLDER_ID is not set");
      const files = await fetchFiles(folderId);
      if (files.length === 0) {
        throw new Error(
          "no files parsed — is the folder shared as 'anyone with the link'?",
        );
      }
      // Keep a stable order so the cursor walk is deterministic.
      return files.map((f, i) => ({
        id: f.id,
        name: f.name,
        // Loaded directly by the frontend, like the mock provider.
        imageUrl: imageUrl(f.id),
        createdTime: new Date(Date.now() - (files.length - i) * 1000).toISOString(),
      }));
    },
    // Not used: images load by direct public URL.
    async stream() {
      throw new Error("google-public provider serves images by direct URL");
    },
  };
}
