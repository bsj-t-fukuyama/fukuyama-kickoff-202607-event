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
export const DEFAULT_FLOOR = 8;

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
// 表示は にぎやかさ=40点満点なので「値 × 0.4 ≒ 表示点」。狙う表示点（±3点のブレ込み）:
//   0人 → 5点以下（無人は最低水準）
//   1人 → 5〜9点（0/1人は必ず9点より下）
//   3〜19人 → ボリュームゾーン。人数で段差をつけてしっかり差別化（約12〜33点）
//   20人以上 → 35点以上（大人数の集合写真を強く優遇）
//   0→8 / 1→16 / 2→24 / 3→31 / 4→37 / 5→43 / 6→48 / 7→53 / 8→57 / 9→61 / 10→65
//   11→68 / 12→71 / 13→73 / 14→75 / 15→77 / 16→79 / 17→80 / 18→81 / 19→82 / 20+→95〜100
const PEOPLE_COUNT_TABLE = {
  0: 8, 1: 16, 2: 24, 3: 31, 4: 37, 5: 43, 6: 48, 7: 53, 8: 57, 9: 61, 10: 65,
  11: 68, 12: 71, 13: 73, 14: 75, 15: 77, 16: 79, 17: 80, 18: 81, 19: 82,
};
export function peopleScoreFromCount(n) {
  if (!Number.isFinite(n) || n <= 0) return PEOPLE_COUNT_TABLE[0]; // 祝う相手がいない
  if (n <= 19) return PEOPLE_COUNT_TABLE[n];
  return Math.min(100, 95 + (n - 20)); // 20人以上は35点以上の高得点ゾーン、100で頭打ち
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

// --- BRAVE THROUGH ボーナス --------------------------------------------------
// 50点以下の写真への救済チャンス。10% の確率で 70〜91点へ“格上げ”する（同じ写真
// なら毎回同じ＝seed 固定）。格上げ時は、足りない得点を各軸へ按分して帳尻を合わせる:
// どの軸も 100 へ向けて同じ割合 t だけ引き上げると重み付き平均がちょうど目標点になり、
// かつどの軸も 100 を超えない（t = (target-from)/(100-from)）。結果の breakdown も
// この引き上げ後の値で作り直すので、表示点の合計は新しいスコアにぴったり一致する。
export const BONUS_THRESHOLD = 50; // この点数以下が対象
export const BONUS_CHANCE = 0.1; // 発動確率
export const BONUS_MIN = 70; // 格上げ後の下限
export const BONUS_MAX = 91; // 格上げ後の上限

export function maybeBraveThroughBonus(result, { weights, floor = DEFAULT_FLOOR, seed }) {
  if (!result || result.score > BONUS_THRESHOLD) return result;
  const rand = seededRandom(`${seed}:bravethrough`);
  if (rand() >= BONUS_CHANCE) return result;

  const from = result.score;
  const target = BONUS_MIN + Math.floor(rand() * (BONUS_MAX - BONUS_MIN + 1)); // 70..91
  const t = from >= 100 ? 0 : (target - from) / (100 - from);
  const boosted = {};
  for (const axis of result.breakdown) boosted[axis.key] = axis.value + t * (100 - axis.value);

  const composed = composeResult(boosted, { weights, floor });
  return { ...composed, bonus: { applied: true, from, to: composed.score } };
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

  const base = composeResult(values, { weights, floor });
  const result = maybeBraveThroughBonus(base, { weights, floor, seed: `${item.id}:${theme}` });

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
