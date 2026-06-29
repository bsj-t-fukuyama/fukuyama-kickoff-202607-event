import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { QueueStats, ScoredItem } from "../lib/api";
import { pickComment } from "../lib/comments";
import { useScoringClock } from "../lib/useScoringClock";
import PhotoCard from "./PhotoCard";
import ScoreGauge from "./ScoreGauge";
import RevealOverlay from "./RevealOverlay";
import CriteriaWidget from "./CriteriaWidget";

const REVEAL_LABEL: Record<string, string> = {
  S: "PERFECT SHOT",
  A: "EXCELLENT",
  B: "NICE",
  C: "GOOD TRY",
  D: "KEEP GOING",
};

export default function ScoringScene({
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

  // Pick the big reaction comment once per photo (stable across re-renders).
  const comment = useMemo(
    () => pickComment(item.score, `${item.id}:${item.score}`),
    [item.id, item.score],
  );

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <div style={styles.theme}>BRAVE THROUGH</div>
      </div>

      <div style={styles.stage}>
        <div style={styles.photoCol}>
          <PhotoCard item={item} scanning={scanning} />
        </div>

        <div style={styles.panel}>
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
      </div>

      <div style={styles.footer} className="mono">
        <span>SCANNED {stats?.shown ?? 0}</span>
        <span style={{ color: "var(--blue-glow)" }}>QUEUE {stats?.pending ?? 0}</span>
        <span>SRC {(stats?.provider ?? "—").toUpperCase()}</span>
      </div>

      <RevealOverlay
        show={revealed}
        score={item.score}
        badge={comment.badge}
        line={comment.line}
      />

      {/* Floating 判定の内訳 button — only pressable while the score is shown. */}
      <CriteriaWidget item={item} revealed={revealed} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    // 横長写真をなるべく大きく見せるため左右パディングは控えめに。
    padding: "clamp(1.5rem, 4vh, 3rem) clamp(1rem, 2.5vw, 2.5rem)",
    gap: "clamp(1rem, 2.5vh, 2rem)",
  },
  header: { display: "grid", gap: "0.5rem" },
  theme: {
    fontSize: "clamp(1.6rem, 3.4vw, 2.8rem)",
    fontWeight: 800,
    letterSpacing: "-0.02em",
    background: "linear-gradient(180deg, #fff, var(--blue-glow))",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  stage: {
    flex: 1,
    minHeight: 0,
    display: "grid",
    // 写真側を広めに、すき間も詰めて、写真をなるべく大きく。
    gridTemplateColumns: "minmax(0, 1.45fr) minmax(0, 1fr)",
    gap: "clamp(1rem, 2.5vw, 2.5rem)",
    alignItems: "center",
  },
  photoCol: { height: "100%", minHeight: 0, paddingBlock: "1vh" },
  panel: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: "clamp(1rem, 2.5vh, 2rem)",
  },
  statusLine: { fontSize: "clamp(0.9rem, 1.5vw, 1.15rem)", minHeight: "1.4em" },
  footer: {
    display: "flex",
    gap: "2.5rem",
    fontSize: "0.8rem",
    color: "var(--text-dim)",
    letterSpacing: "0.15em",
    justifyContent: "center",
  },
};
