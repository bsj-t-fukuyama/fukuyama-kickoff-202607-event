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
export const DEFAULT_FLOOR = 10;

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

// --- にぎやかさ（人数）軸の共有ロジック（AI判定・ダミー双方で使う） ----------
// にぎやかさ軸の値(0..100)を、実際の人数だけで細かく決める。写り方や占有率では
// 増減させない（純粋に頭数）。1人ごとに段差、多いほど高得点・多人数で頭打ち。
// 大人数（特に10人以上の集合写真）をしっかり優遇するカーブ:
//   1人は控えめ、2〜5人はやや控えめ、6〜9人は標準、9→10で大きく伸ばし12〜13人で頭打ち。
//   0→20 / 1→32 / 2→45 / 3→55 / 4→64 / 5→71 / 6→78 / 7→83 / 8→87 / 9→90 / 10→95 / 11→97 / 12→99
const PEOPLE_COUNT_TABLE = {
  1: 32, 2: 45, 3: 55, 4: 64, 5: 71, 6: 78, 7: 83, 8: 87, 9: 90, 10: 95, 11: 97, 12: 99,
};
export function peopleScoreFromCount(n) {
  if (!Number.isFinite(n) || n <= 0) return 20; // 祝う相手がいない
  if (n <= 12) return PEOPLE_COUNT_TABLE[n];
  return Math.min(100, 99 + (n - 12)); // 13人以降は微増、100で頭打ち
}

// 画像IDから決まる安定した擬似乱数で [-range, +range] のブレを返す。
// 同じ写真なら毎回同じ値（採点が暴れない）。にぎやかさ点に“面白さ”を足す用。
export function seededJitter(seed, range) {
  let h = 2166136261;
  const str = String(seed);
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h += 0x6d2b79f5;
  let t = h;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296; // 0..1
  return Math.round((r * 2 - 1) * range); // [-range, +range]
}

// 人数の“面白さ”ブレ幅（±3点）。
export const PEOPLE_FUN_JITTER = 3;

// 人数 → にぎやかさ軸の値(0..100)。素点＋画像ごとに安定した面白さブレ。
export function peopleAxisValue(peopleCount, seed) {
  return peopleScoreFromCount(peopleCount) + seededJitter(`${seed}:people`, PEOPLE_FUN_JITTER);
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

  // ダミーは画素を見ないので“それっぽい”人数を擬似生成する（モック専用）。
  // 1〜6人を中心に分布させ、にぎやかさ軸は AI 判定と同じく人数連動にする。
  const peopleCount = 1 + Math.floor(rand() * 6); // 1..6
  values.people = peopleAxisValue(peopleCount, item.id);

  const result = composeResult(values, { weights, floor });

  // AI 判定と同じ shape を返すため signals も用意する（UI のチップ/人数表示用）。
  // ※これはモックの推定値で、実際の画素判定ではない点に注意。
  const signals = {
    peopleCount,
    personDetected: peopleCount > 0,
    multiplePeople: peopleCount >= 2,
    smiling: rand() > 0.4,
    posing: rand() > 0.6,
    instagramWorthy: rand() > 0.5,
    faceClarity: rand() > 0.4,
    note: "ナイスショット！",
  };

  return { ...result, signals };
}
