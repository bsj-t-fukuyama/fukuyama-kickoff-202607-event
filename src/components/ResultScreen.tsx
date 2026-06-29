import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { fetchResults, PODIUM_SIZE, type ResultEntry } from "../lib/results";

// 結果発表（暫定）画面。上位6件を表示する。
//
// レイアウト:
//   ・PC（横長）… 最初の画面に 1位（左半分）＋ 2位/3位（右半分の上下）。下へスクロール
//                 すると 4〜6位 が同じ構図のままコンパクトに左→右で3つ並ぶ。
//   ・スマホ（縦長）… 全順位がカードとして 1位→6位 に上から積み上がる（縦スクロール）。
// 足りない順位は「空いてます」のプレースホルダ。
// 各カードの順位/得点の文字はコンテナクエリ(cqw)でカード幅に応じて自動スケールする。

// 順位ごとのアクセント（金・銀・銅 → 4位以降は青系）。
const MEDALS = [
  { label: "1位", color: "#ffd24d", glow: "rgba(255,210,77,0.5)", crown: "👑" },
  { label: "2位", color: "#cfe0ff", glow: "rgba(207,224,255,0.4)", crown: "🥈" },
  { label: "3位", color: "#ff9d5c", glow: "rgba(255,157,92,0.4)", crown: "🥉" },
  { label: "4位", color: "#8fb8e6", glow: "rgba(143,184,230,0.35)", crown: "" },
  { label: "5位", color: "#8fb8e6", glow: "rgba(143,184,230,0.35)", crown: "" },
  { label: "6位", color: "#8fb8e6", glow: "rgba(143,184,230,0.35)", crown: "" },
];

const screenVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { when: "beforeChildren" as const, staggerChildren: 0.06 } },
  exit: { opacity: 0, transition: { duration: 0.25 } },
};

// 横幅でPC/スマホを判定（リサイズ追従）。
function useIsMobile(breakpoint = 820) {
  const [mobile, setMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= breakpoint,
  );
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth <= breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);
  return mobile;
}

