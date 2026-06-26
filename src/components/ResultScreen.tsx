import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fetchResults, PODIUM_SIZE, type ResultEntry } from "../lib/results";

// 結果発表（暫定）画面。
//
// レイアウト:
//   ・1位 … 画面の左半分を丸ごと使い、正方形エリアに写真を最大表示。
//            その下に 順位 と 得点 を近づけて並べる。
//   ・2位 … 右半分の上 / 3位 … 右半分の下。
// データが足りない順位は「空いてます」のプレースホルダを出す。
// データは lib/results.fetchResults()（今はダミー、将来はスプレッドシート集計API）。

// 順位ごとのアクセント（金・銀・銅）。
const MEDALS = [
  { label: "1位", color: "#ffd24d", glow: "rgba(255,210,77,0.55)", crown: "👑" },
  { label: "2位", color: "#cfe0ff", glow: "rgba(207,224,255,0.45)", crown: "🥈" },
  { label: "3位", color: "#ff9d5c", glow: "rgba(255,157,92,0.45)", crown: "🥉" },
];

const screenVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { when: "beforeChildren" as const, staggerChildren: 0.14, delayChildren: 0.1 },
  },
  exit: { opacity: 0, transition: { duration: 0.25 } },
};

const fromLeft = {
  hidden: { opacity: 0, x: -70, scale: 0.94 },
  visible: { opacity: 1, x: 0, scale: 1, transition: { type: "spring" as const, stiffness: 200, damping: 24 } },
};

const fromRight = {
  hidden: { opacity: 0, x: 70, scale: 0.96 },
  visible: { opacity: 1, x: 0, scale: 1, transition: { type: "spring" as const, stiffness: 220, damping: 24 } },
};

export default function ResultScreen({ onBack }: { onBack: () => void }) {
  const [entries, setEntries] = useState<ResultEntry[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetchResults()
      .then((r) => alive && setEntries(r))
      .catch(() => alive && setEntries([]));
    return () => {
      alive = false;
    };
  }, []);

  // 常に PODIUM_SIZE 件のスロットを作り、足りない分は null（空き）にする。
  const slots: (ResultEntry | null)[] = Array.from(
    { length: PODIUM_SIZE },
    (_, i) => entries?.[i] ?? null,
  );
  const loading = entries === null;

  return (
    <motion.div
      style={styles.root}
      variants={screenVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onBack();
        }}
        style={styles.back}
        variants={fromLeft}
        whileHover={{ x: -4 }}
        aria-label="採点画面に戻る"
      >
        ← 採点画面へ
      </motion.button>

      <motion.div style={styles.header} variants={fromLeft}>
        <div className="eyebrow">PROVISIONAL RESULT</div>
        <h1 style={styles.title}>結果発表（暫定）</h1>
      </motion.div>

      <div style={styles.stage}>
        {/* 左半分: 1位 */}
        <motion.div style={styles.leftCol} variants={fromLeft}>
          <ChampionCard entry={slots[0]} loading={loading} />
        </motion.div>

        {/* 右半分: 2位（上） / 3位（下） */}
        <div style={styles.rightCol}>
          <RunnerUpCard rank={1} entry={slots[1]} loading={loading} />
          <RunnerUpCard rank={2} entry={slots[2]} loading={loading} />
        </div>
      </div>
    </motion.div>
  );
}

