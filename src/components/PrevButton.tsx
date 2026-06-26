import { motion } from "framer-motion";

// 左下のフローティングボタン。押すと一つ前の写真へ戻る（懇親会で司会が手動操作する用）。
export default function PrevButton({ onPrev }: { onPrev: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onPrev();
      }}
      style={styles.button}
      initial={{ opacity: 0, y: 16, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.4, type: "spring", stiffness: 240, damping: 18 }}
      whileHover={{ scale: 1.08, boxShadow: "0 0 28px rgba(56,182,255,0.6)" }}
      whileTap={{ scale: 0.94 }}
      aria-label="前の写真へ"
      title="前の写真へ"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M19 12H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="m12 6-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </motion.button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  button: {
    position: "fixed",
    bottom: "clamp(1.2rem, 3vh, 2.2rem)",
    left: "clamp(1.2rem, 3vw, 2.2rem)",
    zIndex: 20,
    width: "clamp(48px, 6vmin, 64px)",
    height: "clamp(48px, 6vmin, 64px)",
    display: "grid",
    placeItems: "center",
    borderRadius: "50%",
    color: "var(--blue-glow)",
    background: "rgba(13,22,46,0.7)",
    border: "1px solid var(--line)",
    backdropFilter: "blur(6px)",
    cursor: "pointer",
    boxShadow: "0 8px 28px rgba(0,30,90,0.45)",
  },
};