export default function ResultScreen({ onBack }: { onBack: () => void }) {
  const [entries, setEntries] = useState<ResultEntry[] | null>(null);
  const mobile = useIsMobile();

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
      <div style={styles.topBar}>
        <motion.button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onBack();
          }}
          style={styles.back}
          whileHover={{ x: -4 }}
          aria-label="採点画面に戻る"
        >
          ← 採点画面へ
        </motion.button>
        <h1 style={styles.title}>結果発表（暫定）</h1>
        <span style={styles.topBarSpacer} />
      </div>

      {mobile ? (
        // --- スマホ: 1位→6位 を縦に積み上げる ---
        <div style={styles.mobileStack}>
          {slots.map((entry, i) => (
            <Cell
              key={i}
              rank={i}
              delay={i * 0.05}
              style={{ height: i === 0 ? "58dvh" : i <= 2 ? "46dvh" : "40dvh" }}
            >
              <ResultCard rank={i} entry={entry} loading={loading} />
            </Cell>
          ))}
        </div>
      ) : (
        // --- PC: 1位(左) + 2/3位(右) を1画面、スクロールで 4〜6位 ---
        <>
          <div style={styles.podium}>
            <Cell rank={0} delay={0} style={styles.leftCol}>
              <ResultCard rank={0} entry={slots[0]} loading={loading} />
            </Cell>
            <div style={styles.rightCol}>
              <Cell rank={1} delay={0.06}>
                <ResultCard rank={1} entry={slots[1]} loading={loading} />
              </Cell>
              <Cell rank={2} delay={0.12}>
                <ResultCard rank={2} entry={slots[2]} loading={loading} />
              </Cell>
            </div>
          </div>

          <div style={styles.lowerSection}>
            <div style={styles.lowerTitle}>4〜6位</div>
            <div style={styles.lowerGrid}>
              {[3, 4, 5].map((r, k) => (
                <Cell key={r} rank={r} delay={0.05 * k}>
                  <ResultCard rank={r} entry={slots[r]} loading={loading} />
                </Cell>
              ))}
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}

// 各カードの入場アニメ＋セル領域。ResultCard はこのセルいっぱいに写真をベストフィットする。
function Cell({
  rank,
  delay,
  style,
  children,
}: {
  rank: number;
  delay: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      style={{ ...styles.cell, ...style }}
      initial={{ opacity: 0, y: 22, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 24, delay }}
      data-rank={rank}
    >
      {children}
    </motion.div>
  );
}

// 写真を実アスペクト比でセルにベストフィットし、順位・得点・名前を端にオーバーレイ。
// 文字サイズはコンテナクエリ(cqw)でカード幅に追従するので、大小どのカードでも同じ構図。
function ResultCard({
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
    <div ref={wrapRef} style={styles.cardWrap}>
      {empty ? (
        <div style={{ ...styles.frame, ...styles.emptyFrame, width: "min(100%, 60vh)", height: "100%" }}>
          <div style={styles.rankRow}>
            {medal.crown && <span style={styles.crown}>{medal.crown}</span>}
            <span style={{ ...styles.rank, color: medal.color }}>{medal.label}</span>
          </div>
          <span style={styles.emptyText}>{loading ? "…" : "空いてます"}</span>
        </div>
      ) : (
        <div
          style={{
            ...styles.frame,
            ...frameSize,
            boxShadow: `0 0 0 2px ${medal.color}, 0 18px 60px ${medal.glow}`,
          }}
        >
          <img src={entry.imageUrl} alt={entry.name ?? entry.imageId} style={styles.img} onLoad={onImgLoad} />

          {/* 順位（左上） */}
          <div style={styles.rankBadge}>
            {medal.crown && <span style={styles.crown}>{medal.crown}</span>}
            <span style={{ ...styles.rank, color: medal.color, textShadow: "0 2px 10px rgba(0,0,0,0.85)" }}>
              {medal.label}
            </span>
          </div>

          {/* 得点（右下） */}
          <div style={styles.scoreBadge}>
            <span className="tnum" style={{ ...styles.score, color: medal.color }}>
              {entry.score}
            </span>
            <span style={styles.scoreUnit}>点</span>
          </div>

          {entry.name && (
            <div style={styles.caption} className="mono">
              {entry.name}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    height: "100%",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    padding: "clamp(0.5rem, 1.2vh, 1rem) clamp(0.6rem, 1.6vw, 1.6rem)",
    gap: "clamp(0.4rem, 1vh, 0.8rem)",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1rem",
  },
  back: {
    background: "rgba(120,170,255,0.08)",
    border: "1px solid var(--line)",
    color: "var(--text)",
    borderRadius: 999,
    padding: "0.5rem 1rem",
    fontSize: "0.85rem",
    letterSpacing: "0.08em",
    cursor: "inherit",
    fontFamily: "var(--font)",
    whiteSpace: "nowrap",
  },
  title: {
    fontSize: "clamp(1.1rem, 2vw, 1.8rem)",
    fontWeight: 800,
    letterSpacing: "-0.02em",
    textAlign: "center",
    background: "linear-gradient(180deg, #fff, var(--blue-glow))",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  topBarSpacer: { width: 96 },

  // --- PC: 1画面ぶんの表彰台（1位+2/3位） ---
  podium: {
    flexShrink: 0,
    height: "calc(100dvh - 5.5rem)",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "clamp(0.5rem, 1.2vw, 1.2rem)",
    alignItems: "stretch",
  },
  leftCol: { minWidth: 0, minHeight: 0 },
  rightCol: {
    minWidth: 0,
    minHeight: 0,
    display: "grid",
    gridTemplateRows: "1fr 1fr",
    gap: "clamp(0.4rem, 1vh, 0.8rem)",
  },

  // --- PC: スクロールで現れる 4〜6位（コンパクトに3つ横並び） ---
  lowerSection: {
    flexShrink: 0,
    paddingTop: "clamp(0.6rem, 1.4vh, 1.2rem)",
    display: "flex",
    flexDirection: "column",
    gap: "clamp(0.4rem, 1vh, 0.8rem)",
  },
  lowerTitle: {
    textAlign: "center",
    fontSize: "clamp(0.95rem, 1.6vw, 1.4rem)",
    fontWeight: 800,
    letterSpacing: "0.06em",
    color: "var(--blue-glow)",
  },
  lowerGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "clamp(0.5rem, 1.2vw, 1.2rem)",
    height: "min(46dvh, 420px)",
  },

  // --- スマホ: 縦積み ---
  mobileStack: {
    display: "flex",
    flexDirection: "column",
    gap: "clamp(0.7rem, 2vh, 1.2rem)",
    paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)",
  },

  // 各セル（カードの置き場）。ResultCard がこの領域に写真をフィットさせる。
  cell: {
    minWidth: 0,
    minHeight: 0,
    display: "flex",
    // 既定はグリッド/親いっぱい（PC）。スマホは呼び出し側で height を上書きする。
    height: "100%",
  },

  // --- カード本体（共通） ---
  cardWrap: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  frame: {
    position: "relative",
    maxWidth: "100%",
    maxHeight: "100%",
    borderRadius: 18,
    overflow: "hidden",
    background: "#000",
    // 文字をカード幅基準でスケールさせるためのコンテナ。
    containerType: "inline-size",
  },
  emptyFrame: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    border: "2px dashed rgba(120,170,255,0.3)",
    background: "rgba(120,170,255,0.04)",
  },
  img: { width: "100%", height: "100%", objectFit: "cover", display: "block" },

  // 端のオーバーレイ（cqw でカード幅に追従）。
  rankBadge: {
    position: "absolute",
    top: "4cqw",
    left: "4cqw",
    display: "flex",
    alignItems: "center",
    gap: "0.35em",
    zIndex: 2,
  },
  rankRow: { display: "flex", alignItems: "center", gap: "0.4rem" },
  crown: { fontSize: "clamp(0.9rem, 9cqw, 3.2rem)", lineHeight: 1 },
  rank: { fontSize: "clamp(1rem, 11cqw, 4rem)", fontWeight: 900, lineHeight: 1 },
  scoreBadge: {
    position: "absolute",
    right: "5cqw",
    bottom: "3.5cqw",
    display: "flex",
    alignItems: "baseline",
    gap: "0.1em",
    zIndex: 2,
    textShadow: "0 3px 14px rgba(0,0,0,0.9), 0 0 26px rgba(0,0,0,0.7)",
  },
  score: { fontSize: "clamp(1.6rem, 26cqw, 8.1rem)", fontWeight: 900, lineHeight: 1 },
  scoreUnit: { fontSize: "clamp(0.7rem, 6cqw, 2.2rem)", color: "rgba(230,240,255,0.85)" },
  caption: {
    position: "absolute",
    bottom: "3.5cqw",
    left: "4cqw",
    maxWidth: "56%",
    fontSize: "clamp(0.6rem, 4cqw, 1.05rem)",
    letterSpacing: "0.04em",
    color: "rgba(230,240,255,0.95)",
    textShadow: "0 2px 8px rgba(0,0,0,0.9)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    zIndex: 2,
  },
  emptyText: {
    fontSize: "clamp(1rem, 1.8vw, 1.5rem)",
    color: "var(--text-dim)",
    letterSpacing: "0.12em",
    fontWeight: 600,
  },
};
