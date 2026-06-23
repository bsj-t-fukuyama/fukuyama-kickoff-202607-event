import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { QueueStats, ScoredItem } from "../lib/api";
import { pickComment } from "../lib/comments";
import PhotoCard from "./PhotoCard";
import ScoreGauge from "./ScoreGauge";
import RevealOverlay from "./RevealOverlay";

// Phase boundaries as fractions of the total duration. The reveal (after
// SETTLE_END) holds for the rest of the time so the big comment lingers.
const INTRO_END = 0.08;
const ANALYZE_END = 0.45;
const SETTLE_END = 0.62;

const REVEAL_LABEL: Record<string, string> = {
  S: "PERFECT SHOT",
  A: "EXCELLENT",
  B: "NICE",
  C: "GOOD TRY",
  D: "KEEP GOING",
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);

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
  const [display, setDisplay] = useState(0);
  const [p, setP] = useState(0);
  const settleStartVal = useRef<number | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    let raf = 0;
    let start = 0;

    const tick = (now: number) => {
      if (!start) start = now;
      const elapsed = now - start;
      const prog = Math.min(1, elapsed / durationMs);
      setP(prog);

      let value: number;
      if (prog < INTRO_END) {
        value = 0;
      } else if (prog < ANALYZE_END) {
        // Energetic jitter while "analyzing".
        const step = Math.floor(elapsed / 60);
        value = Math.abs((step * 9301 + 49297) % 100);
      } else if (prog < SETTLE_END) {
        if (settleStartVal.current == null) settleStartVal.current = display;
        const e = easeOutCubic((prog - ANALYZE_END) / (SETTLE_END - ANALYZE_END));
        value = Math.round(lerp(settleStartVal.current, item.score, e));
      } else {
        value = item.score;
      }
      setDisplay(value);

      if (prog >= 1) {
        if (!doneRef.current) {
          doneRef.current = true;
          onComplete();
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fraction = Math.max(0, Math.min(1, display / 100));
  const scanning = p < SETTLE_END;
  const revealed = p >= SETTLE_END;

  // Pick the big reaction comment once per photo (stable across re-renders).
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
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    padding: "clamp(1.5rem, 4vh, 3rem) clamp(2rem, 5vw, 5rem)",
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
    gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 1fr)",
    gap: "clamp(2rem, 5vw, 5rem)",
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
