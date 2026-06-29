import type { ScoredItem } from "./api";

// 採点内訳の共有ロジック。CriteriaWidget（/main の右パネル）と
// ViewScene（/view のモバイル内訳）で同じ点数配分・評価を使う。

export type Mark = "good" | "normal" | "hmm";

export const MARKS: Record<Mark, { symbol: string; label: string; color: string }> = {
  good: { symbol: "◎", label: "good", color: "#ffd24d" },
  normal: { symbol: "○", label: "normal", color: "#38b6ff" },
  hmm: { symbol: "△", label: "hmm…", color: "#7d93b8" },
};

// Per-axis, per-bucket descriptor. All phrasing stays positive (傷つかない).
export const AXIS_DESC: Record<string, Record<Mark, string>> = {
  mood: { good: "はじける笑顔！", normal: "いい表情", hmm: "クールに決め顔" },
  people: { good: "大人数で迫力", normal: "みんなで写ってる", hmm: "少人数でしっとり" },
  composition: { good: "奥行きが見事", normal: "バランス良好", hmm: "味のある構図" },
  clarity: { good: "くっきり鮮明", normal: "しっかり見える", hmm: "やわらかい写り" },
};

// Score buckets (axis values live in 10..100 thanks to the FLOOR).
export function bucketFor(value: number): Mark {
  if (value >= 80) return "good";
  if (value >= 60) return "normal";
  return "hmm";
}

// Split `total` into integers proportional to `raw`, guaranteeing the parts sum
// to exactly `total` (largest-remainder / Hamilton apportionment).
export function apportion(raw: number[], total: number): number[] {
  const floors = raw.map(Math.floor);
  const remainder = total - floors.reduce((a, b) => a + b, 0);
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  const out = [...floors];
  for (let k = 0; k < remainder && k < order.length; k++) out[order[k].i] += 1;
  return out;
}

export type BreakdownRow = {
  key: string;
  label: string;
  value: number;
  points: number;
  max: number;
  mark: Mark;
  color: string;
  symbol: string;
  markLabel: string;
  desc: string;
};

// item から各軸の表示用データ（配点・到達点・評価マーク・コメント）を算出する。
export function computeBreakdown(item: ScoredItem): { rows: BreakdownRow[]; points: number[] } {
  // Each axis's max share follows its weight (normally an even 25 each; the
  // にぎやかさ axis grows for 大人数 photos because the server boosts its weight).
  const totalWeight = item.breakdown.reduce((s, a) => s + (a.weight ?? 0), 0) || 1;
  const shares = item.breakdown.map((a) => ((a.weight ?? 0) / totalWeight) * 100);
  const maxShares = shares.map((sh) => Math.round(sh));
  const rawPoints = item.breakdown.map((a, i) => (a.value / 100) * shares[i]);
  const points = apportion(rawPoints, item.score);

  const rows = item.breakdown.map((axis, i) => {
    const mark = bucketFor(axis.value);
    const m = MARKS[mark];
    return {
      key: axis.key,
      label: axis.label,
      value: axis.value,
      points: points[i],
      max: maxShares[i],
      mark,
      color: m.color,
      symbol: m.symbol,
      markLabel: m.label,
      desc: AXIS_DESC[axis.key]?.[mark] ?? "",
    };
  });

  return { rows, points };
}
