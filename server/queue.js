// Queue manager.
//
// Polls the Drive provider, keeps an ordered list of discovered images, and
// scores each new one immediately (dummy scorer for now). The frontend walks
// the list with a cursor: it asks for "the next item after index N".

import { config } from "./config.js";
import { scoreImage } from "./scorer/index.js";

export function createQueue(provider) {
  // Ordered list of scored items. Index in this array IS the cursor space.
  const items = [];
  const seen = new Set();

  async function poll() {
    try {
      const found = await provider.list();
      for (const f of found) {
        if (seen.has(f.id)) continue;
        seen.add(f.id);
        const result = scoreImage(f, {
          theme: config.theme,
          weights: config.weights,
          floor: config.scoreFloor,
        });
        items.push({
          ...f,
          ...result, // score, grade, breakdown
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
