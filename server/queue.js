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

export function createQueue(provider) {
  // Ordered list of scored items. Index in this array IS the cursor space.
  const items = [];
  const seen = new Set();

  const useAI = config.judge.provider === "ai";
  // One shared client across all images keeps the connection warm.
  const judgeClient = useAI ? createJudgeClient(config.judge.apiKey) : null;

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
        items.push({
          ...f,
          ...result, // score, grade, breakdown, (signals)
          discoveredAt: Date.now(),
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

  function start() {
    poll();
    return setInterval(poll, config.pollIntervalMs);
  }

  return { start, next, poll };
}
