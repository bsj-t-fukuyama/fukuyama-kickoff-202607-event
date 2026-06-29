import { useEffect, useRef, useState } from "react";

// 採点アニメの共有クロック。/main（ScoringScene）と /view（ViewScene）で
// 全く同じタイミング・数値推移にするため、ここに一本化する。
//
// Phase boundaries as fractions of the total duration (SCORING_MS = 10s). The
// reveal (after SETTLE_END) holds for the rest of the time so the score lingers.
export const INTRO_END = 0.08;
export const ANALYZE_END = 0.2;
export const SETTLE_END = 0.37;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);

export type ScoringClock = {
  display: number; // 表示中のスコア（アニメ中はジッター→最終値へ）
  p: number; // 0..1 全体進捗
  fraction: number; // 0..1 ゲージ充填率
  scanning: boolean;
  revealed: boolean;
};

// `score` の写真を `durationMs` かけて採点演出し、終わったら onComplete()。
// offsetMs > 0 のときは、その経過時間ぶん進んだ状態から再生する（/view が /main に
// リアルタイム追従するため、表示開始からの経過ぶんだけ先に進めて同期する用途）。
export function useScoringClock(
  score: number,
  durationMs: number,
  onComplete: () => void,
  offsetMs = 0,
): ScoringClock {
  const [display, setDisplay] = useState(0);
  const [p, setP] = useState(0);
  const settleStartVal = useRef<number | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    let raf = 0;
    let start = 0;

    const tick = (now: number) => {
      if (!start) start = now;
      const elapsed = now - start + offsetMs;
      const prog = Math.min(1, elapsed / durationMs);
      setP(prog);

      let value: number;
      if (prog < INTRO_END) {
        value = 0;
      } else if (prog < ANALYZE_END) {
        // Energetic jitter while "analyzing".
        const step = Math.floor(elapsed / 60);
        value = Math.abs((step * 9301 + 49297) % 100);
      } else if (prog < SETTLE_END) {
        if (settleStartVal.current == null) settleStartVal.current = display;
        const e = easeOutCubic((prog - ANALYZE_END) / (SETTLE_END - ANALYZE_END));
        value = Math.round(lerp(settleStartVal.current, score, e));
      } else {
        value = score;
      }
      setDisplay(value);

      if (prog >= 1) {
        if (!doneRef.current) {
          doneRef.current = true;
          onComplete();
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fraction = Math.max(0, Math.min(1, display / 100));
  return { display, p, fraction, scanning: p < SETTLE_END, revealed: p >= SETTLE_END };
}
