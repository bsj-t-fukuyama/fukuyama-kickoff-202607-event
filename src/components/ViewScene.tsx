import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { QueueStats, ScoredItem } from "../lib/api";
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
  stats,
  durationMs,
  onComplete,
}: {
  item: ScoredItem;
  stats: QueueStats | null;
  durationMs: number;
  onComplete: () => void;
}) {
  const { display, fraction, scanning, revealed } = useScoringClock(
    item.score,
    durationMs,
    onComplete,
  );

  const comment = useMemo(
    () => pickComment(item.score, `${item.id}:${item.score}`),
    [item.id, item.score],
  );

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <div className="eyebrow">PICTURE SCORES · お題</div>
        <div style={styles.theme}>{stats?.theme ?? "—"}</div>
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

      <div style={styles.footer} className="mono">
        <span>SCANNED {stats?.shown ?? 0}</span>
        <span style={{ color: "var(--blue-glow)" }}>QUEUE {stats?.pending ?? 0}</span>
        <span>SRC {(stats?.provider ?? "—").toUpperCase()}</span>
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

// 下からスライドインする内訳ボトムシート（CriteriaWidget のモバイル版）。
const sheetVariants = {
  hidden: { y: "110%" },
  visible: {
    y: 0,
    transition: { type: "spring" as const, stiffness: 240, damping: 30, when: "beforeChildren" as const, staggerChildren: 0.07 },
  },
  exit: { y: "110%", transition: { duration: 0.3 } },
};
const rowVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.85 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 280, damping: 22 } },
};

function MobileBreakdown({ item, revealed }: { item: ScoredItem; revealed: boolean }) {
  const { rows, points } = computeBreakdown(item);
  const s = item.signals;

  return (
    <AnimatePresence>
      {revealed && (
        <motion.aside
          key="sheet"
          style={sheetStyles.sheet}
          variants={sheetVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <div style={sheetStyles.grip} />
          <motion.div style={sheetStyles.header} variants={rowVariants}>
            <span style={sheetStyles.title}>判定の内訳</span>
            <span style={sheetStyles.totalWrap}>
              <span className="tnum" style={sheetStyles.totalScore}>
                {item.score}
              </span>
              <span style={sheetStyles.gradeTag}>{item.grade}</span>
            </span>
          </motion.div>

          {rows.map((row) => (
            <motion.div key={row.key} style={sheetStyles.block} variants={rowVariants}>
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
            </motion.div>
          ))}

          <motion.div style={sheetStyles.sumRow} variants={rowVariants}>
            <span style={sheetStyles.sumLabel}>4軸の合計</span>
            <span style={sheetStyles.sumExpr}>
              {points.join(" + ")} ={" "}
              <span className="tnum" style={sheetStyles.sumTotal}>
                {item.score}
              </span>
              <span style={sheetStyles.sumUnit}>点</span>
            </span>
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
  footer: {
    display: "flex",
    gap: "clamp(1rem, 5vw, 2.2rem)",
    fontSize: "clamp(0.62rem, 2.6vw, 0.8rem)",
    color: "var(--text-dim)",
    letterSpacing: "0.12em",
    justifyContent: "center",
  },
};

const sheetStyles: Record<string, React.CSSProperties> = {
  sheet: {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10001,
    maxHeight: "70vh",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "clamp(0.6rem, 1.6vh, 1rem)",
    padding: "0.7rem clamp(0.9rem, 4vw, 1.4rem) clamp(1rem, 3vh, 1.6rem)",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    background: "linear-gradient(180deg, rgba(8,14,32,0.98), rgba(6,10,24,0.99))",
    borderTop: "1px solid rgba(120,170,255,0.28)",
    boxShadow: "0 -24px 60px rgba(0,0,0,0.6)",
  },
  grip: {
    width: 44,
    height: 5,
    borderRadius: 99,
    background: "rgba(160,195,255,0.35)",
    alignSelf: "center",
    marginBottom: "0.2rem",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: "0.8rem",
    paddingBottom: "0.5rem",
    borderBottom: "1px solid rgba(120,170,255,0.18)",
  },
  title: {
    fontSize: "clamp(1.1rem, 4.5vw, 1.5rem)",
    fontWeight: 800,
    letterSpacing: "0.03em",
    background: "linear-gradient(180deg, #fff, var(--blue-glow))",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  totalWrap: { display: "flex", alignItems: "baseline", gap: "0.4rem" },
  totalScore: {
    fontSize: "clamp(2rem, 9vw, 3rem)",
    fontWeight: 900,
    lineHeight: 0.9,
    letterSpacing: "-0.03em",
    background: "linear-gradient(180deg, #ffffff, #9fd2ff)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  gradeTag: { fontSize: "clamp(1.1rem, 5vw, 1.7rem)", fontWeight: 900, color: "var(--blue-glow)" },
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
  sumRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: "0.6rem",
    padding: "0.6rem 0.9rem",
    borderRadius: 12,
    background: "rgba(1,153,255,0.12)",
    border: "1px solid rgba(56,182,255,0.3)",
  },
  sumLabel: { fontSize: "clamp(0.85rem, 3.6vw, 1.15rem)", fontWeight: 700, color: "var(--text)" },
  sumExpr: { fontSize: "clamp(0.7rem, 3vw, 1rem)", color: "var(--text-dim)" },
  sumTotal: { fontSize: "clamp(1.2rem, 5.5vw, 1.8rem)", fontWeight: 900, color: "var(--blue-glow)" },
  sumUnit: { fontSize: "clamp(0.85rem, 3.6vw, 1.15rem)", color: "var(--blue-glow)" },
};
