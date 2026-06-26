import { AnimatePresence, motion } from "framer-motion";
import type { ScoredItem } from "../lib/api";

// Score-detail panel for the venue screen.
//
// No button — the moment the score is revealed, a full-height panel sweeps in
// from the right edge and its rows grow into place, so the whole room can read
// the four-axis breakdown at a glance. Slides back out when the photo changes.

type Mark = "good" | "normal" | "hmm";

const MARKS: Record<Mark, { symbol: string; label: string; color: string }> = {
  good: { symbol: "◎", label: "good", color: "#ffd24d" },
  normal: { symbol: "○", label: "normal", color: "#38b6ff" },
  hmm: { symbol: "△", label: "hmm…", color: "#7d93b8" },
};

// Per-axis, per-bucket descriptor. All phrasing stays positive (傷つかない).
const AXIS_DESC: Record<string, Record<Mark, string>> = {
  mood: { good: "はじける笑顔！", normal: "いい表情", hmm: "クールに決め顔" },
  people: { good: "大人数で迫力", normal: "みんなで写ってる", hmm: "少人数でしっとり" },
  composition: { good: "奥行きが見事", normal: "バランス良好", hmm: "味のある構図" },
  clarity: { good: "くっきり鮮明", normal: "しっかり見える", hmm: "やわらかい写り" },
};

// Score buckets (axis values live in 15..100 thanks to the FLOOR).
function bucketFor(value: number): Mark {
  if (value >= 80) return "good";
  if (value >= 60) return "normal";
  return "hmm";
}

// Split `total` into integers proportional to `raw`, guaranteeing the parts sum
// to exactly `total` (largest-remainder / Hamilton apportionment).
function apportion(raw: number[], total: number): number[] {
  const floors = raw.map(Math.floor);
  const remainder = total - floors.reduce((a, b) => a + b, 0);
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  const out = [...floors];
  for (let k = 0; k < remainder && k < order.length; k++) out[order[k].i] += 1;
  return out;
}

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
  // Each axis's max share follows its weight (normally an even 25 each; the
  // にぎやかさ axis grows for 大人数 photos because the server boosts its weight).
  // Points are value×share and apportioned to sum to exactly item.score.
  const totalWeight = item.breakdown.reduce((s, a) => s + (a.weight ?? 0), 0) || 1;
  const shares = item.breakdown.map((a) => ((a.weight ?? 0) / totalWeight) * 100);
  const maxShares = shares.map((sh) => Math.round(sh));
  const rawPoints = item.breakdown.map((a, i) => (a.value / 100) * shares[i]);
  const points = apportion(rawPoints, item.score);

  const s = item.signals;
  const chips: string[] = [];
  if (s) {
    if (typeof s.peopleCount === "number") chips.push(`${s.peopleCount}人`);
    if (s.multiplePeople) chips.push("複数人");
    if (s.smiling) chips.push("笑顔");
    if (s.posing) chips.push("右手グッド");
    if (s.instagramWorthy) chips.push("インスタ映え");
    if (s.faceClarity) chips.push("顔くっきり");
  }

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

          {item.breakdown.map((axis, i) => {
            const mark = bucketFor(axis.value);
            const m = MARKS[mark];
            const desc = AXIS_DESC[axis.key]?.[mark] ?? "";
            return (
              <motion.div key={axis.key} style={styles.block} variants={rowVariants}>
                <div style={styles.axisTop}>
                  <span style={styles.axisName}>
                    {axis.label}
                    {axis.key === "people" && (
                      <span style={styles.peopleCount}>
                        （{typeof s?.peopleCount === "number" ? `${s.peopleCount}人` : "No entry"}）
                      </span>
                    )}
                  </span>
                  <span style={styles.points}>
                    <span className="tnum">{points[i]}</span>
                    <span style={styles.pointsMax}> / {maxShares[i]}</span>
                  </span>
                </div>
                <div style={styles.track}>
                  <div
                    style={{
                      ...styles.fill,
                      width: `${(points[i] / (maxShares[i] || 1)) * 100}%`,
                      background: m.color,
                      boxShadow: `0 0 14px ${m.color}aa`,
                    }}
                  />
                </div>
                <div style={styles.descRow}>
                  <span style={{ ...styles.mark, color: m.color }}>
                    {m.symbol} {m.label}
                  </span>
                  <span style={styles.desc}>{desc}</span>
                </div>
              </motion.div>
            );
          })}

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

          {(chips.length > 0 || s?.note) && (
            <motion.div style={styles.signals} variants={rowVariants}>
              {chips.length > 0 && (
                <div style={styles.chips}>
                  {chips.map((c) => (
                    <span key={c} style={styles.chip}>
                      {c}
                    </span>
                  ))}
                </div>
              )}
              {s?.note && <p style={styles.note}>「{s.note}」</p>}
            </motion.div>
          )}

          <motion.p style={styles.foot} variants={rowVariants}>
            最低15点からの加点方式。容姿は採点していません🎉
          </motion.p>
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
    justifyContent: "center",
    gap: "clamp(0.8rem, 1.8vh, 1.8rem)",
    padding: "clamp(1.5rem, 4vh, 3.5rem) clamp(1.5rem, 3vw, 3rem)",
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
    fontSize: "clamp(3rem, 6vw, 6rem)",
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
  block: { display: "grid", gap: "clamp(0.3rem, 0.8vh, 0.7rem)", transformOrigin: "right center" },
  axisTop: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "0.8rem" },
  axisName: { fontSize: "clamp(1.2rem, 2vw, 2.2rem)", fontWeight: 700, color: "var(--text)" },
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
    fontSize: "clamp(3.4rem, 6vw, 6.4rem)",
    fontWeight: 900,
    lineHeight: 0.85,
    letterSpacing: "-0.03em",
    textShadow: "0 0 26px rgba(56,182,255,0.45)",
  },
  pointsMax: {
    fontSize: "clamp(0.95rem, 1.3vw, 1.5rem)",
    fontWeight: 600,
    color: "var(--text-dim)",
  },
  track: {
    height: "clamp(8px, 1.1vh, 14px)",
    borderRadius: 99,
    background: "rgba(120,170,255,0.14)",
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 99 },
  descRow: { display: "flex", alignItems: "baseline", gap: "0.8rem" },
  mark: { fontSize: "clamp(0.95rem, 1.4vw, 1.5rem)", fontWeight: 800, letterSpacing: "0.03em" },
  desc: { fontSize: "clamp(0.95rem, 1.4vw, 1.5rem)", color: "rgba(220,235,255,0.85)" },
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
