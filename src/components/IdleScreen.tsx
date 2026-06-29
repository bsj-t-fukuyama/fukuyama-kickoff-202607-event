import { motion } from "framer-motion";
import type { QueueStats } from "../lib/api";

// Shown when there are no unscanned photos. A calm, looping "standby" state.
// hideStats: /view（参加者スマホ）では下部の SCANNED / QUEUE / SRC は出さない。
export default function IdleScreen({
  stats,
  hideStats = false,
}: {
  stats: QueueStats | null;
  hideStats?: boolean;
}) {
  return (
    <div style={styles.root}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        style={styles.theme}
      >
        <div style={styles.themeText}>{stats?.theme ?? "—"}</div>
      </motion.div>

      <div style={styles.loaderWrap}>
        <div style={styles.ring} />
        <div style={styles.ringInner} />
        <motion.div
          style={styles.pulse}
          animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
        <div style={styles.loaderLabel} className="eyebrow">
          SCANNING
        </div>
      </div>

      <motion.div
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2.2, repeat: Infinity }}
        style={styles.status}
        className="mono"
      >
        新しい写真を待機中…
      </motion.div>

      {!hideStats && (
        <div style={styles.footer} className="mono">
          <span>SCANNED {stats?.shown ?? 0}</span>
          <span style={{ color: "var(--blue-glow)" }}>QUEUE {stats?.pending ?? 0}</span>
          <span>SRC {(stats?.provider ?? "—").toUpperCase()}</span>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "clamp(2rem, 5vh, 4rem)",
  },
  theme: { textAlign: "center", display: "grid", gap: "0.8rem" },
  themeText: {
    fontSize: "clamp(2rem, 5vw, 4rem)",
    fontWeight: 800,
    letterSpacing: "-0.02em",
    background: "linear-gradient(180deg, #fff, var(--blue-glow))",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  loaderWrap: {
    position: "relative",
    width: "clamp(160px, 22vmin, 280px)",
    height: "clamp(160px, 22vmin, 280px)",
    display: "grid",
    placeItems: "center",
  },
  ring: {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    background:
      "conic-gradient(from 0deg, transparent 0deg, var(--blue-bright) 90deg, var(--blue-deep) 180deg, transparent 320deg)",
    mask: "radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 6px))",
    WebkitMask:
      "radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 6px))",
    animation: "spin 1.6s linear infinite",
  },
  ringInner: {
    position: "absolute",
    inset: "18%",
    borderRadius: "50%",
    border: "1px solid var(--line)",
  },
  pulse: {
    position: "absolute",
    inset: "30%",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(56,182,255,0.6), rgba(56,182,255,0) 70%)",
  },
  loaderLabel: { position: "absolute", letterSpacing: "0.3em" },
  status: { fontSize: "clamp(0.9rem, 1.6vw, 1.2rem)", color: "var(--text-dim)" },
  footer: {
    position: "absolute",
    bottom: "3vh",
    display: "flex",
    gap: "2.5rem",
    fontSize: "0.8rem",
    color: "var(--text-dim)",
    letterSpacing: "0.15em",
  },
};
