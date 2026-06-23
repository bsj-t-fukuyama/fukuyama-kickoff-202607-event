import { motion } from "framer-motion";

const GRADE_COLORS: Record<string, string> = {
  S: "#ffd24d",
  A: "#38b6ff",
  B: "#0199ff",
  C: "#5b8fd6",
  D: "#7d93b8",
};

// Big animated score with a circular gauge behind it. All values are driven
// from the parent's animation clock — this component is purely presentational.
export default function ScoreGauge({
  display,
  fraction,
  grade,
  revealed,
}: {
  display: number;
  fraction: number; // 0..1 of the ring filled
  grade: string;
  revealed: boolean;
}) {
  const R = 130;
  const C = 2 * Math.PI * R;
  const color = GRADE_COLORS[grade] ?? "#0199ff";

  return (
    <div style={styles.wrap}>
      <svg viewBox="0 0 300 300" style={styles.svg}>
        <defs>
          <linearGradient id="gauge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0199ff" />
            <stop offset="100%" stopColor="#0066ff" />
          </linearGradient>
        </defs>
        <circle cx="150" cy="150" r={R} fill="none" stroke="rgba(120,170,255,0.12)" strokeWidth="10" />
        <circle
          cx="150"
          cy="150"
          r={R}
          fill="none"
          stroke="url(#gauge)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - fraction)}
          transform="rotate(-90 150 150)"
          style={{ filter: "drop-shadow(0 0 12px rgba(1,153,255,0.55))" }}
        />
      </svg>

      <div style={styles.center}>
        <div style={styles.number} className="tnum">
          {display}
        </div>
        <div style={styles.outOf} className="mono">
          / 100
        </div>
      </div>

      <motion.div
        initial={false}
        animate={
          revealed
            ? { scale: [0.4, 1.25, 1], opacity: 1 }
            : { scale: 0.4, opacity: 0 }
        }
        transition={{ duration: 0.6, ease: "backOut" }}
        style={{
          ...styles.grade,
          color,
          borderColor: color,
          boxShadow: `0 0 24px ${color}66`,
        }}
      >
        {grade}
      </motion.div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    position: "relative",
    width: "clamp(260px, 30vmin, 380px)",
    height: "clamp(260px, 30vmin, 380px)",
    display: "grid",
    placeItems: "center",
  },
  svg: { position: "absolute", inset: 0, width: "100%", height: "100%" },
  center: { textAlign: "center", lineHeight: 1 },
  number: {
    fontSize: "clamp(5rem, 13vmin, 9rem)",
    fontWeight: 800,
    letterSpacing: "-0.04em",
    background: "linear-gradient(180deg, #ffffff, #9fd2ff)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  outOf: {
    marginTop: 4,
    fontSize: "0.9rem",
    letterSpacing: "0.3em",
    color: "var(--text-dim)",
  },
  grade: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 64,
    height: 64,
    display: "grid",
    placeItems: "center",
    borderRadius: "50%",
    border: "2px solid",
    fontSize: "2rem",
    fontWeight: 800,
    background: "rgba(4,6,13,0.75)",
    backdropFilter: "blur(4px)",
  },
};
