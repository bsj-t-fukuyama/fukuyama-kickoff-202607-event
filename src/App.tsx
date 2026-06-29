import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLeaderQueue } from "./lib/useLeaderQueue";
import { useFollowerQueue } from "./lib/useFollowerQueue";
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
import PostUpload from "./components/PostUpload";
import NotFound from "./components/NotFound";

const SCORING_MS = 10_000; // one judging animation
const MAIN_PATH = "/main"; // 採点メイン画面の階層（これ以外の未定義パスは404）
const VIEW_PATH = "/view"; // 観覧専用・モバイル向けスキャン画面（操作不可）
const RESULT_PATH = "/result"; // 結果発表（暫定）画面の階層
const SETTINGS_PATH = "/settings"; // 設定画面の階層

const noop = () => {};

export default function App() {
  // ルーティング: ルータ未使用なので pathname を state で持ち、pushState で遷移する。
  const [path, setPath] = useState<string>(() => window.location.pathname);

  const onMain = path === MAIN_PATH;
  const onView = path === VIEW_PATH;
  const onResult = path === RESULT_PATH;
  const onSettings = path === SETTINGS_PATH;

  // /main は主導（キューを歩いて採点・上演状態を報告）、/view は追従（/main に同期）。
  const leader = useLeaderQueue(onMain);
  const follower = useFollowerQueue(onView);

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
            {/* 観覧専用: 操作ボタンは一切出さない。/main にリアルタイム追従する。 */}
            {follower.item ? (
              <ViewScene
                key={follower.item.id}
                item={follower.item}
                durationMs={SCORING_MS}
                offsetMs={follower.offsetMs}
                onComplete={noop}
              />
            ) : (
              <IdleScreen stats={follower.stats} hideStats />
            )}
            {/* 観覧画面からも結果発表（暫定）へ遷移できるよう右上にボタンを置く。 */}
            <ResultsButton onOpen={() => navigate(RESULT_PATH)} />
            {/* 参加者は右下のボタンからスマホの写真を投稿できる。 */}
            <PostUpload />
          </motion.div>
        ) : onMain ? (
          <motion.div
            key="main"
            style={{ height: "100%" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          >
            {leader.item ? (
              <ScoringScene
                key={leader.item.id}
                item={leader.item}
                stats={leader.stats}
                durationMs={SCORING_MS}
                onComplete={leader.handleComplete}
              />
            ) : (
              <IdleScreen stats={leader.stats} />
            )}
            <SettingsButton onOpen={() => navigate(SETTINGS_PATH)} />
            <ResultsButton onOpen={() => navigate(RESULT_PATH)} />
            {leader.item && leader.item.index > 0 && <PrevButton onPrev={leader.handlePrev} />}
            {leader.item && <SkipButton onSkip={leader.handleSkip} />}
          </motion.div>
        ) : (
          <NotFound key="404" onHome={() => navigate(MAIN_PATH)} />
        )}
      </AnimatePresence>
    </Background>
  );
}
