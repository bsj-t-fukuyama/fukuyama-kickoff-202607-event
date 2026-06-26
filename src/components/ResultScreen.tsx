import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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

// 1位: 写真を左半分いっぱいに実アスペクト比でベストフィット表示。
// 順位は左上、得点は右下に、写真の上位レイヤーとしてオーバーレイ。
function ChampionCard({ entry, loading }: { entry: ResultEntry | null; loading: boolean }) {
  const medal = MEDALS[0];
  const empty = !entry;

  const wrapRef = useRef<HTMLDivElement>(null);
  const ratioRef = useRef<number | null>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);

  const recompute = useCallback(() => {
    const el = wrapRef.current;
    const ratio = ratioRef.current;
    if (!el || !ratio) return;
    const cw = el.clientWidth;
    const ch = el.clientHeight;
    if (!cw || !ch) return;
    let w = cw;
    let h = cw / ratio;
    if (h > ch) {
      h = ch;
      w = ch * ratio;
    }
    setBox({ w: Math.round(w), h: Math.round(h) });
  }, []);

  const onImgLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      if (img.naturalWidth && img.naturalHeight) {
        ratioRef.current = img.naturalWidth / img.naturalHeight;
        recompute();
      }
    },
    [recompute],
  );

  useLayoutEffect(() => {
    recompute();
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [recompute]);

  const frameSize: React.CSSProperties = box
    ? { width: box.w, height: box.h }
    : { width: "auto", height: "100%", aspectRatio: "1 / 1" };

  return (
    <div ref={wrapRef} style={styles.champCard}>
      {empty ? (
        <div style={{ ...styles.emptySquare, ...styles.champFrame, width: "min(100%, 64vh)", height: "100%" }}>
          <span style={styles.champCrown}>{medal.crown}</span>
          <span style={{ ...styles.champRank, color: medal.color }}>{medal.label}</span>
          <span style={styles.emptyText}>{loading ? "…" : "空いてます"}</span>
        </div>
      ) : (
        <div
          style={{
            ...styles.champFrame,
            ...frameSize,
            boxShadow: `0 0 0 3px ${medal.color}, 0 26px 80px ${medal.glow}`,
          }}
        >
          <img src={entry.imageUrl} alt={entry.name ?? entry.imageId} style={styles.img} onLoad={onImgLoad} />
          <span style={{ ...styles.frameBracket, ...styles.fbTL, borderColor: medal.color, width: 34, height: 34 }} />
          <span style={{ ...styles.frameBracket, ...styles.fbBR, borderColor: medal.color, width: 34, height: 34 }} />

          {/* 順位（左上の端） */}
          <div style={styles.champRankBadge}>
            <span style={styles.champCrown}>{medal.crown}</span>
            <span style={{ ...styles.champRank, color: medal.color, textShadow: "0 2px 10px rgba(0,0,0,0.85)" }}>
              {medal.label}
            </span>
          </div>

          {/* 得点（右下の端） */}
          <motion.div
            style={styles.champScoreBadge}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.25 }}
          >
            <span className="tnum" style={{ ...styles.champScore, color: medal.color }}>
              {entry.score}
            </span>
            <span style={styles.champScoreUnit}>点</span>
          </motion.div>

          {entry.name && (
            <div style={styles.champCaption} className="mono">
              {entry.name}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 2位・3位: 写真を主役にカードいっぱいへ実アスペクト比でベストフィット表示
// （横写真は横に大きく、縦写真は縦に）。順位と得点は写真の端にオーバーレイ。
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

  const wrapRef = useRef<HTMLDivElement>(null);
  const ratioRef = useRef<number | null>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);

  // カード領域(cw×ch)に、写真比率を保ったまま最大で収まる箱を計算。
  const recompute = useCallback(() => {
    const el = wrapRef.current;
    const ratio = ratioRef.current;
    if (!el || !ratio) return;
    const cw = el.clientWidth;
    const ch = el.clientHeight;
    if (!cw || !ch) return;
    let w = cw;
    let h = cw / ratio;
    if (h > ch) {
      h = ch;
      w = ch * ratio;
    }
    setBox({ w: Math.round(w), h: Math.round(h) });
  }, []);

  const onImgLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      if (img.naturalWidth && img.naturalHeight) {
        ratioRef.current = img.naturalWidth / img.naturalHeight;
        recompute();
      }
    },
    [recompute],
  );

  useLayoutEffect(() => {
    recompute();
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [recompute]);

  const frameSize: React.CSSProperties = box
    ? { width: box.w, height: box.h }
    : { width: "auto", height: "100%", aspectRatio: "4 / 3" };

  return (
    <motion.div
      ref={wrapRef}
      style={{
        ...styles.runnerCard,
        borderColor: empty ? "var(--line)" : `${medal.color}66`,
        boxShadow: empty ? "none" : `0 0 0 1px ${medal.color}33, 0 16px 50px ${medal.glow}`,
      }}
      variants={fromRight}
    >
      {empty ? (
        <div style={{ ...styles.emptySquare, ...styles.runnerFrame, width: "min(100%, 40vh)", height: "100%" }}>
          <div style={styles.runnerRankRow}>
            <span style={styles.runnerCrown}>{medal.crown}</span>
            <span style={{ ...styles.runnerRank, color: medal.color }}>{medal.label}</span>
          </div>
          <span style={styles.emptyText}>{loading ? "…" : "空いてます"}</span>
        </div>
      ) : (
        <div style={{ ...styles.runnerFrame, ...frameSize, boxShadow: `0 0 0 2px ${medal.color}99` }}>
          <img src={entry.imageUrl} alt={entry.name ?? entry.imageId} style={styles.img} onLoad={onImgLoad} />

          {/* 順位（左上の端） */}
          <div style={styles.runnerRankBadge}>
            <span style={styles.runnerCrown}>{medal.crown}</span>
            <span style={{ ...styles.runnerRank, color: medal.color, textShadow: "0 2px 8px rgba(0,0,0,0.85)" }}>
              {medal.label}
            </span>
          </div>

          {/* 得点（右下の端） */}
          <motion.div
            style={styles.runnerScoreBadge}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.2 }}
          >
            <span className="tnum" style={{ ...styles.runnerScore, color: medal.color }}>
              {entry.score}
            </span>
            <span style={styles.runnerScoreUnit}>点</span>
          </motion.div>

          {entry.name && (
            <div style={styles.runnerCaption} className="mono">
              {entry.name}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    padding: "clamp(0.5rem, 1.2vh, 1rem) clamp(0.6rem, 1.6vw, 1.6rem)",
    gap: "clamp(0.3rem, 0.8vh, 0.6rem)",
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
  header: { textAlign: "center" },
  title: {
    fontSize: "clamp(1.1rem, 2vw, 1.8rem)",
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
    gap: "clamp(0.5rem, 1.2vw, 1.2rem)",
    alignItems: "stretch",
  },
  leftCol: { minWidth: 0, minHeight: 0, display: "flex" },
  rightCol: {
    minWidth: 0,
    minHeight: 0,
    display: "grid",
    gridTemplateRows: "1fr 1fr",
    gap: "clamp(0.4rem, 1vh, 0.8rem)",
  },

  // --- 1位（チャンピオン） ---
  // 写真を左半分いっぱいにベストフィット。計測用コンテナとして中央にフレームを置く。
  champCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  champFrame: {
    position: "relative",
    maxWidth: "100%",
    maxHeight: "100%",
    borderRadius: 22,
    overflow: "hidden",
    background: "#000",
    // 空きスロット時の中身レイアウト用。
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
  },
  // 順位（写真左上の端にオーバーレイ）。
  champRankBadge: {
    position: "absolute",
    top: 16,
    left: 18,
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    zIndex: 2,
  },
  // 得点（写真右下の端にオーバーレイ）。
  champScoreBadge: {
    position: "absolute",
    right: 22,
    bottom: 14,
    display: "flex",
    alignItems: "baseline",
    gap: 6,
    zIndex: 2,
    textShadow: "0 3px 14px rgba(0,0,0,0.9), 0 0 26px rgba(0,0,0,0.7)",
  },
  champCaption: {
    position: "absolute",
    bottom: 16,
    left: 18,
    maxWidth: "55%",
    fontSize: "clamp(0.75rem, 1.2vw, 1.05rem)",
    letterSpacing: "0.05em",
    color: "rgba(230,240,255,0.95)",
    textShadow: "0 2px 8px rgba(0,0,0,0.9)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    zIndex: 2,
  },
  champCrown: { fontSize: "clamp(1.8rem, 3.4vw, 3.2rem)", alignSelf: "center" },
  champRank: { fontSize: "clamp(2.4rem, 4.6vw, 4rem)", fontWeight: 900, lineHeight: 1 },
  // 1位の得点（写真上でも読めるよう影付き）。
  champScore: { fontSize: "clamp(4.5rem, 9vw, 8.1rem)", fontWeight: 900, lineHeight: 1 },
  champScoreUnit: { fontSize: "clamp(1.3rem, 2.4vw, 2.2rem)", color: "rgba(230,240,255,0.85)" },

  // --- 2位・3位（ランナーアップ） ---
  // 写真主役。カードは計測用コンテナとして中央にフレームを置く。
  runnerCard: {
    position: "relative",
    minHeight: 0,
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "clamp(0.25rem, 0.6vh, 0.5rem)",
    borderRadius: 18,
    border: "1px solid var(--line)",
    background: "linear-gradient(180deg, rgba(13,22,46,0.7), rgba(6,10,22,0.7))",
    overflow: "hidden",
  },
  // 写真比率にフィットする実フレーム（順位・得点をこの上にオーバーレイ）。
  runnerFrame: {
    position: "relative",
    maxWidth: "100%",
    maxHeight: "100%",
    borderRadius: 14,
    overflow: "hidden",
    background: "#000",
    // 空きスロット時の中身レイアウト用。
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.4rem",
  },
  // 順位（写真左上の端にオーバーレイ）。
  runnerRankBadge: {
    position: "absolute",
    top: 10,
    left: 12,
    display: "flex",
    alignItems: "center",
    gap: "0.35rem",
    zIndex: 2,
  },
  // 得点（写真右下の端にオーバーレイ）。
  runnerScoreBadge: {
    position: "absolute",
    right: 14,
    bottom: 8,
    display: "flex",
    alignItems: "baseline",
    gap: 4,
    zIndex: 2,
    textShadow: "0 2px 10px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.7)",
  },
  runnerCaption: {
    position: "absolute",
    bottom: 6,
    left: 12,
    maxWidth: "58%",
    fontSize: "0.7rem",
    letterSpacing: "0.04em",
    color: "rgba(230,240,255,0.92)",
    textShadow: "0 2px 8px rgba(0,0,0,0.9)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    zIndex: 2,
  },
  runnerRankRow: { display: "flex", alignItems: "center", gap: "0.4rem" },
  runnerCrown: { fontSize: "clamp(1.3rem, 2.2vw, 2rem)" },
  runnerRank: { fontSize: "clamp(1.6rem, 2.6vw, 2.6rem)", fontWeight: 900, lineHeight: 1 },
  // 2位・3位の得点は大きく（写真上でも読めるよう影付き）。約1.4倍に拡大。
  runnerScore: { fontSize: "clamp(4.8rem, 8.4vw, 8.1rem)", fontWeight: 900, lineHeight: 1 },
  runnerScoreUnit: { fontSize: "clamp(1.3rem, 2.2vw, 2rem)", color: "rgba(230,240,255,0.85)" },

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
