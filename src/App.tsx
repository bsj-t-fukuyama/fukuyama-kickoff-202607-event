import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { fetchNext, type QueueStats, type ScoredItem } from "./lib/api";
import Background from "./components/Background";
import IdleScreen from "./components/IdleScreen";
import ScoringScene from "./components/ScoringScene";
import ResultScreen from "./components/ResultScreen";
import ResultsButton from "./components/ResultsButton";
import SkipButton from "./components/SkipButton";
import SettingsScreen from "./components/SettingsScreen";
import SettingsButton from "./components/SettingsButton";

const SCORING_MS = 10_000; // one judging animation
const IDLE_RETRY_MS = 4_000; // how often to look for new photos while idle
const RESULT_PATH = "/result"; // 結果発表（暫定）画面の階層
const SETTINGS_PATH = "/settings"; // 設定画面の階層

export default function App() {
  const [item, setItem] = useState<ScoredItem | null>(null);
  const [stats, setStats] = useState<QueueStats | null>(null);
  // ルーティング: ルータ未使用なので pathname を state で持ち、pushState で遷移する。
  const [path, setPath] = useState<string>(() => window.location.pathname);
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

  // ブラウザの戻る/進むにも追従する。
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((to: string) => {
    if (window.location.pathname !== to) window.history.pushState({}, "", to);
    setPath(to);
  }, []);

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

  const onResult = path === RESULT_PATH;
  const onSettings = path === SETTINGS_PATH;

  return (
    <Background>
      <AnimatePresence mode="wait">
        {onResult ? (
          <ResultScreen key="result" onBack={() => navigate("/")} />
        ) : onSettings ? (
          <SettingsScreen key="settings" onBack={() => navigate("/")} />
        ) : (
          <motion.div
            key="main"
            style={{ height: "100%" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          >
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
            <SettingsButton onOpen={() => navigate(SETTINGS_PATH)} />
            <ResultsButton onOpen={() => navigate(RESULT_PATH)} />
            {item && <SkipButton onSkip={handleSkip} />}
          </motion.div>
        )}
      </AnimatePresence>
    </Background>
  );
}
