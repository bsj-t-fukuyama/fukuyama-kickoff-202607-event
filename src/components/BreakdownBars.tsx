import type { Axis } from "../lib/api";

// The per-axis breakdown. `progress` (0..1) drives how far the bars have filled
// and how high each value has counted, staggered across the axes.
export default function BreakdownBars({
  axes,
  progress,
}: {
  axes: Axis[];
  progress: number;
}) {
  const n = axes.length;
  return (
    <div style={styles.list}>
      {axes.map((axis, i) => {
        // Stagger: each bar starts a bit after the previous one.
        const start = (i / n) * 0.5;
        const local = clamp01((progress - start) / 0.5);
        const eased = easeOut(local);
        const shown = Math.round(axis.value * eased);
        return (
          <div key={axis.key} style={styles.row}>
            <div style={styles.label}>
              <span>{axis.label}</span>
              <span className="tnum mono" style={styles.val}>
                {shown}
              </span>
            </div>
            <div style={styles.track}>
              <div style={{ ...styles.fill, width: `${axis.value * eased}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

const styles: Record<string, React.CSSProperties> = {
  list: {
    display: "grid",
    gap: "clamp(0.6rem, 1.4vh, 1.1rem)",
    width: "min(460px, 100%)",
  },
  row: { display: "grid", gap: 6 },
  label: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    fontSize: "clamp(0.85rem, 1.3vw, 1rem)",
    color: "var(--text)",
    letterSpacing: "0.04em",
  },
  val: { fontSize: "1.05rem", color: "var(--blue-glow)", fontWeight: 700 },
  track: {
    height: 8,
    borderRadius: 99,
    background: "rgba(120,170,255,0.12)",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 99,
    background: "linear-gradient(90deg, var(--blue-bright), var(--blue-deep))",
    boxShadow: "0 0 12px rgba(1,153,255,0.6)",
  },
};
