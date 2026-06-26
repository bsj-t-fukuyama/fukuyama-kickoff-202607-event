import { AnimatePresence, motion } from "framer-motion";

// A full-screen, top-most reveal. When the score lands we darken everything
// behind it and slam a giant gradient 3D headline + comment across the screen.
export default function RevealOverlay({
  show,
  score,
  badge,
  line,
}: {
  show: boolean;
  score: number;
  badge: string;
  line: string;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="reveal"
          style={styles.backdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div style={styles.stack}>
            <motion.div
              style={styles.badge}
              initial={{ opacity: 0, y: -30, letterSpacing: "0.8em" }}
              animate={{ opacity: 1, y: 0, letterSpacing: "0.4em" }}
              transition={{ delay: 0.15, duration: 0.5, ease: "easeOut" }}
            >
              {badge}
            </motion.div>

            <motion.div
              style={styles.scoreWrap}
              initial={{ opacity: 0, scale: 0.3, rotateX: -60 }}
              animate={{ opacity: 1, scale: [0.3, 1.18, 1], rotateX: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 14, delay: 0.05 }}
            >
              <span className="tnum" style={styles.score}>
                {score}
              </span>
              <span style={styles.outOf}>点</span>
            </motion.div>

            <motion.div
              style={styles.line}
              initial={{ opacity: 0, scale: 0.6, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.32 }}
            >
              {line}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    display: "grid",
    placeItems: "center",
    padding: "4vmin",
    // Reserve room on the right for the slide-in detail panel, so the score
    // centers in the remaining left space instead of behind the panel.
    paddingRight: "clamp(476px, 49vw, 860px)",
    // Darken everything behind, with a warm spotlight under the (left-shifted) score.
    background:
      "radial-gradient(circle at 29% 42%, rgba(10,20,45,0.55) 0%, rgba(2,4,12,0.82) 60%, rgba(0,0,0,0.92) 100%)",
    backdropFilter: "blur(6px)",
    pointerEvents: "none",
    perspective: "1200px",
    textAlign: "center",
  },
  stack: {
    display: "grid",
    justifyItems: "center",
    gap: "clamp(1rem, 3vh, 2.4rem)",
    transformStyle: "preserve-3d",
  },
  badge: {
    fontSize: "clamp(1.1rem, 3.2vw, 2.4rem)",
    fontWeight: 800,
    letterSpacing: "0.4em",
    paddingLeft: "0.4em",
    background: "linear-gradient(180deg, #ffe9a8, #ffb02e)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    filter: "drop-shadow(0 2px 8px rgba(255,160,40,0.45))",
  },
  scoreWrap: {
    display: "flex",
    alignItems: "baseline",
    gap: "0.15em",
    transformStyle: "preserve-3d",
  },
  score: {
    fontSize: "clamp(8rem, 34vmin, 26rem)",
    fontWeight: 900,
    lineHeight: 0.9,
    letterSpacing: "-0.04em",
    background: "linear-gradient(180deg, #ffffff 0%, #aee0ff 45%, #2c9bff 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    // Layered drop-shadows give a 3D extruded look under the gradient fill.
    filter:
      "drop-shadow(0 2px 0 #1f6fd0) drop-shadow(0 5px 0 #1656a8) drop-shadow(0 10px 18px rgba(0,0,0,0.55)) drop-shadow(0 0 40px rgba(1,153,255,0.55))",
  },
  outOf: {
    fontSize: "clamp(2rem, 7vmin, 5rem)",
    fontWeight: 800,
    color: "#bfe2ff",
    filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.5))",
  },
  line: {
    maxWidth: "92vw",
    // コメントは文節の真ん中あたりに手で改行(\n)を入れてあるので尊重する
    // （横長PCで“微妙な位置で折り返す”のを防ぎ、いい感じの2行に収める）。
    whiteSpace: "pre-line",
    fontSize: "clamp(2rem, 7.5vw, 6rem)",
    fontWeight: 900,
    lineHeight: 1.12,
    letterSpacing: "-0.01em",
    background: "linear-gradient(180deg, #ffffff 0%, #ffe9a8 40%, #ff7ad9 75%, #9b5cff 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    filter:
      "drop-shadow(0 2px 0 rgba(120,40,160,0.9)) drop-shadow(0 6px 0 rgba(70,20,110,0.8)) drop-shadow(0 12px 24px rgba(0,0,0,0.6)) drop-shadow(0 0 50px rgba(255,120,220,0.4))",
  },
};
