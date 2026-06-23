// Mock Drive provider. Returns sample photos so the whole app runs with zero
// setup. New photos "arrive" on a timer to exercise the queue/idle logic.
//
// Photos come from picsum.photos (real-looking images). The frontend loads the
// imageUrl directly — no proxy needed for the mock.

import { config } from "../config.js";

const { initialCount, arrivalEveryMs } = config.mock;

function makeItem(n) {
  const seed = `party-${n}`;
  return {
    id: `mock-${n}`,
    name: `IMG_${String(1000 + n)}.jpg`,
    // Stable per-seed photo. Sized for a big screen.
    imageUrl: `https://picsum.photos/seed/${seed}/1280/1600`,
    createdTime: new Date(Date.now() - (initialCount - n) * 1000).toISOString(),
  };
}

let counter = 0;
const items = [];
for (let i = 0; i < initialCount; i++) items.push(makeItem(counter++));

let lastArrival = Date.now();

export function createMockProvider() {
  return {
    name: "mock",
    async list() {
      // Simulate a new photo dropping into the folder every so often.
      if (Date.now() - lastArrival >= arrivalEveryMs) {
        items.push(makeItem(counter++));
        lastArrival = Date.now();
      }
      return items.map((it) => ({ ...it }));
    },
    // Not used by the mock (frontend loads picsum directly), but kept for parity.
    async stream() {
      throw new Error("mock provider serves images by direct URL");
    },
  };
}
