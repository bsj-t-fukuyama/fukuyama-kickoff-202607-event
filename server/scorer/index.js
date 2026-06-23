// Pluggable scorer.
//
// This DUMMY implementation does not look at the pixels — it just produces
// stable, good-looking numbers per image. The real pixel-judging scorer lives
// in ./aiScorer.js (Claude vision); both return the same shape and share the
// weighting + FLOOR math in composeResult() below, so the rest of the app never
// needs to know which one ran.
//
//   scoreImage(item, { theme, weights, floor }) -> {
//     score:     number 0..100,
//     grade:     "S" | "A" | "B" | "C" | "D",
//     breakdown: [{ key, label, value /* 0..100 */, weight }]
//   }
//
// `item` is a queue item: { id, name, imageUrl, ... }.
//
// The four judging axes are defined in README-SCORING.md:
//   みんなで・楽しく・気持ちよく・はっきり 写っているか。

export const AXES = [
  { key: "mood", label: "笑顔・表情" },
  { key: "people", label: "にぎやかさ（人数）" },
  { key: "composition", label: "構図・遠近感" },
  { key: "clarity", label: "写りの良さ" },
];

// Default lowest per-axis score. Mirrors config.scoreFloor; kept here so the
// scorer also works standalone. We add points on top of this floor (加点方式)
// instead of deducting, so no photo is publicly humiliated.
export const DEFAULT_FLOOR = 50;

// Deterministic 0..1 hash from a string so the same image always scores the same.
function seededRandom(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gradeFor(score) {
  if (score >= 90) return "S";
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 45) return "C";
  return "D";
}

// Turn raw 0..100 per-axis values into the final scored result. Each axis is
// clamped up to `floor` (加点方式 — never below the floor) then weighted per
// README-SCORING.md. Shared by the dummy scorer and the AI judge so the math
// and the kindness floor stay identical no matter which one produced the values.
export function composeResult(values, { weights, floor = DEFAULT_FLOOR } = {}) {
  let weightedSum = 0;
  let weightTotal = 0;
  const breakdown = AXES.map((axis) => {
    const raw = Number(values[axis.key]);
    const safe = Number.isFinite(raw) ? raw : floor;
    const value = Math.round(Math.max(floor, Math.min(100, safe)));
    const weight = weights?.[axis.key] ?? 0;
    weightedSum += value * weight;
    weightTotal += weight;
    return { key: axis.key, label: axis.label, value, weight };
  });

  const score = Math.round(weightTotal > 0 ? weightedSum / weightTotal : 0);
  return { score, grade: gradeFor(score), breakdown };
}

export function scoreImage(item, { theme, weights, floor = DEFAULT_FLOOR }) {
  const rand = seededRandom(`${item.id}:${theme}`);
  // 加点方式: every axis starts from `floor` and earns the remaining headroom.
  const values = {};
  for (const axis of AXES) values[axis.key] = floor + rand() * (100 - floor);
  return composeResult(values, { weights, floor });
}
