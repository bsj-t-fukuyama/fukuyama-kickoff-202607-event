import { motion } from "framer-motion";

// お茶目な404画面。設定されていないルートは全部ここに来る。
// /main へ戻る導線も置いておく。
export default function NotFound({ onHome }: { onHome: () => void }) {
  return (
    <div style={styles.root}>
      <motion.div
        style={styles.code}
        initial={{ opacity: 0, scale: 0.8, rotate: -6 }}
        animate={{ opacity: 1, scale: 1, rotate: [-6, 4, -2, 0] }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      >
        404
      </motion.div>

      <motion.div
        style={styles.message}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.6 }}
      >
        パスが間違ってるよん
        <motion.span
          style={styles.heart}
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
        >
          ❤️
        </motion.span>
      </motion.div>

      <motion.div
        style={styles.sub}
        className="mono"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.6 }}
      >
        そんなページ、どこにも無いってばよ…🙈
      </motion.div>

      <motion.button
        type="button"
        onClick={onHome}
        style={styles.button}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
      >
        メイン画面へ戻る →
      </motion.button>
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
    gap: "clamp(1rem, 3vh, 2rem)",
    textAlign: "center",
    padding: "2rem",
  },
  code: {
    fontSize: "clamp(6rem, 22vw, 16rem)",
    fontWeight: 900,
    lineHeight: 0.9,
    letterSpacing: "-0.04em",
    background: "linear-gradient(180deg, #fff, var(--blue-glow))",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    textShadow: "0 0 60px rgba(56,182,255,0.35)",
  },
  message: {
    fontSize: "clamp(1.6rem, 4vw, 3rem)",
    fontWeight: 800,
    letterSpacing: "0.01em",
    color: "var(--text)",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.2em",
  },
  heart: { display: "inline-block" },
  sub: {
    fontSize: "clamp(0.9rem, 1.8vw, 1.3rem)",
    color: "var(--text-dim)",
    letterSpacing: "0.06em",
  },
  button: {
    marginTop: "0.5rem",
    fontSize: "clamp(0.95rem, 1.6vw, 1.2rem)",
    fontWeight: 700,
    color: "var(--blue-glow)",
    padding: "0.7rem 1.6rem",
    borderRadius: 99,
    background: "rgba(1,153,255,0.12)",
    border: "1px solid rgba(56,182,255,0.4)",
    cursor: "pointer",
  },
};
