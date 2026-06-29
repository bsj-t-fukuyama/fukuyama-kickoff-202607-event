import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { createDriveProvider } from "./drive/index.js";
import { createQueue } from "./queue.js";
import { getSettings, setSheetWebhookUrl } from "./settings.js";
import { fetchTopResults, resetSheet } from "./sheets/index.js";
import { uploadToDrive } from "./upload.js";

// 結果発表サムネ用の公開画像URL（google-public と同じ lh3 ホスト）。
const resultImageUrl = (id) => `https://lh3.googleusercontent.com/d/${id}=w1600`;

const provider = createDriveProvider();
const queue = createQueue(provider);

const app = express();
app.use(cors());
// 参加者がアップする写真(base64)を受けるため上限を上げる（圧縮済みでも数MB想定）。
app.use(express.json({ limit: "25mb" }));

// Next unscanned image after the given cursor (-1 to start from the beginning).
app.get("/api/next", (req, res) => {
  const cursor = Number.parseInt(req.query.cursor, 10);
  res.json(queue.next(Number.isNaN(cursor) ? -1 : cursor));
});

// Current config the screen needs (theme, weights, provider, drive URL).
app.get("/api/config", (_req, res) => {
  res.json({
    theme: config.theme,
    weights: config.weights,
    provider: provider.name,
    // 設定画面が表示する“現在のドライブURL”。folderId から組み立てる。
    driveUrl: config.google.folderId
      ? `https://drive.google.com/drive/folders/${config.google.folderId}`
      : "",
    animationMs: 10_000,
  });
});

// Image proxy — only meaningful for the google provider. Streams bytes so the
// service-account credentials never reach the browser.
app.get("/api/image/:id", async (req, res) => {
  try {
    const { mimeType, stream } = await provider.stream(req.params.id);
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    stream.pipe(res);
  } catch (err) {
    console.error(`[image] ${req.params.id}:`, err.message);
    res.status(502).json({ error: "failed to fetch image" });
  }
});

// Editable runtime settings (currently the Sheet save destination URL).
app.get("/api/settings", (_req, res) => res.json(getSettings()));
app.post("/api/settings", (req, res) => {
  const { sheetWebhookUrl } = req.body ?? {};
  if (typeof sheetWebhookUrl === "string") setSheetWebhookUrl(sheetWebhookUrl);
  res.json(getSettings());
});

// 結果発表: シートのスキャン済み(C=true)の中から 合計スコア(B) 上位3件。
app.get("/api/results", async (_req, res) => {
  try {
    const rows = await fetchTopResults(3);
    const results = rows.map((r) => ({
      imageId: r.id,
      imageUrl: resultImageUrl(r.id),
      score: r.score,
      name: r.name || "",
    }));
    res.json({ results });
  } catch (err) {
    console.error("[results]", err.message);
    res.status(502).json({ results: [], error: err.message });
  }
});

// ランキング集計のリセット: シートをヘッダのみに戻し、サーバーの集計もクリアして
// 1から再スキャン（再採点）する。
app.post("/api/reset", async (_req, res) => {
  try {
    await resetSheet(); // 1) シートのデータ行を消去
    queue.reset(); // 2) サーバーの seen / items をクリア
    presentation = null; // 上演状態もクリア（/view を待機に戻す）
    queue.poll().catch((err) => console.error("[reset] re-scan poll failed:", err.message)); // 3) 再スキャン開始
    res.json({ ok: true });
  } catch (err) {
    console.error("[reset]", err.message);
    res.status(502).json({ ok: false, error: err.message });
  }
});

// --- リアルタイム同期: /main が主導、/view(参加者) が追従する -----------------
// /main は写真を切り替えるたびに「いまこの index を表示開始した」と報告し、サーバーが
// 開始時刻を刻む。/view はこの状態をポーリングし、サーバー時刻基準の経過ぶんだけ
// アニメを進めた状態で同じ写真を再生する（端末間の時計ズレに依存しない）。
let presentation = null; // { index, startedAt(ms, server time) }

app.post("/api/presentation", (req, res) => {
  const raw = req.body?.index;
  // index:null は「主導側がアイドル（次の写真待ち）」の合図 → 上演状態をクリア。
  if (raw === null || raw === undefined) {
    presentation = null;
    return res.json({ ok: true, idle: true });
  }
  const index = Number(raw);
  if (!Number.isFinite(index)) return res.status(400).json({ ok: false, error: "bad index" });
  presentation = { index, startedAt: Date.now() };
  res.json({ ok: true });
});

app.get("/api/presentation", (_req, res) => {
  if (!presentation) return res.json({ index: null, now: Date.now() });
  res.json({ index: presentation.index, startedAt: presentation.startedAt, now: Date.now() });
});

// 参加者(/view)がスマホから選んだ写真を Drive フォルダへ投稿する。
app.post("/api/upload", async (req, res) => {
  try {
    const { name, mimeType, data } = req.body ?? {};
    const result = await uploadToDrive({ name, mimeType, base64: data });
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error("[upload]", err.message);
    res.status(502).json({ ok: false, error: err.message });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// --- 本番: ビルド済みフロント(dist)を同一オリジンで配信 -------------------------
// /api と画像プロキシ以外のパスは SPA として index.html を返す。
// 開発時(vite)はブラウザが 5173 を見るのでこの分岐は使われない。
const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");
app.use(express.static(distDir));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(distDir, "index.html"));
});

queue.start();

app.listen(config.port, () => {
  console.log(`[server] http://localhost:${config.port}  provider=${provider.name}  theme="${config.theme}"`);
});
