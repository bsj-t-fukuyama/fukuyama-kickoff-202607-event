import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { fetchNext, type QueueStats, type ScoredItem } from "./lib/api";
import Background from "./components/Background";
import IdleScreen from "./components/IdleScreen";
import ScoringScene from "./components/ScoringScene";
import ViewScene from "./components/ViewScene";
import ResultScreen from "./components/ResultScreen";
import ResultsButton from "./components/ResultsButton";
import SkipButton from "./components/SkipButton";
import PrevButton from "./components/PrevButton";
import SettingsScreen from "./components/SettingsScreen";
import SettingsButton from "./components/SettingsButton";
import NotFound from "./components/NotFound";

const SCORING_MS = 10_000; // one judging animation
const IDLE_RETRY_MS = 4_000; // how often to look for new photos while idle
const MAIN_PATH = "/main"; // 採点メイン画面の階層（これ以外の未定義パスは404）
const VIEW_PATH = "/view"; // 観覧専用・モバイル向けスキャン画面（操作不可）
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

  // 左下の戻るボタンから一つ前の写真へ。advance() は cursor+1 を取りに行くので、
  // 「前の写真の手前」に cursor を巻き戻してから advance する。
  const handlePrev = useCallback(() => {
    if (!item || item.index <= 0) return;
    window.clearTimeout(timerRef.current);
    cursorRef.current = item.index - 2;
    advance();
  }, [item, advance]);

  const onMain = path === MAIN_PATH;
  const onView = path === VIEW_PATH;
  const onResult = path === RESULT_PATH;
  const onSettings = path === SETTINGS_PATH;

  return (
    <Background>
      <AnimatePresence mode="wait">
        {onResult ? (
          <ResultScreen key="result" onBack={() => navigate(MAIN_PATH)} />
        ) : onSettings ? (
          <SettingsScreen key="settings" onBack={() => navigate(MAIN_PATH)} />
        ) : onView ? (
          <motion.div
            key="view"
            style={{ height: "100%" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          >
            {/* 観覧専用: 操作ボタンは一切出さない。スキャンの様子だけが見える。 */}
            {item ? (
              <ViewScene
                key={item.id}
                item={item}
                stats={stats}
                durationMs={SCORING_MS}
                onComplete={handleComplete}
              />
            ) : (
              <IdleScreen stats={stats} />
            )}
          </motion.div>
        ) : onMain ? (
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
            {item && item.index > 0 && <PrevButton onPrev={handlePrev} />}
            {item && <SkipButton onSkip={handleSkip} />}
          </motion.div>
        ) : (
          <NotFound key="404" onHome={() => navigate(MAIN_PATH)} />
        )}
      </AnimatePresence>
    </Background>
  );
}
