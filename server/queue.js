// Queue manager.
//
// Polls the Drive provider, keeps an ordered list of discovered images, and
// scores each new one immediately. Scoring is either the Claude vision judge
// (reads the real pixels) or the dummy scorer, per config.judge.provider; the
// AI judge falls back to the dummy scorer on any per-image error. The frontend
// walks the list with a cursor: it asks for "the next item after index N".

import { config } from "./config.js";
import { scoreImage } from "./scorer/index.js";
import { scoreImageWithAI, createJudgeClient } from "./scorer/aiScorer.js";
import { createSheetsStore, fetchScannedIds } from "./sheets/index.js";

export function createQueue(provider) {
  // Ordered list of scored items. Index in this array IS the cursor space.
  const items = [];
  const seen = new Set();

  const useAI = config.judge.provider === "ai";
  // One shared client across all images keeps the connection warm.
  const judgeClient = useAI ? createJudgeClient(config.judge.apiKey) : null;

  // Google Sheet "DB" for scan results (no-op when not configured).
  const sheetsStore = createSheetsStore();

  // Load the raw image bytes for any provider: absolute URLs (mock /
  // google-public) are fetched directly; the private google provider streams
  // through its own proxy so credentials stay server-side.
  async function loadImage(item) {
    if (item.imageUrl && /^https?:/i.test(item.imageUrl)) {
      const res = await fetch(item.imageUrl);
      if (!res.ok) throw new Error(`image fetch HTTP ${res.status}`);
      const mediaType = (res.headers.get("content-type") || "image/jpeg").split(";")[0];
      const base64 = Buffer.from(await res.arrayBuffer()).toString("base64");
      return { mediaType, base64 };
    }
    const { mimeType, stream } = await provider.stream(item.id);
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return { mediaType: mimeType || "image/jpeg", base64: Buffer.concat(chunks).toString("base64") };
  }

  async function score(item) {
    const opts = {
      theme: config.theme,
      weights: config.weights,
      floor: config.scoreFloor,
    };
    if (useAI) {
      try {
        const image = await loadImage(item);
        return await scoreImageWithAI(item, {
          ...opts,
          image,
          model: config.judge.model,
          client: judgeClient,
        });
      } catch (err) {
        console.error(`[judge] ${item.name} fell back to dummy:`, err.message);
      }
    }
    return scoreImage(item, opts);
  }

  async function poll() {
    try {
      const found = await provider.list();
      for (const f of found) {
        if (seen.has(f.id)) continue;
        seen.add(f.id);
        const result = await score(f);
        const item = {
          ...f,
          ...result, // score, grade, breakdown, (signals)
          discoveredAt: Date.now(),
        };
        items.push(item);

        // スキャン後、シート(DB)へ保存: 画像id・合計スコア・スキャン済みフラグ(true)。
        // 採点フローを止めないよう fire-and-forget（失敗してもログのみ）。
        sheetsStore.save(item).catch((err) => {
          console.error(`[sheets] save failed for ${item.name} (${item.id}):`, err.message);
        });
      }
    } catch (err) {
      console.error(`[queue] poll failed:`, err.message);
    }
  }

  // Returns the next item strictly after `cursor`, plus queue stats.
  function next(cursor) {
    const c = Number.isFinite(cursor) ? cursor : -1;
    const index = c + 1;
    const item = index >= 0 && index < items.length ? items[index] : null;
    return {
      item: item ? { ...item, index } : null,
      stats: {
        total: items.length,
        shown: Math.max(0, Math.min(items.length, c + 1)),
        pending: Math.max(0, items.length - (c + 1)),
        theme: config.theme,
        provider: provider.name,
      },
    };
  }

  // 起動時にシート(DB)から「スキャン済み(C=true)の画像id」を読み込み、seen に登録する。
  // これでサーバー再起動/リロード後も、既にスキャン済みの画像を再スキャン（再採点）しない。
  async function loadScanned() {
    try {
      const ids = await fetchScannedIds();
      for (const id of ids) seen.add(id);
      if (ids.size) console.log(`[queue] シートのスキャン済み ${ids.size} 件を再スキャン対象から除外`);
    } catch (err) {
      console.error("[queue] スキャン済みidの読み込みに失敗:", err.message);
    }
  }

  async function start() {
    await loadScanned();
    await poll();
    return setInterval(poll, config.pollIntervalMs);
  }

  // 集計をリセット: 採点済みリストと seen をクリアして 1 から再スキャンできる状態に戻す。
  // （シート側のクリアは呼び出し元が resetSheet() で先に行う前提）。
  function reset() {
    items.length = 0;
    seen.clear();
  }

  return { start, next, poll, reset };
}
