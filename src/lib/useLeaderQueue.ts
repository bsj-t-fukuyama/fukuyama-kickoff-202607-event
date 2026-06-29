import { useCallback, useEffect, useRef, useState } from "react";
import { fetchNext, reportPresentation, reportIdle, type QueueStats, type ScoredItem } from "./api";

const IDLE_RETRY_MS = 4_000; // how often to look for new photos while idle

// /main（大画面・主導）のキュー進行。従来どおりキューを歩いて写真を採点表示し、
// 写真が変わるたびにサーバーへ「いまこの index を表示開始した」と報告する。
// この報告を /view（参加者スマホ）がポーリングして追従する。
export function useLeaderQueue(enabled: boolean) {
  const [item, setItem] = useState<ScoredItem | null>(null);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const cursorRef = useRef(-1);
  const timerRef = useRef<number | undefined>(undefined);

  const advance = useCallback(async () => {
    try {
      const { item: next, stats: s } = await fetchNext(cursorRef.current);
      setStats(s);
      if (next) {
        // Preload so the photo is sharp the instant the scene mounts.
        const img = new Image();
        img.src = next.imageUrl;
        setItem(next);
      } else {
        setItem(null);
        timerRef.current = window.setTimeout(advance, IDLE_RETRY_MS);
      }
    } catch {
      timerRef.current = window.setTimeout(advance, IDLE_RETRY_MS);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    advance();
    return () => window.clearTimeout(timerRef.current);
  }, [enabled, advance]);

  // 写真が変わるたびに表示開始を報告（サーバーが開始時刻を刻む）。次の写真待ち
  // （item=null）になったらアイドルを報告し、/view も待機画面へ戻す。
  useEffect(() => {
    if (!enabled) return;
    if (item) reportPresentation(item.index).catch(() => {});
    else reportIdle().catch(() => {});
  }, [enabled, item]);

  const handleComplete = useCallback(() => {
    if (item) cursorRef.current = item.index;
    advance();
  }, [item, advance]);

  // 右下のスキップボタンから次の写真へ進む（画面クリックでは進まない）。
  const handleSkip = useCallback(() => {
    if (item) {
      window.clearTimeout(timerRef.current);
      handleComplete();
    }
  }, [item, handleComplete]);

  // 左下の戻るボタンから一つ前の写真へ。advance() は cursor+1 を取りに行くので、
  // 「前の写真の手前」に cursor を巻き戻してから advance する。
  const handlePrev = useCallback(() => {
    if (!item || item.index <= 0) return;
    window.clearTimeout(timerRef.current);
    cursorRef.current = item.index - 2;
    advance();
  }, [item, advance]);

  return { item, stats, handleComplete, handleSkip, handlePrev };
}
