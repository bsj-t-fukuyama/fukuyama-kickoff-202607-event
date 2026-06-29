import { motion } from "framer-motion";

// /main の最初に出るスタート画面。ここで「スタート！」を押すまでスキャンは始まらない。
// （リセット後もこの画面に戻り、勝手にスキャンは再開しない。）
export default function StartScreen({
  onStart,
  starting,
}: {
  onStart: () => void;
  starting: boolean;
}) {
  return (
    <div style={styles.root}>
      <motion.div
        style={styles.brand}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        BRAVE THROUGH
      </motion.div>

      <motion.div
        style={styles.sub}
        className="mono"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        PICTURE SCORES — 準備ができたら
      </motion.div>

      <motion.button
        type="button"
        onClick={onStart}
        disabled={starting}
        style={{ ...styles.button, opacity: starting ? 0.7 : 1 }}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.35, type: "spring", stiffness: 200, damping: 18 }}
        whileHover={starting ? undefined : { scale: 1.05 }}
        whileTap={starting ? undefined : { scale: 0.96 }}
      >
        {starting ? (
          <span style={styles.starting}>
            <span style={styles.spinner} />
            スタート中…
          </span>
        ) : (
          "スタート！"
        )}
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
    gap: "clamp(1.2rem, 3vh, 2.4rem)",
    textAlign: "center",
    padding: "2rem",
  },
  brand: {
    fontSize: "clamp(2.4rem, 7vw, 6rem)",
    fontWeight: 900,
    letterSpacing: "0.02em",
    background: "linear-gradient(180deg, #fff, var(--blue-glow))",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    textShadow: "0 0 60px rgba(56,182,255,0.35)",
  },
  sub: {
    fontSize: "clamp(0.85rem, 1.6vw, 1.2rem)",
    color: "var(--text-dim)",
    letterSpacing: "0.18em",
  },
  button: {
    marginTop: "0.6rem",
    fontSize: "clamp(1.4rem, 3.2vw, 2.6rem)",
    fontWeight: 900,
    letterSpacing: "0.08em",
    color: "#fff",
    padding: "clamp(0.9rem, 2vh, 1.4rem) clamp(2.4rem, 6vw, 4.5rem)",
    borderRadius: 999,
    border: "1px solid rgba(56,182,255,0.6)",
    background: "linear-gradient(160deg, #1fa2ff, #0066ff)",
    cursor: "pointer",
    boxShadow: "0 16px 44px rgba(1,90,255,0.5), 0 0 0 8px rgba(56,182,255,0.1)",
  },
  starting: { display: "inline-flex", alignItems: "center", gap: "0.7rem" },
  spinner: {
    width: "1em",
    height: "1em",
    borderRadius: "50%",
    border: "3px solid rgba(255,255,255,0.35)",
    borderTopColor: "#fff",
    animation: "spin 0.9s linear infinite",
  },
};
