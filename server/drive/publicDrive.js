// Public Google Drive folder provider (no credentials).
//
// Works against a folder shared as "anyone with the link". It scrapes the
// folder's HTML page (which embeds each file's id + name) and serves the images
// straight from Google's public image host. No service account, no API key.
//
//   DRIVE_PROVIDER=google-public DRIVE_FOLDER_ID=<folder id> npm run dev
//
// Caveat: this relies on Drive's public folder HTML, which Google can change.
// For a private folder or a stable contract, use the "google" provider instead.

import { config } from "../config.js";

const FOLDER_URL = (id) => `https://drive.google.com/drive/folders/${id}`;
// Public image host. =w<px> asks for a resized JPEG suitable for a big screen.
const imageUrl = (id) => `https://lh3.googleusercontent.com/d/${id}=w1600`;

// Pull { id, name } for every file rendered in the folder page. Drive puts a
// `data-id="<fileId>"` on each tile and an `aria-label="<name> <Kind> Shared"`.
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

  // Pair each id with the nearest label by position in the document.
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

export function createPublicDriveProvider() {
  const { folderId } = config.google;

  return {
    name: "google-public",
    async list() {
      const res = await fetch(FOLDER_URL(folderId), {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (!res.ok) {
        throw new Error(`folder fetch failed: HTTP ${res.status}`);
      }
      const html = await res.text();
      const files = parseFolderHtml(html);
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
