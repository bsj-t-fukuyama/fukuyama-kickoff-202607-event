import { Fragment, useEffect, useState } from "react";
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

// カードの高さ（順位が高いほど大きい）。構図は共通で、px値だけ PC/スマホで変える。
function cardHeight(rank: number, mobile: boolean): string {
  if (mobile) return rank === 0 ? "58dvh" : rank <= 2 ? "46dvh" : "40dvh";
  return rank === 0 ? "82dvh" : rank <= 2 ? "66dvh" : "56dvh";
}

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
        <h1 style={styles.title}>結果発表</h1>
        <span style={styles.topBarSpacer} />
      </div>

      {/* PC・スマホ共通: 1位→6位 を縦に積み上げる（同じ構図・cover埋め）。
          違いは縦横の px 値だけ（PCは中央寄せの幅広カラム＋背の高いカード）。 */}
      <div style={{ ...styles.stack, ...(mobile ? styles.stackMobile : styles.stackPc) }}>
        {slots.map((entry, i) => (
          <Fragment key={i}>
            {i === 3 && <div style={styles.groupLabel}>4〜6位</div>}
            <Cell rank={i} delay={i * 0.05} style={{ height: cardHeight(i, mobile) }}>
              <ResultCard rank={i} entry={entry} loading={loading} />
            </Cell>
          </Fragment>
        ))}
      </div>
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

// 写真はセルいっぱいに敷き詰める（cover）。縦写真・横写真どちらでも余白(隙間)が
// 増えず、順位＝カードの大きさで自然に序列が伝わる。順位・得点・名前は端にオーバーレイし、
// 文字サイズはコンテナクエリ(cqw)でカード幅に追従するので、大小どのカードも同じ構図。
// 上位ほど枠を太く・強く光らせて“順位のグラデーション”を視覚化する。
// 枠線は細め。上位ほどほんの少しだけ太く。
const RANK_EMPHASIS = [
  { border: 2 }, // 1位
  { border: 1.5 }, // 2位
  { border: 1.5 }, // 3位
  { border: 1 }, // 4位
  { border: 1 }, // 5位
  { border: 1 }, // 6位
];

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
  const emph = RANK_EMPHASIS[rank] ?? RANK_EMPHASIS[5];

  if (empty) {
    return (
      <div style={{ ...styles.frame, ...styles.emptyFrame }}>
        <div style={styles.rankRow}>
          {medal.crown && <span style={styles.crown}>{medal.crown}</span>}
          <span style={{ ...styles.rank, color: medal.color }}>{medal.label}</span>
        </div>
        <span style={styles.emptyText}>{loading ? "…" : "空いてます"}</span>
      </div>
    );
  }

  return (
    <div
      style={{
        ...styles.frame,
        border: `${emph.border}px solid ${medal.color}`,
        boxShadow: `0 16px 50px ${medal.glow}`,
      }}
    >
      <img src={entry.imageUrl} alt={entry.name ?? entry.imageId} style={styles.img} />
      {/* 文字の可読性スクリム（左上＝順位 / 右下＝得点を少し暗く） */}
      <div style={styles.scrim} />

      {/* 順位（左上） */}
      <div style={styles.rankBadge}>
        {medal.crown && <span style={styles.crown}>{medal.crown}</span>}
        <span style={{ ...styles.rank, color: medal.color, textShadow: "0 2px 10px rgba(0,0,0,0.9)" }}>
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
    fontSize: "clamp(1.5rem, 3.4vw, 3rem)",
    fontWeight: 800,
    letterSpacing: "-0.02em",
    textAlign: "center",
    background: "linear-gradient(180deg, #fff, var(--blue-glow))",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  topBarSpacer: { width: 96 },
  // 「4〜6位」のセクション見出し（縦積みの 3位 と 4位 の間）。
  groupLabel: {
    textAlign: "center",
    fontSize: "clamp(1.3rem, 2.8vw, 2.2rem)",
    fontWeight: 800,
    letterSpacing: "0.08em",
    color: "var(--blue-glow)",
    marginTop: "clamp(0.4rem, 1.2vh, 1rem)",
  },

  // --- PC・スマホ共通の縦積み（違いは幅などの px 値のみ） ---
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: "clamp(0.7rem, 2vh, 1.4rem)",
    paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)",
  },
  stackMobile: { width: "100%" },
  // PC は中央寄せの幅広カラム。カードは背が高い（cardHeight 参照）。
  stackPc: { width: "min(920px, 66vw)", alignSelf: "center" },

  // 各セル（カードの置き場）。ResultCard がこの領域に写真をフィットさせる。
  cell: {
    minWidth: 0,
    minHeight: 0,
    display: "flex",
    // 既定はグリッド/親いっぱい（PC）。スマホは呼び出し側で height を上書きする。
    height: "100%",
  },

  // --- カード本体（共通） ---
  frame: {
    position: "relative",
    width: "100%",
    height: "100%",
    borderRadius: 18,
    overflow: "hidden",
    background: "#0a0e1a",
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
  // セルいっぱいに敷き詰める（cover）。縦横どちらの写真でも余白が出ない。
  img: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" },
  // 文字可読性のためのスクリム（左上＝順位 / 右下＝得点を少し暗く）。
  scrim: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background:
      "linear-gradient(135deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.12) 26%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.12) 74%, rgba(0,0,0,0.55) 100%)",
  },

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