// 1位: 正方形に写真を最大表示し、順位＋得点を近づけて下に並べる。
function ChampionCard({ entry, loading }: { entry: ResultEntry | null; loading: boolean }) {
  const medal = MEDALS[0];
  const empty = !entry;

  return (
    <div style={styles.champCard}>
      <div
        style={{
          ...styles.champSquare,
          ...(empty
            ? styles.emptySquare
            : { boxShadow: `0 0 0 3px ${medal.color}, 0 26px 80px ${medal.glow}` }),
        }}
      >
        {empty ? (
          <span style={styles.emptyMark}>?</span>
        ) : (
          <>
            <img src={entry.imageUrl} alt={entry.name ?? entry.imageId} style={styles.img} />
            <span style={{ ...styles.frameBracket, ...styles.fbTL, borderColor: medal.color, width: 34, height: 34 }} />
            <span style={{ ...styles.frameBracket, ...styles.fbBR, borderColor: medal.color, width: 34, height: 34 }} />
            {entry.name && (
              <div style={styles.champCaption} className="mono">
                {entry.name}
              </div>
            )}
          </>
        )}
      </div>

      {/* 順位 ＋ 得点（近めに） */}
      <div style={styles.champMeta}>
        <span style={styles.champCrown}>{medal.crown}</span>
        <span style={{ ...styles.champRank, color: medal.color, textShadow: `0 0 28px ${medal.glow}` }}>
          {medal.label}
        </span>
        {empty ? (
          <span style={styles.emptyText}>{loading ? "…" : "空いてます"}</span>
        ) : (
          <motion.span
            style={styles.champScoreWrap}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.25 }}
          >
            <span className="tnum" style={{ ...styles.champScore, color: medal.color }}>
              {entry.score}
            </span>
            <span style={styles.champScoreUnit}>点</span>
          </motion.span>
        )}
      </div>
    </div>
  );
}

