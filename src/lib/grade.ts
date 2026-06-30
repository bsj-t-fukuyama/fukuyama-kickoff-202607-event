// 総合点 → グレード。server/scorer/index.js の gradeFor と同じ閾値。
// ボーナス演出で点数がせり上がる途中、表示中の数値からグレードを出すのに使う。
export type Grade = "S" | "A" | "B" | "C" | "D";

export function gradeFor(score: number): Grade {
  if (score >= 90) return "S";
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 45) return "C";
  return "D";
}
