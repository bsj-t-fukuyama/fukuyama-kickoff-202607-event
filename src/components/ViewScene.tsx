import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import type { ScoredItem } from "../lib/api";
import { pickComment } from "../lib/comments";
import { useScoringClock } from "../lib/useScoringClock";
import { computeBreakdown } from "../lib/breakdown";
import PhotoCard from "./PhotoCard";
import ScoreGauge from "./ScoreGauge";
import RevealOverlay from "./RevealOverlay";

// 観覧専用・モバイル特化のスキャン画面（/view）。
//
// /main(ScoringScene) と同じ部品・同じ採点クロック・同じ内訳ロジックを使い、
// 見た目を揃えたまま縦長(スマホ)向けに縦積みでレイアウトし直したもの。操作系
// （設定/結果/前へ/次へ/スキップ）は一切描画しない＝スキャンの様子を眺めるだけ。
// 内訳は右スライドではなく下からのボトムシートで出す（スマホで読みやすい）。

const REVEAL_LABEL: Record<string, string> = {
  S: "PERFECT SHOT",
  A: "EXCELLENT",
  B: "NICE",
  C: "GOOD TRY",
  D: "KEEP GOING",
};

export default function ViewScene({
  item,
  durationMs,
  onComplete,
  offsetMs = 0,
}: {
  item: ScoredItem;
  durationMs: number;
  onComplete: () => void;
  // /main の表示開始からの経過(ms)。これだけ進めた状態で再生し、リアルタイム同期する。
  offsetMs?: number;
}) {
  const { display, fraction, scanning, revealed } = useScoringClock(
    item.score,
    durationMs,
    onComplete,
    offsetMs,
  );

  const comment = useMemo(
    () => pickComment(item.score, `${item.id}:${item.score}`),
    [item.id, item.score],
  );

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <div style={styles.theme}>BRAVE THROUGH</div>
      </div>

      <div style={styles.photoArea}>
        <PhotoCard item={item} scanning={scanning} />
      </div>

      <div style={styles.gaugeArea}>
        <ScoreGauge display={display} fraction={fraction} grade={item.grade} revealed={revealed} />
        <div style={styles.statusLine} className="mono">
          <AnimatePresence mode="wait">
            {revealed ? (
              <motion.span
                key="grade"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ color: "var(--blue-glow)", letterSpacing: "0.28em" }}
              >
                {REVEAL_LABEL[item.grade] ?? "RESULT"}
              </motion.span>
            ) : (
              <motion.span
                key="analyzing"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.4, 1, 0.4] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, repeat: Infinity }}
                style={{ letterSpacing: "0.28em" }}
              >
                ANALYZING…
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      <RevealOverlay
        compact
        show={revealed}
        score={item.score}
        badge={comment.badge}
        line={comment.line}
      />

      <MobileBreakdown item={item} revealed={revealed} />
    </div>
  );
}

// 下からのボトムシート（CriteriaWidget のモバイル版）。
// つまみ(ハンドル)を上下にスワイプ、またはタップで開閉できる。最小化すると下部に
// バーだけ残り、上にスワイプ/タップで戻せる。最小化状態は localStorage に保存し、
// 次の写真でも維持する（毎回せり上がって写真を隠さないように）。
const COLLAPSE_KEY = "view.breakdown.collapsed";

