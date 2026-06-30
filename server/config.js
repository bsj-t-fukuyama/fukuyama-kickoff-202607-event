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
    folderId: process.env.DRIVE_FOLDER_ID ?? "",
    // Path to a service-account JSON key. The service account must have the
    // folder shared with it (Viewer is enough).
    credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS ?? "",
  },

  // Google Sheet used as a tiny DB for scan results (keyed by image id).
  // Columns: A=画像id B=合計スコア C=スキャン済みフラグ D=user名 E=画像名。
  //
  // 書き込み方法は2通り（どちらか一方でOK）:
  //   1) Apps Script Web App（推奨・課金/サービスアカウント不要）:
  //        SHEET_WEBHOOK_URL にデプロイURLを設定。サーバーはそこへ POST するだけ。
  //   2) サービスアカウント: GOOGLE_APPLICATION_CREDENTIALS を設定し、対象シートを
  //        サービスアカウントに「編集者」で共有。
  // どちらも無ければ保存は自動的に無効（採点は通常どおり動作）。SHEET_SYNC=off で明示無効化。
  sheets: {
    spreadsheetId: process.env.SHEET_ID ?? "",
    credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS ?? "",
    // 保存先 Web App URL。秘匿情報なのでリポジトリには置かず .env / /settings で管理。
    webhookUrl: process.env.SHEET_WEBHOOK_URL ?? "",
    webhookToken: process.env.SHEET_WEBHOOK_TOKEN ?? "",
    enabled: (process.env.SHEET_SYNC ?? "auto") !== "off",
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
  theme: process.env.THEME ?? "BRAVE THROUGH",

  // Weights for each scoring axis (see README-SCORING.md). The four axes:
  // みんなで・楽しく・気持ちよく・はっきり 写っているか。
  // にぎやかさ（人数）を主役にした配分: 他の3軸は各20点、にぎやかさは40点。
  // 総合スコアは4軸の配点の合計（重みの合計は 1.0）。
  weights: {
    mood: Number(process.env.W_MOOD ?? 0.2), // 笑顔・表情（20点）
    people: Number(process.env.W_PEOPLE ?? 0.4), // にぎやかさ（人数）（40点）
    composition: Number(process.env.W_COMPOSITION ?? 0.2), // 構図・遠近感（20点）
    clarity: Number(process.env.W_CLARITY ?? 0.2), // 写りの良さ（顔のわかりやすさ・描写）（20点）
  },

  // Lowest possible per-axis score. We never deduct below this floor so no photo
  // gets publicly humiliated — every shot starts from here and earns points up.
  // Floor 8 keeps every total at or above 8 while leaving a wide spread of
  // possible scores (8〜100) so good and great shots pull clearly apart.
  scoreFloor: Number(process.env.FLOOR ?? 8),

  // BRAVE THROUGH ボーナスの発動確率（0..1）。50点以下の写真が、この確率で
  // 70〜91点へ格上げされる。既定 0.1（10%）。/settings から実行時に変更できる。
  bonusChance: Number(process.env.BONUS_CHANCE ?? 0.1),

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
