import { AnimatePresence, motion } from "framer-motion";
import type { BonusPhase } from "../lib/useBonusReveal";

// BRAVE THROUGH ボーナスの全画面シネマ演出。
//
// 「BRAVE THROUGH」の巨大テキストが左→右へ斜めに駆け抜け、白フラッシュ＋スピード線
// ＋"BONUS!!" のスタンプでビックリさせる。その直後に点数がせり上がる（rising）ので、
// 上昇中は加点ぶん「+N」を大きく出して“格上げ”感を強調する。PC/スマホ共通。
export default function BraveThroughOverlay({
  phase,
  gain,
}: {
  phase: BonusPhase;
  gain: number;
}) {
  const show = phase === "sweep" || phase === "rising";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          style={styles.root}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
          transition={{ duration: 0.18 }}
        >
          {/* 背景を一瞬暗く沈めてテキストを際立たせる */}
          <div style={styles.darken} />

          {/* 白フラッシュ（ドンッと弾ける） */}
          <motion.div
            style={styles.flash}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.95, 0.1, 0.3, 0] }}
            transition={{ duration: 1.3, times: [0, 0.08, 0.3, 0.5, 1], ease: "easeOut" }}
          />

          {/* スピード線（左→右へ走る） */}
          {SPEED_LINES.map((top, i) => (
            <motion.div
              key={i}
              style={{ ...styles.streak, top: `${top}%` }}
              initial={{ x: "-120vw", opacity: 0 }}
              animate={{ x: "120vw", opacity: [0, 1, 0] }}
              transition={{ duration: 0.62, delay: i * 0.05, ease: "easeIn" }}
            />
          ))}

          {/* 主役テキスト: 左から入って右へ斜めに駆け抜ける */}
          <motion.div
            style={styles.textWrap}
            initial={{ x: "-135%", skewX: "-20deg", opacity: 0 }}
            animate={{
              x: ["-135%", "0%", "0%", "135%"],
              skewX: ["-20deg", "-8deg", "-8deg", "-20deg"],
              opacity: [0, 1, 1, 0],
            }}
            transition={{ duration: 1.65, times: [0, 0.26, 0.6, 1], ease: ["circOut", "linear", "circIn"] }}
          >
            <span style={styles.text}>BRAVE&nbsp;THROUGH</span>
          </motion.div>

          {/* ドンと押す BONUS スタンプ */}
          <motion.div
            style={styles.banner}
            initial={{ scale: 0, opacity: 0, rotate: -8 }}
            animate={{ scale: [0, 1.25, 1], opacity: 1, rotate: -3 }}
            transition={{ delay: 0.55, type: "spring", stiffness: 260, damping: 11 }}
          >
            ⚡ BONUS!! ⚡
          </motion.div>

          {/* せり上がり中は加点ぶんを誇示 */}
          <AnimatePresence>
            {phase === "rising" && gain > 0 && (
              <motion.div
                style={styles.gain}
                initial={{ scale: 0.3, opacity: 0, y: 30 }}
                animate={{ scale: [0.3, 1.3, 1], opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.4 }}
                transition={{ type: "spring", stiffness: 240, damping: 13 }}
              >
                +{gain}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const SPEED_LINES = [14, 27, 40, 53, 66, 79];

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: "fixed",
    inset: 0,
    zIndex: 10050,
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
    pointerEvents: "none",
    perspective: "1000px",
  },
  darken: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(circle at 50% 50%, rgba(2,8,24,0.45) 0%, rgba(1,3,10,0.82) 70%, rgba(0,0,0,0.92) 100%)",
  },
  flash: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(circle at 50% 46%, rgba(255,255,255,0.95) 0%, rgba(180,225,255,0.7) 30%, rgba(120,190,255,0) 62%)",
    mixBlendMode: "screen",
  },
  streak: {
    position: "absolute",
    left: 0,
    height: "clamp(2px, 0.5vh, 5px)",
    width: "55vw",
    background:
      "linear-gradient(90deg, rgba(120,200,255,0) 0%, rgba(170,225,255,0.95) 70%, #ffffff 100%)",
    filter: "blur(0.5px) drop-shadow(0 0 8px rgba(120,200,255,0.8))",
    borderRadius: 99,
  },
  textWrap: {
    position: "absolute",
    display: "flex",
    justifyContent: "center",
    width: "100%",
    willChange: "transform",
  },
  text: {
    whiteSpace: "nowrap",
    fontSize: "clamp(1.4rem, 6vw, 5.5rem)",
    fontWeight: 900,
    fontStyle: "italic",
    letterSpacing: "-0.03em",
    lineHeight: 0.9,
    background: "linear-gradient(180deg, #ffffff 0%, #ffe79a 38%, #ffb02e 60%, #ff7ad9 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    filter:
      "drop-shadow(0 3px 0 #b85bd6) drop-shadow(0 7px 0 #6e2bb0) drop-shadow(0 0 28px rgba(255,180,60,0.7)) drop-shadow(0 0 60px rgba(255,120,220,0.5))",
  },
  banner: {
    position: "absolute",
    top: "13%",
    fontSize: "clamp(1.4rem, 5.5vw, 4rem)",
    fontWeight: 900,
    letterSpacing: "0.04em",
    color: "#fff",
    padding: "0.2em 0.7em",
    borderRadius: 14,
    background: "linear-gradient(160deg, #ff5ec4, #7b2bff)",
    border: "2px solid rgba(255,255,255,0.85)",
    boxShadow: "0 0 30px rgba(255,90,200,0.7), 0 10px 40px rgba(0,0,0,0.5)",
    textShadow: "0 2px 10px rgba(0,0,0,0.45)",
  },
  gain: {
    position: "absolute",
    bottom: "16%",
    fontSize: "clamp(3.5rem, 14vw, 11rem)",
    fontWeight: 900,
    fontStyle: "italic",
    color: "#aef6c2",
    letterSpacing: "-0.03em",
    filter:
      "drop-shadow(0 3px 0 #1f9d57) drop-shadow(0 0 30px rgba(80,255,150,0.75)) drop-shadow(0 0 60px rgba(80,255,150,0.4))",
  },
};
