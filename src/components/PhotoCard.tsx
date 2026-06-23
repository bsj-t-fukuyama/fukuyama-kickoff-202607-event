import { motion } from "framer-motion";
import type { ScoredItem } from "../lib/api";

// The photo under judgement, with a sweeping scan beam, corner brackets and a
// filename readout. `scanning` controls whether the beam is animating.
export default function PhotoCard({
  item,
  scanning,
}: {
  item: ScoredItem;
  scanning: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.06, filter: "brightness(0.2)" }}
      animate={{ opacity: 1, scale: 1, filter: "brightness(1)" }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      style={styles.card}
    >
      <img src={item.imageUrl} alt={item.name} style={styles.img} />

      {/* scan beam */}
      {scanning && (
        <motion.div
          style={styles.beam}
          initial={{ top: "-10%" }}
          animate={{ top: "110%" }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* corner brackets */}
      <span style={{ ...styles.bracket, ...styles.tl }} />
      <span style={{ ...styles.bracket, ...styles.tr }} />
      <span style={{ ...styles.bracket, ...styles.bl }} />
      <span style={{ ...styles.bracket, ...styles.br }} />

      <div style={styles.meta} className="mono">
        <span style={styles.dot} /> {item.name}
      </div>
    </motion.div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    position: "relative",
    width: "100%",
    height: "100%",
    borderRadius: 18,
    overflow: "hidden",
    background: "#000",
    boxShadow:
      "0 40px 120px rgba(0,40,120,0.45), 0 0 0 1px rgba(120,170,255,0.18)",
  },
  img: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  beam: {
    position: "absolute",
    left: 0,
    right: 0,
    height: "14%",
    background:
      "linear-gradient(180deg, transparent, rgba(56,182,255,0.35) 45%, rgba(255,255,255,0.85) 50%, rgba(56,182,255,0.35) 55%, transparent)",
    mixBlendMode: "screen",
    pointerEvents: "none",
  },
  bracket: {
    position: "absolute",
    width: 28,
    height: 28,
    border: "2px solid rgba(180,220,255,0.85)",
  },
  tl: { top: 14, left: 14, borderRight: "none", borderBottom: "none" },
  tr: { top: 14, right: 14, borderLeft: "none", borderBottom: "none" },
  bl: { bottom: 14, left: 14, borderRight: "none", borderTop: "none" },
  br: { bottom: 14, right: 14, borderLeft: "none", borderTop: "none" },
  meta: {
    position: "absolute",
    bottom: 16,
    left: 18,
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: "0.85rem",
    letterSpacing: "0.12em",
    color: "rgba(220,235,255,0.9)",
    textShadow: "0 2px 8px rgba(0,0,0,0.8)",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#ff4d4d",
    boxShadow: "0 0 10px #ff4d4d",
  },
};
