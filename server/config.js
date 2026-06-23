// Central configuration. Everything is overridable via environment variables so
// the same build runs as an out-of-the-box mock or against a real Drive folder.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Minimal .env loader (Node 18 has no --env-file). Values already in the
// environment win, so inline `KEY=val npm run dev` still overrides the file.
(function loadDotEnv() {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const envPath = path.join(dir, "..", ".env");
  if (!fs.existsSync(envPath)) return;
  for (const raw of fs.readFileSync(envPath, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = val;
  }
})();

export const config = {
  port: Number(process.env.PORT ?? 3001),

  // Which image source to use:
  //   "mock"          – picsum sample photos, no auth
  //   "google-public" – a Drive folder shared "anyone with the link", no auth
  //   "google"        – a private Drive folder via a service account
  driveProvider: process.env.DRIVE_PROVIDER ?? "google-public",

  // Google Drive settings (only used when driveProvider === "google").
  google: {
    folderId: process.env.DRIVE_FOLDER_ID ?? "1gFfMPwP7fhoWD8IenKLPZPt6PCmibsxw",
    // Path to a service-account JSON key. The service account must have the
    // folder shared with it (Viewer is enough).
    credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS ?? "",
  },

  // Mock provider: how many sample photos to pretend are "already in Drive",
  // and how often a brand-new one "arrives".
  mock: {
    initialCount: Number(process.env.MOCK_INITIAL ?? 6),
    arrivalEveryMs: Number(process.env.MOCK_ARRIVAL_MS ?? 25_000),
  },

  // How often the backend polls the Drive folder for new files.
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? 8_000),

  // The current お題 (theme) shown on screen and used by the scorer.
  theme: process.env.THEME ?? "最高の乾杯",

  // Weights for each scoring axis (see README-SCORING.md). The four axes:
  // みんなで・楽しく・気持ちよく・はっきり 写っているか。
  // Equal allocation: each axis is worth an even share (100 / 4 = 25 pts), and
  // the total score is the SUM of the four axis points. Weights sum to 1.0.
  weights: {
    mood: Number(process.env.W_MOOD ?? 0.25), // 笑顔・表情
    people: Number(process.env.W_PEOPLE ?? 0.25), // にぎやかさ（人数）
    composition: Number(process.env.W_COMPOSITION ?? 0.25), // 構図・遠近感
    clarity: Number(process.env.W_CLARITY ?? 0.25), // 写りの良さ（顔のわかりやすさ・描写）
  },

  // Lowest possible per-axis score. We never deduct below this floor so no photo
  // gets publicly humiliated — every shot starts from here and earns points up.
  // Floor 30 keeps every total above 30 while leaving room for a wide spread.
  scoreFloor: Number(process.env.FLOOR ?? 30),

  // Scorer selection:
  //   "ai"    – Claude vision judges the real pixels (server/scorer/aiScorer.js)
  //   "dummy" – stable random numbers, no API call (server/scorer/index.js)
  // Defaults to "ai" when an ANTHROPIC_API_KEY is present, else "dummy".
  // The AI judge falls back to the dummy scorer on any per-image error.
  judge: {
    provider: process.env.SCORER ?? (process.env.ANTHROPIC_API_KEY ? "ai" : "dummy"),
    model: process.env.JUDGE_MODEL ?? "claude-opus-4-8",
    apiKey: process.env.ANTHROPIC_API_KEY ?? "",
  },
};
