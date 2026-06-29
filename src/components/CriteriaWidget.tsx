import { AnimatePresence, motion } from "framer-motion";
import type { ScoredItem } from "../lib/api";
import { computeBreakdown } from "../lib/breakdown";

// Score-detail panel for the venue screen.
//
// No button — the moment the score is revealed, a full-height panel sweeps in
// from the right edge and its rows grow into place, so the whole room can read
// the four-axis breakdown at a glance. Slides back out when the photo changes.

// Each row grows in from the right edge — the panel sweeps in, rows follow.
const panelVariants = {
  hidden: { x: "100%" },
  visible: {
    x: 0,
    transition: { type: "spring" as const, stiffness: 210, damping: 30, when: "beforeChildren" as const, staggerChildren: 0.1 },
  },
  exit: { x: "100%", transition: { duration: 0.3 } },
};

const rowVariants = {
  hidden: { opacity: 0, x: 60, scale: 0.6 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 240, damping: 20 },
  },
};

export default function CriteriaWidget({
  item,
  revealed,
}: {
  item: ScoredItem;
  revealed: boolean;
}) {
  const { rows, points } = computeBreakdown(item);
  const s = item.signals;

  return (
    <AnimatePresence>
      {revealed && (
        <motion.aside
          key="detail"
          style={styles.panel}
          variants={panelVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.div style={styles.header} variants={rowVariants}>
            <span style={styles.title}>判定の内訳</span>
            <span style={styles.totalWrap}>
              <span className="tnum" style={styles.totalScore}>
                {item.score}
              </span>
              <span style={styles.gradeTag}>{item.grade}</span>
            </span>
          </motion.div>

          {rows.map((row) => (
            <motion.div key={row.key} style={styles.block} variants={rowVariants}>
              <div style={styles.axisTop}>
                <span style={styles.axisName}>
                  {row.label}
                  {row.key === "people" && (
                    <span style={styles.peopleCount}>
                      （{typeof s?.peopleCount === "number" ? `${s.peopleCount}人` : "No entry"}）
                    </span>
                  )}
                </span>
                <span style={styles.points}>
                  <span className="tnum">{row.points}</span>
                  <span style={styles.pointsMax}> / {row.max}</span>
                </span>
              </div>
              <div style={styles.track}>
                <div
                  style={{
                    ...styles.fill,
                    width: `${(row.points / (row.max || 1)) * 100}%`,
                    background: row.color,
                    boxShadow: `0 0 14px ${row.color}aa`,
                  }}
                />
              </div>
              <div style={styles.descRow}>
                <span style={{ ...styles.mark, color: row.color }}>
                  {row.symbol} {row.markLabel}
                </span>
                <span style={styles.desc}>{row.desc}</span>
              </div>
            </motion.div>
          ))}

          <motion.div style={styles.sumRow} variants={rowVariants}>
            <span style={styles.sumLabel}>4軸の合計</span>
            <span style={styles.sumExpr}>
              {points.join(" + ")} ={" "}
              <span className="tnum" style={styles.sumTotal}>
                {item.score}
              </span>
              <span style={styles.sumUnit}>点</span>
            </span>
          </motion.div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: "fixed",
    top: 0,
    right: 0,
    height: "100vh",
    width: "clamp(476px, 45vw, 792px)",
    zIndex: 10001,
    display: "flex",
    flexDirection: "column",
    // 収まる時は中央寄せ、内容が画面より高い時は上揃えにして一番上(合計得点とグレード)が見切れないように。
    justifyContent: "safe center",
    gap: "clamp(0.8rem, 2.2vh, 2.8rem)",
    // 左右パディングはさらに半分にして、得点コメントが意図せず折り返さないよう横幅を確保。
    padding: "clamp(1rem, 3vh, 3.5rem) clamp(0.4rem, 0.75vw, 0.75rem)",
    transformOrigin: "right center",
    background:
      "linear-gradient(270deg, rgba(8,14,32,0.98) 0%, rgba(8,14,32,0.94) 70%, rgba(8,14,32,0) 100%)",
    borderLeft: "1px solid rgba(120,170,255,0.28)",
    boxShadow: "-24px 0 60px rgba(0,0,0,0.55)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: "1rem",
    // 合計得点(大きい数字)とグレードの上端が詰めた lineHeight でたまに見切れるので少しだけ余白。
    paddingTop: "5px",
    paddingBottom: "clamp(0.5rem, 1.4vh, 1.2rem)",
    borderBottom: "1px solid rgba(120,170,255,0.18)",
    transformOrigin: "right center",
  },
  title: {
    fontSize: "clamp(1.3rem, 2.2vw, 2.4rem)",
    fontWeight: 800,
    letterSpacing: "0.04em",
    background: "linear-gradient(180deg, #fff, var(--blue-glow))",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  totalWrap: { display: "flex", alignItems: "baseline", gap: "0.5rem" },
  totalScore: {
    // 幅(vw)だけでなく高さ(vh)にも追従させ、縦が低い画面でも縮んで見切れないように。
    fontSize: "clamp(2.4rem, min(6vw, 6.8vh), 6rem)",
    fontWeight: 900,
    lineHeight: 0.9,
    letterSpacing: "-0.03em",
    background: "linear-gradient(180deg, #ffffff, #9fd2ff)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  gradeTag: {
    fontSize: "clamp(1.4rem, 2.6vw, 2.6rem)",
    fontWeight: 900,
    color: "var(--blue-glow)",
  },
  block: { display: "grid", gap: "clamp(0.5rem, 1.2vh, 1rem)", transformOrigin: "right center" },
  axisTop: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "0.8rem" },
  axisName: { fontSize: "clamp(1.3rem, min(2.5vw, 3.4vh), 2.8rem)", fontWeight: 700, color: "var(--text)" },
  // スキャンできた実際の人数を、にぎやかさラベルの後ろにめっちゃ小さく薄く添える。
  peopleCount: {
    fontSize: "0.62em",
    fontWeight: 500,
    color: "var(--text-dim)",
    opacity: 0.55,
    marginLeft: "0.15em",
    letterSpacing: "0.02em",
  },
  points: {
    display: "flex",
    alignItems: "baseline",
    color: "var(--blue-glow)",
    // The biggest text in the panel — each axis's contribution is the headline.
    // 幅(vw)と高さ(vh)の小さい方でスケールさせ、低い画面では縮めて下まで収める。
    fontSize: "clamp(2.6rem, min(7vw, 7.6vh), 7.6rem)",
    fontWeight: 900,
    lineHeight: 0.85,
    letterSpacing: "-0.03em",
    textShadow: "0 0 26px rgba(56,182,255,0.45)",
  },
  pointsMax: {
    fontSize: "clamp(1.1rem, 1.6vw, 1.9rem)",
    fontWeight: 600,
    color: "var(--text-dim)",
  },
  track: {
    height: "clamp(10px, 1.5vh, 18px)",
    borderRadius: 99,
    background: "rgba(120,170,255,0.14)",
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 99 },
  descRow: { display: "flex", alignItems: "baseline", gap: "0.8rem" },
  mark: { fontSize: "clamp(1.1rem, 1.7vw, 1.9rem)", fontWeight: 800, letterSpacing: "0.03em" },
  desc: { fontSize: "clamp(1.1rem, 1.7vw, 1.9rem)", color: "rgba(220,235,255,0.85)" },
  sumRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: "0.8rem",
    padding: "clamp(0.7rem, 1.4vh, 1.1rem) clamp(0.9rem, 1.6vw, 1.3rem)",
    borderRadius: 14,
    background: "rgba(1,153,255,0.12)",
    border: "1px solid rgba(56,182,255,0.3)",
    transformOrigin: "right center",
  },
  sumLabel: { fontSize: "clamp(1rem, 1.5vw, 1.6rem)", fontWeight: 700, color: "var(--text)" },
  sumExpr: { fontSize: "clamp(0.9rem, 1.3vw, 1.4rem)", color: "var(--text-dim)" },
  sumTotal: {
    fontSize: "clamp(1.6rem, 2.6vw, 2.8rem)",
    fontWeight: 900,
    color: "var(--blue-glow)",
  },
  sumUnit: { fontSize: "clamp(1rem, 1.5vw, 1.6rem)", color: "var(--blue-glow)" },
  signals: { display: "grid", gap: "0.6rem", transformOrigin: "right center" },
  chips: { display: "flex", flexWrap: "wrap", gap: "0.5rem" },
  chip: {
    fontSize: "clamp(0.85rem, 1.2vw, 1.3rem)",
    fontWeight: 700,
    padding: "0.3rem 0.8rem",
    borderRadius: 99,
    color: "var(--blue-glow)",
    background: "rgba(1,153,255,0.14)",
    border: "1px solid rgba(56,182,255,0.4)",
  },
  note: {
    margin: 0,
    fontSize: "clamp(1rem, 1.5vw, 1.6rem)",
    lineHeight: 1.45,
    color: "rgba(220,235,255,0.92)",
    fontStyle: "italic",
  },
  foot: {
    margin: 0,
    fontSize: "clamp(0.8rem, 1.1vw, 1.2rem)",
    lineHeight: 1.5,
    color: "var(--text-dim)",
  },
};
