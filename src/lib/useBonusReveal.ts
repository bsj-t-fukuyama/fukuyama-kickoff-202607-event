import { useEffect, useState } from "react";
import type { BraveThroughBonus } from "./api";

// BRAVE THROUGH ボーナスの“せり上がり演出”を仕切るフック。
//
// 採点クロックが reveal（点数確定）に達したら、まず低い点（from）をしばらく見せ、
// 続いて「BRAVE THROUGH」が左→右へ駆け抜け、最後に点数が from→to までせり上がる。
//
//   idle → hold（低い点を見せる）→ sweep（テキスト横断）→ rising（点数上昇）→ done
//
// ボーナス未発動(active=false)のときは何もせず value=null（呼び出し側は通常の
// クロック表示をそのまま使う）。コンポーネントは写真ごとに key で作り直されるので、
// 写真が変われば状態は自然にリセットされる。
export type BonusPhase = "idle" | "hold" | "sweep" | "rising" | "done";

const HOLD_MS = 900; // 低い点をいったん見せる“ため”
const SWEEP_MS = 1500; // BRAVE THROUGH が画面を横断する時間
const RISE_MS = 1700; // 点数がせり上がる時間

const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);

export type BonusReveal = {
  active: boolean;
  phase: BonusPhase;
  // 演出中に“表示すべき点数”。null の間は通常クロックの表示値を使う。
  value: number | null;
};

export function useBonusReveal(
  bonus: BraveThroughBonus | undefined,
  revealed: boolean,
): BonusReveal {
  const active = !!bonus?.applied;
  const [phase, setPhase] = useState<BonusPhase>("idle");
  const [value, setValue] = useState<number | null>(null);

  useEffect(() => {
    if (!active || !revealed || !bonus) return;
    const { from, to } = bonus;
    setValue(from);
    setPhase("hold");

    let raf = 0;
    const t1 = window.setTimeout(() => setPhase("sweep"), HOLD_MS);
    const t2 = window.setTimeout(() => {
      setPhase("rising");
      const start = Date.now();
      const loop = () => {
        const e = Math.min(1, (Date.now() - start) / RISE_MS);
        setValue(Math.round(from + (to - from) * easeOutCubic(e)));
        if (e < 1) {
          raf = requestAnimationFrame(loop);
        } else {
          setValue(to);
          setPhase("done");
        }
      };
      raf = requestAnimationFrame(loop);
    }, HOLD_MS + SWEEP_MS);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      cancelAnimationFrame(raf);
    };
  }, [active, revealed, bonus]);

  return { active, phase, value };
}
