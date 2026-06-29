import { useEffect, useRef, useState } from "react";
import { fetchNext, fetchPresentation, type QueueStats, type ScoredItem } from "./api";

const POLL_MS = 800; // 上演状態を見に行く間隔（写真切替への追従の速さ）

// /view（参加者スマホ・追従）のキュー。自分ではキューを歩かず、/main が報告した
// 「現在の上演状態」をポーリングし、同じ写真を取得して“表示開始からの経過ぶん”
// 進めた状態（offsetMs）で再生する。これで /main とリアルタイムに揃う。
export function useFollowerQueue(enabled: boolean) {
  const [item, setItem] = useState<ScoredItem | null>(null);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [offsetMs, setOffsetMs] = useState(0);
  const shownIndexRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      shownIndexRef.current = null;
      return;
    }
    let alive = true;
    let timer: number | undefined;

    const poll = async () => {
      try {
        const pres = await fetchPresentation();
        if (alive) {
          if (pres.index == null) {
            // 主導側がまだ未開始 → 待機画面へ。
            if (shownIndexRef.current !== null) {
              shownIndexRef.current = null;
              setItem(null);
            }
          } else if (pres.index !== shownIndexRef.current) {
            // 新しい写真に追いつく: その index の写真を取得し、経過ぶん進めて再生。
            const { item: it, stats: s } = await fetchNext(pres.index - 1);
            if (alive && it) {
              shownIndexRef.current = pres.index;
              const elapsed =
                pres.startedAt != null ? Math.max(0, pres.now - pres.startedAt) : 0;
              setOffsetMs(elapsed);
              setStats(s);
              setItem(it);
            }
          }
        }
      } catch {
        /* 次のポーリングで自然回復 */
      }
      if (alive) timer = window.setTimeout(poll, POLL_MS);
    };

    poll();
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [enabled]);

  return { item, stats, offsetMs };
}
