import { motion } from "framer-motion";

// 右上の丸いアイコンボタン。押すと結果発表（暫定）画面へ遷移する。
// 背景の「どこをタップしても次の写真へ」進む挙動を誘発しないよう、
// クリックは stopPropagation してから onOpen を呼ぶ。
export default function ResultsButton({ onOpen }: { onOpen: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      style={styles.button}
      initial={{ opacity: 0, y: -12, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.4, type: "spring", stiffness: 240, damping: 18 }}
      whileHover={{ scale: 1.08, boxShadow: "0 0 28px rgba(56,182,255,0.6)" }}
      whileTap={{ scale: 0.94 }}
      aria-label="結果発表を見る"
      title="結果発表（暫定）"
    >
      {/* 表彰台アイコン */}
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M8 4h8v3a4 4 0 0 1-8 0V4Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M5 5H8M16 5h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path
          d="M5 6a3 3 0 0 0 3 3M19 6a3 3 0 0 1-3 3"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path d="M12 11v3M9 18h6M10 14h4l.5 4h-5l.5-4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </motion.button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  button: {
    position: "fixed",
    top: "clamp(1.2rem, 3vh, 2.2rem)",
    right: "clamp(1.2rem, 3vw, 2.2rem)",
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
    cursor: "inherit",
    boxShadow: "0 8px 28px rgba(0,30,90,0.45)",
  },
};
