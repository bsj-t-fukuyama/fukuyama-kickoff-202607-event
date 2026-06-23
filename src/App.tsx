import { useCallback, useEffect, useRef, useState } from "react";
import { fetchNext, type QueueStats, type ScoredItem } from "./lib/api";
import Background from "./components/Background";
import IdleScreen from "./components/IdleScreen";
import ScoringScene from "./components/ScoringScene";

const SCORING_MS = 10_000; // one judging animation
const IDLE_RETRY_MS = 4_000; // how often to look for new photos while idle

export default function App() {
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
    advance();
    return () => window.clearTimeout(timerRef.current);
  }, [advance]);

  const handleComplete = useCallback(() => {
    if (item) cursorRef.current = item.index;
    advance();
  }, [item, advance]);

  // Click (glove tap) anywhere skips straight to the next photo.
  const handleClick = useCallback(() => {
    if (item) {
      window.clearTimeout(timerRef.current);
      handleComplete();
    }
  }, [item, handleComplete]);

  return (
    <Background onClick={handleClick}>
      {item ? (
        <ScoringScene
          key={item.id}
          item={item}
          stats={stats}
          durationMs={SCORING_MS}
          onComplete={handleComplete}
        />
      ) : (
        <IdleScreen stats={stats} />
      )}
    </Background>
  );
}
