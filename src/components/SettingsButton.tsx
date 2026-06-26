import { motion } from "framer-motion";

// 左上のフローティングボタン。押すと設定画面へ遷移する。
export default function SettingsButton({ onOpen }: { onOpen: () => void }) {
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
      whileHover={{ scale: 1.08, rotate: 40, boxShadow: "0 0 28px rgba(56,182,255,0.6)" }}
      whileTap={{ scale: 0.94 }}
      aria-label="設定を開く"
      title="設定"
    >
      {/* 歯車アイコン */}
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9 5.3 5.3"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </motion.button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  button: {
    position: "fixed",
    top: "clamp(1.2rem, 3vh, 2.2rem)",
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