// 2位・3位: 右半分に正方形写真＋順位＋得点をコンパクトに。
function RunnerUpCard({
  rank,
  entry,
  loading,
}: {
  rank: number;
  entry: ResultEntry | null;
  loading: boolean;
}) {
  const medal = MEDALS[rank];
  const empty = !entry;

  return (
    <motion.div
      style={{
        ...styles.runnerCard,
        borderColor: empty ? "var(--line)" : `${medal.color}66`,
        boxShadow: empty ? "none" : `0 0 0 1px ${medal.color}33, 0 16px 50px ${medal.glow}`,
      }}
      variants={fromRight}
    >
      <div
        style={{
          ...styles.runnerSquare,
          ...(empty ? styles.emptySquare : { boxShadow: `0 0 0 2px ${medal.color}99` }),
        }}
      >
        {empty ? (
          <span style={styles.emptyMarkSm}>?</span>
        ) : (
          <>
            <img src={entry.imageUrl} alt={entry.name ?? entry.imageId} style={styles.img} />
            {entry.name && (
              <div style={styles.runnerCaption} className="mono">
                {entry.name}
              </div>
            )}
          </>
        )}
      </div>

      <div style={styles.runnerMeta}>
        <div style={styles.runnerRankRow}>
          <span style={styles.runnerCrown}>{medal.crown}</span>
          <span style={{ ...styles.runnerRank, color: medal.color, textShadow: `0 0 20px ${medal.glow}` }}>
            {medal.label}
          </span>
        </div>
        {empty ? (
          <span style={styles.emptyText}>{loading ? "…" : "空いてます"}</span>
        ) : (
          <motion.div
            style={styles.runnerScoreWrap}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.2 }}
          >
            <span className="tnum" style={{ ...styles.runnerScore, color: medal.color }}>
              {entry.score}
            </span>
            <span style={styles.runnerScoreUnit}>点</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    padding: "clamp(1.2rem, 3vh, 2.4rem) clamp(1.5rem, 4vw, 4rem)",
    gap: "clamp(0.8rem, 2vh, 1.6rem)",
  },
  back: {
    alignSelf: "flex-start",
    background: "rgba(120,170,255,0.08)",
    border: "1px solid var(--line)",
    color: "var(--text)",
    borderRadius: 999,
    padding: "0.55rem 1.1rem",
    fontSize: "0.9rem",
    letterSpacing: "0.08em",
    cursor: "inherit",
    fontFamily: "var(--font)",
  },
  header: { display: "grid", gap: "0.3rem", textAlign: "center" },
  title: {
    fontSize: "clamp(2rem, 4.4vw, 3.8rem)",
    fontWeight: 800,
    letterSpacing: "-0.02em",
    background: "linear-gradient(180deg, #fff, var(--blue-glow))",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },

  // 左半分 / 右半分
  stage: {
    flex: 1,
    minHeight: 0,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "clamp(1.2rem, 3vw, 3rem)",
    alignItems: "stretch",
  },
  leftCol: { minWidth: 0, minHeight: 0, display: "flex" },
  rightCol: {
    minWidth: 0,
    minHeight: 0,
    display: "grid",
    gridTemplateRows: "1fr 1fr",
    gap: "clamp(1rem, 2.4vh, 2rem)",
  },

  // --- 1位（チャンピオン） ---
  champCard: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "clamp(0.8rem, 1.8vh, 1.6rem)",
  },
  champSquare: {
    position: "relative",
    aspectRatio: "1 / 1",
    width: "min(100%, 60vh)",
    borderRadius: 22,
    overflow: "hidden",
    background: "#000",
  },
  champCaption: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: "0.7rem 0.9rem",
    fontSize: "clamp(0.8rem, 1.3vw, 1.1rem)",
    letterSpacing: "0.06em",
    color: "rgba(230,240,255,0.95)",
    background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.78))",
    textAlign: "center",
  },
  champMeta: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "center",
    gap: "clamp(0.5rem, 1.2vw, 1rem)",
  },
  champCrown: { fontSize: "clamp(1.6rem, 3vw, 2.8rem)", alignSelf: "center" },
  champRank: { fontSize: "clamp(2.2rem, 4.2vw, 3.6rem)", fontWeight: 900, lineHeight: 1 },
  champScoreWrap: { display: "inline-flex", alignItems: "baseline", gap: 4 },
  champScore: { fontSize: "clamp(3rem, 6vw, 5.4rem)", fontWeight: 900, lineHeight: 1 },
  champScoreUnit: { fontSize: "clamp(1rem, 1.8vw, 1.6rem)", color: "var(--text-dim)" },

  // --- 2位・3位（ランナーアップ） ---
  runnerCard: {
    minHeight: 0,
    display: "flex",
    alignItems: "center",
    gap: "clamp(0.8rem, 2vw, 1.8rem)",
    padding: "clamp(0.7rem, 1.6vh, 1.2rem) clamp(0.9rem, 2vw, 1.6rem)",
    borderRadius: 18,
    border: "1px solid var(--line)",
    background: "linear-gradient(180deg, rgba(13,22,46,0.7), rgba(6,10,22,0.7))",
  },
  runnerSquare: {
    position: "relative",
    flex: "0 0 auto",
    aspectRatio: "1 / 1",
    height: "min(100%, 26vh)",
    borderRadius: 14,
    overflow: "hidden",
    background: "#000",
  },
  runnerCaption: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: "0.3rem 0.4rem",
    fontSize: "0.66rem",
    letterSpacing: "0.05em",
    color: "rgba(230,240,255,0.92)",
    background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.75))",
    textAlign: "center",
  },
  runnerMeta: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.3rem",
  },
  runnerRankRow: { display: "flex", alignItems: "center", gap: "0.4rem" },
  runnerCrown: { fontSize: "clamp(1.2rem, 2vw, 1.8rem)" },
  runnerRank: { fontSize: "clamp(1.6rem, 2.6vw, 2.6rem)", fontWeight: 900, lineHeight: 1 },
  runnerScoreWrap: { display: "flex", alignItems: "baseline", gap: 3 },
  runnerScore: { fontSize: "clamp(2rem, 3.6vw, 3.4rem)", fontWeight: 900, lineHeight: 1 },
  runnerScoreUnit: { fontSize: "clamp(0.85rem, 1.3vw, 1.2rem)", color: "var(--text-dim)" },

  // --- 共有 ---
  img: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  frameBracket: { position: "absolute", border: "3px solid #fff" },
  fbTL: { top: 12, left: 12, borderRight: "none", borderBottom: "none" },
  fbBR: { bottom: 12, right: 12, borderLeft: "none", borderTop: "none" },
  emptySquare: {
    border: "2px dashed rgba(120,170,255,0.3)",
    background: "rgba(120,170,255,0.04)",
    display: "grid",
    placeItems: "center",
  },
  emptyMark: { fontSize: "clamp(2.4rem, 5vw, 4rem)", color: "var(--text-dim)", fontWeight: 800 },
  emptyMarkSm: { fontSize: "clamp(1.4rem, 3vw, 2.4rem)", color: "var(--text-dim)", fontWeight: 800 },
  emptyText: {
    fontSize: "clamp(1rem, 1.8vw, 1.5rem)",
    color: "var(--text-dim)",
    letterSpacing: "0.12em",
    fontWeight: 600,
  },
};