function MobileBreakdown({ item, revealed }: { item: ScoredItem; revealed: boolean }) {
  const { rows } = computeBreakdown(item);
  const s = item.signals;
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
    } catch {
      /* noop */
    }
  }, [collapsed]);

  // スワイプ方向で開閉（上方向=開く / 下方向=閉じる）。
  const onDragEnd = (_e: unknown, info: PanInfo) => {
    if (info.offset.y < -28 || info.velocity.y < -250) setCollapsed(false);
    else if (info.offset.y > 28 || info.velocity.y > 250) setCollapsed(true);
  };

  return (
    <AnimatePresence>
      {revealed && (
        <motion.aside
          key="sheet"
          style={sheetStyles.sheet}
          initial={{ y: "110%" }}
          animate={{ y: 0 }}
          exit={{ y: "110%" }}
          transition={{ type: "spring", stiffness: 240, damping: 30 }}
        >
          {/* つまみ: タップで開閉、上下スワイプでも開閉 */}
          <motion.div
            style={sheetStyles.handle}
            onClick={() => setCollapsed((c) => !c)}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragSnapToOrigin
            dragElastic={0.5}
            onDragEnd={onDragEnd}
            aria-label={collapsed ? "内訳を開く" : "内訳を隠す"}
          >
            <div style={sheetStyles.grip} />
            <div style={sheetStyles.handleLabel}>
              {collapsed ? "得点の内訳を見る ▲" : "内訳を隠す ▼"}
            </div>
          </motion.div>

          {/* 折りたたみ領域: 最小化で高さ0へアニメーション */}
          <motion.div
            style={sheetStyles.collapsible}
            initial={false}
            animate={{ height: collapsed ? 0 : "auto", opacity: collapsed ? 0 : 1 }}
            transition={{ type: "tween", duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
          >
            <div style={sheetStyles.rows}>
              {rows.map((row) => (
                <div key={row.key} style={sheetStyles.block}>
                  <div style={sheetStyles.axisTop}>
                    <span style={sheetStyles.axisName}>
                      {row.label}
                      {row.key === "people" && (
                        <span style={sheetStyles.peopleCount}>
                          （{typeof s?.peopleCount === "number" ? `${s.peopleCount}人` : "No entry"}）
                        </span>
                      )}
                    </span>
                    <span style={sheetStyles.points}>
                      <span className="tnum">{row.points}</span>
                      <span style={sheetStyles.pointsMax}> / {row.max}</span>
                    </span>
                  </div>
                  <div style={sheetStyles.track}>
                    <div
                      style={{
                        ...sheetStyles.fill,
                        width: `${(row.points / (row.max || 1)) * 100}%`,
                        background: row.color,
                        boxShadow: `0 0 10px ${row.color}aa`,
                      }}
                    />
                  </div>
                  <div style={sheetStyles.descRow}>
                    <span style={{ ...sheetStyles.mark, color: row.color }}>
                      {row.symbol} {row.markLabel}
                    </span>
                    <span style={sheetStyles.desc}>{row.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "clamp(0.8rem, 2.5vh, 1.6rem) clamp(0.8rem, 4vw, 1.4rem)",
    gap: "clamp(0.6rem, 1.8vh, 1.2rem)",
  },
  header: { width: "100%", display: "grid", gap: "0.3rem", textAlign: "center" },
  theme: {
    fontSize: "clamp(1.4rem, 6vw, 2.4rem)",
    fontWeight: 800,
    letterSpacing: "-0.02em",
    background: "linear-gradient(180deg, #fff, var(--blue-glow))",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  // 写真は使える縦領域をできるだけ占有（PhotoCard が比率を保って最大表示する）。
  photoArea: { flex: 1, minHeight: 0, width: "100%", display: "flex" },
  gaugeArea: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.4rem",
  },
  statusLine: { fontSize: "clamp(0.8rem, 3vw, 1.05rem)", minHeight: "1.4em" },
};

const sheetStyles: Record<string, React.CSSProperties> = {
  sheet: {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10001,
    display: "flex",
    flexDirection: "column",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    background: "linear-gradient(180deg, rgba(8,14,32,0.98), rgba(6,10,24,0.99))",
    borderTop: "1px solid rgba(120,170,255,0.28)",
    boxShadow: "0 -24px 60px rgba(0,0,0,0.6)",
  },
  // つまみ（常に見える）。ドラッグで開閉するので縦スクロールを奪わないよう touchAction:none。
  handle: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 5,
    padding: "10px 0 8px",
    cursor: "grab",
    touchAction: "none",
    userSelect: "none",
  },
  grip: {
    width: 44,
    height: 5,
    borderRadius: 99,
    background: "rgba(160,195,255,0.45)",
  },
  handleLabel: {
    fontSize: "0.72rem",
    fontWeight: 700,
    letterSpacing: "0.06em",
    color: "var(--blue-glow)",
  },
  collapsible: { overflow: "hidden" },
  rows: {
    display: "flex",
    flexDirection: "column",
    gap: "clamp(0.6rem, 1.6vh, 1rem)",
    maxHeight: "72vh",
    overflowY: "auto",
    // 右下の「投稿する」ボタンに最後の項目の点数が隠れないよう下に余白を確保する
    // （シートの高さが少し大きくなってよい＝点数がボタンの上に逃げる）。
    padding: "0.2rem clamp(0.9rem, 4vw, 1.4rem) calc(env(safe-area-inset-bottom) + 96px)",
  },
  block: { display: "grid", gap: "0.3rem" },
  axisTop: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "0.6rem" },
  axisName: { fontSize: "clamp(1rem, 4.4vw, 1.4rem)", fontWeight: 700, color: "var(--text)" },
  peopleCount: {
    fontSize: "0.62em",
    fontWeight: 500,
    color: "var(--text-dim)",
    opacity: 0.55,
    marginLeft: "0.15em",
  },
  points: {
    display: "flex",
    alignItems: "baseline",
    color: "var(--blue-glow)",
    fontSize: "clamp(1.8rem, 9vw, 3rem)",
    fontWeight: 900,
    lineHeight: 0.85,
    letterSpacing: "-0.03em",
    textShadow: "0 0 18px rgba(56,182,255,0.45)",
  },
  pointsMax: { fontSize: "clamp(0.7rem, 3vw, 1rem)", fontWeight: 600, color: "var(--text-dim)" },
  track: {
    height: "clamp(7px, 1.4vw, 11px)",
    borderRadius: 99,
    background: "rgba(120,170,255,0.14)",
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 99 },
  descRow: { display: "flex", alignItems: "baseline", gap: "0.6rem", flexWrap: "wrap" },
  mark: { fontSize: "clamp(0.78rem, 3.2vw, 1.05rem)", fontWeight: 800, letterSpacing: "0.02em" },
  desc: { fontSize: "clamp(0.78rem, 3.2vw, 1.05rem)", color: "rgba(220,235,255,0.85)" },
};
