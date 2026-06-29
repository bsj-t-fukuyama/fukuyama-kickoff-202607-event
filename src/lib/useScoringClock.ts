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

// バックグラウンドタブでも止まらない定期ティッカー。
// ブラウザは非表示タブの setTimeout/setInterval/requestAnimationFrame を強く
// スロットル（rAF は完全停止、タイマーは最終的に 1分に1回まで）するため、
// スロットルされない Web Worker のタイマーをフォールバックに使う。これで PC の
// /main が裏ウィンドウ・最小化・別タブにあっても採点が回り続ける。
function makeTicker(ms: number, onTick: () => void): () => void {
  if (typeof Worker !== "undefined") {
    try {
      const src =
        "let id=setInterval(function(){postMessage(0)}," +
        ms +
        ");onmessage=function(e){if(e.data==='stop'){clearInterval(id)}}";
      const url = URL.createObjectURL(new Blob([src], { type: "application/javascript" }));
      const w = new Worker(url);
      w.onmessage = () => onTick();
      return () => {
        try {
          w.postMessage("stop");
        } catch {
          /* noop */
        }
        w.terminate();
        URL.revokeObjectURL(url);
      };
    } catch {
      /* Worker が使えない環境は下の setInterval にフォールバック */
    }
  }
  const id = window.setInterval(onTick, ms);
  return () => window.clearInterval(id);
}

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
    let alive = true;
    let rafId = 0;
    // 経過は実時刻基準。タブが裏→表に戻っても正しい位置に追いつく（freeze しない）。
    const start = Date.now() - offsetMs;

    const compute = () => {
      if (!alive || doneRef.current) return;
      const elapsed = Date.now() - start;
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

      if (prog >= 1 && !doneRef.current) {
        doneRef.current = true;
        onComplete();
      }
    };

    // 可視時: requestAnimationFrame で滑らかに更新。
    const rafLoop = () => {
      if (!alive || doneRef.current) return;
      compute();
      if (!doneRef.current) rafId = requestAnimationFrame(rafLoop);
    };

    // 非表示時のフォールバック（Worker タイマー）。可視時は rAF に任せて二重更新を避ける。
    const stopTicker = makeTicker(200, () => {
      if (typeof document !== "undefined" && !document.hidden) return;
      compute();
    });

    const hidden = typeof document !== "undefined" && document.hidden;
    if (!hidden) rafLoop();

    // タブの表示/非表示が切り替わったら駆動方法を切り替える。
    const onVis = () => {
      if (doneRef.current) return;
      cancelAnimationFrame(rafId);
      if (!document.hidden) rafLoop(); // 表に戻ったら rAF を再開
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVis);
    }

    return () => {
      alive = false;
      cancelAnimationFrame(rafId);
      stopTicker();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVis);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fraction = Math.max(0, Math.min(1, display / 100));
  return { display, p, fraction, scanning: p < SETTLE_END, revealed: p >= SETTLE_END };
}
