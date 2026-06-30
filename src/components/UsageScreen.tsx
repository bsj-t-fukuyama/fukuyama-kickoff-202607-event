import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

// 取扱説明（/usage）。懇親会でのこのアプリの使い方を、トピックごとのボタンで並べ、
// 押すと詳細が「背景をぼかした上の上位レイヤーに文字が浮かぶ」形で開く。
//
// 司会・運営向け。スタート画面の「使い方を見る」やURL直打ち(/usage)で到達する。

type Block = { h?: string; p?: string; list?: string[] };
type Topic = {
  key: string;
  icon: string;
  label: string;
  summary: string;
  body: Block[];
};

const TOPICS: Topic[] = [
  {
    key: "overview",
    icon: "✨",
    label: "概要",
    summary: "このアプリは何をする？",
    body: [
      {
        p: "懇親会でみんなが撮った写真を、カラオケの採点のように点数化して大画面で発表する“もりあげ装置”です。",
      },
      {
        h: "ざっくりの流れ",
        list: [
          "Google ドライブの指定フォルダに集まった写真を、サーバーが自動で見つける。",
          "1枚ずつ4つの観点で採点し、ゲージ・グレード・コメント付きで演出発表する。",
          "参加者は自分のスマホからも写真を投稿でき、その場で採点列に並ぶ。",
        ],
      },
      {
        h: "やさしい採点",
        p: "容姿は評価せず、減点ではなく加点方式。最低点に下駄を履かせ、グレード表記も全部ポジティブ。誰も傷つかない設計です。",
      },
    ],
  },
  {
    key: "start",
    icon: "🚀",
    label: "開始方法",
    summary: "スキャンの始め方",
    body: [
      {
        h: "1. 設定しておく",
        p: "先に /settings で、採点対象のドライブURL（とスキャン結果の保存先）を入れておきます。",
      },
      {
        h: "2. /main を開く",
        p: "司会用PCで /main を開くと、最初に「スタート！」画面が出ます。",
      },
      {
        h: "3. スタート！",
        p: "ボタンを押すとスキャン（写真の発見・採点）が始まります。押すまでは何も始まりません。リセット後もこの画面に戻り、勝手には再開しません。",
      },
    ],
  },
  {
    key: "reset",
    icon: "♻️",
    label: "データリセット",
    summary: "集計を1からやり直す",
    body: [
      {
        p: "/settings の「ランキングをリセット」から行います。会の入れ替え時などに使います。",
      },
      {
        h: "何が起きる？",
        list: [
          "シートのスキャン結果をすべて消去し、ヘッダのみに戻す。",
          "集計を1からやり直し、全ての写真が再スキャン（再採点）される。",
          "確認ダイアログ → リセット中スピナー → /main へ自動リロード。",
        ],
      },
      { h: "注意", p: "元には戻せません。実行は確認ダイアログで一度だけ確認します。" },
    ],
  },
  {
    key: "paths",
    icon: "🧭",
    label: "各pathの説明",
    summary: "画面（URL）の役割",
    body: [
      { h: "/main", p: "司会用のメイン画面。採点演出・スタート・スキップ/戻る・設定/結果ボタン。" },
      {
        h: "/view",
        p: "参加者スマホ向けの観覧専用画面。/main にリアルタイム追従。操作ボタンは出さず、右下から写真投稿、右上から結果へ。",
      },
      { h: "/result", p: "暫定の結果発表（ランキング）。上位6枚を表示。" },
      { h: "/settings", p: "ドライブURL・保存先・ランキングリセット。" },
      { h: "/usage", p: "このページ（使い方）。" },
      { h: "その他", p: "定義されていないパスは 404 になります。" },
    ],
  },
  {
    key: "post",
    icon: "📤",
    label: "投稿",
    summary: "参加者が写真を送る",
    body: [
      { h: "どこから？", p: "/view（参加者スマホ）の右下「＋ 投稿する」ボタンから、端末の写真を選びます。" },
      {
        h: "確認してから送る",
        p: "「本当に送っていいですか？」と選んだ画像を見せて確認します（機密写真の誤爆防止）。",
      },
      {
        h: "送ったあと",
        p: "ドライブのフォルダにアップされ、サーバーが自動で拾って採点列に並びます。そのまま採点・上演に乗ります。",
      },
    ],
  },
  {
    key: "ranking",
    icon: "🏆",
    label: "順位",
    summary: "暫定ランキングを見る",
    body: [
      {
        h: "開き方",
        p: "/main・/view の右上の表彰台ボタン、または /result を直接開きます。",
      },
      {
        h: "表示",
        p: "現時点の上位6枚を、PC／スマホそれぞれのレイアウトで表示します。スキャンが進むほど順位は更新されます。",
      },
    ],
  },
  {
    key: "settings",
    icon: "⚙️",
    label: "設定",
    summary: "ドライブURLなどの設定",
    body: [
      { h: "開き方", p: "/main 左上の歯車ボタン、または /settings。" },
      {
        h: "設定できること",
        list: [
          "ドライブのURL … 採点対象の写真が入っているフォルダ。",
          "スキャン結果の保存先 … 結果を書き込むシートの Web App URL。",
          "ランキングのリセット … 集計を初期化（元に戻せません）。",
        ],
      },
    ],
  },
  {
    key: "scoring",
    icon: "🎯",
    label: "判定方法",
    summary: "点数の決まり方",
    body: [
      {
        h: "4つの観点（最低点の下駄 FLOOR=8 から加点）",
        list: [
          "にぎやかさ（人数・40点）… 実際の頭数だけで決定。多いほど高得点、20人以上で35点超。",
          "笑顔・表情（20点）… 笑顔の数と強さ。",
          "構図・遠近感（20点）… 奥行き・バランス・水平。",
          "写りの良さ（20点）… ピント・明るさ・ブレ・顔の向き。",
        ],
      },
      {
        h: "やさしさルール",
        p: "容姿は一切評価しません。減点ではなく加点。グレード（S/A/B/C/D）は全部ポジティブな言い回しです。",
      },
      {
        h: "BRAVE THROUGH ボーナス",
        p: "50点以下でも、10%の確率で 70〜91点へ“格上げ”される救済演出が発動します。",
      },
    ],
  },
];

export default function UsageScreen({ onBack }: { onBack: () => void }) {
  const [active, setActive] = useState<Topic | null>(null);

  return (
    <motion.div
      style={styles.root}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onBack();
        }}
        style={styles.back}
        aria-label="採点画面に戻る"
      >
        ← 採点画面へ
      </button>

      <div style={styles.header}>
        <div className="eyebrow">USAGE</div>
        <h1 style={styles.title}>使い方</h1>
        <p style={styles.lead}>気になる項目を押すと、詳しい説明が開きます。</p>
      </div>

      <div style={styles.grid}>
        {TOPICS.map((t, i) => (
          <motion.button
            key={t.key}
            type="button"
            onClick={() => setActive(t)}
            style={styles.tile}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * i, type: "spring", stiffness: 220, damping: 22 }}
            whileHover={{ y: -4, boxShadow: "0 16px 40px rgba(1,90,255,0.35)", borderColor: "rgba(56,182,255,0.6)" }}
            whileTap={{ scale: 0.97 }}
          >
            <span style={styles.tileIcon} aria-hidden="true">
              {t.icon}
            </span>
            <span style={styles.tileLabel}>{t.label}</span>
            <span style={styles.tileSummary}>{t.summary}</span>
          </motion.button>
        ))}
      </div>

      {/* 詳細: 背景をぼかし、その上の上位レイヤーに文字が浮かぶ */}
      <AnimatePresence>
        {active && (
          <motion.div
            style={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
            onClick={() => setActive(null)}
          >
            <motion.div
              style={styles.detail}
              initial={{ opacity: 0, y: 26, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 240, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={styles.detailHead}>
                <span style={styles.detailIcon} aria-hidden="true">
                  {active.icon}
                </span>
                <h2 style={styles.detailTitle}>{active.label}</h2>
              </div>

              <div style={styles.detailBody}>
                {active.body.map((b, i) => (
                  <div key={i} style={styles.block}>
                    {b.h && <h3 style={styles.blockH}>{b.h}</h3>}
                    {b.p && <p style={styles.blockP}>{b.p}</p>}
                    {b.list && (
                      <ul style={styles.list}>
                        {b.list.map((li, j) => (
                          <li key={j} style={styles.li}>
                            {li}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>

              <button type="button" onClick={() => setActive(null)} style={styles.close}>
                閉じる
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    padding: "clamp(1.5rem, 4vh, 3rem) clamp(1.4rem, 5vw, 5rem)",
    gap: "clamp(1.2rem, 3vh, 2rem)",
    overflowY: "auto",
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
    cursor: "pointer",
    fontFamily: "var(--font)",
  },
  header: { display: "grid", gap: "0.35rem" },
  title: {
    fontSize: "clamp(2rem, 4.4vw, 3.6rem)",
    fontWeight: 800,
    letterSpacing: "-0.02em",
    background: "linear-gradient(180deg, #fff, var(--blue-glow))",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  lead: { fontSize: "clamp(0.9rem, 1.6vw, 1.1rem)", color: "var(--text-dim)" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 220px), 1fr))",
    gap: "clamp(0.8rem, 2vw, 1.3rem)",
  },
  tile: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "0.35rem",
    textAlign: "left",
    padding: "clamp(1.1rem, 2.4vh, 1.6rem)",
    borderRadius: 18,
    border: "1px solid var(--line)",
    background: "linear-gradient(180deg, rgba(13,22,46,0.72), rgba(6,10,22,0.72))",
    color: "var(--text)",
    cursor: "pointer",
    fontFamily: "var(--font)",
  },
  tileIcon: { fontSize: "1.8rem", lineHeight: 1 },
  tileLabel: { fontSize: "clamp(1.1rem, 1.8vw, 1.4rem)", fontWeight: 800, letterSpacing: "0.02em" },
  tileSummary: { fontSize: "0.85rem", color: "var(--text-dim)", lineHeight: 1.45 },

  // 詳細オーバーレイ: 背景をぼかす層
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 60,
    display: "grid",
    placeItems: "center",
    padding: "clamp(1.2rem, 4vw, 3rem)",
    background: "radial-gradient(circle at 50% 40%, rgba(6,12,30,0.6), rgba(1,3,10,0.82))",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
  },
  // 上位レイヤー: カードは限りなく透明にし、文字が“浮かぶ”ように見せる
  detail: {
    width: "min(720px, 100%)",
    maxHeight: "84vh",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "clamp(1rem, 2.5vh, 1.6rem)",
    padding: "clamp(1.2rem, 3vw, 2.2rem)",
    borderRadius: 22,
    background: "linear-gradient(180deg, rgba(10,16,34,0.42), rgba(5,9,20,0.42))",
    border: "1px solid rgba(120,170,255,0.22)",
    boxShadow: "0 30px 90px rgba(0,0,0,0.5)",
    textAlign: "center",
  },
  detailHead: { display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem" },
  detailIcon: { fontSize: "clamp(2.4rem, 7vw, 3.6rem)", lineHeight: 1 },
  detailTitle: {
    fontSize: "clamp(1.6rem, 4vw, 2.6rem)",
    fontWeight: 900,
    letterSpacing: "0.01em",
    color: "#fff",
    textShadow: "0 2px 18px rgba(56,182,255,0.5), 0 1px 2px rgba(0,0,0,0.6)",
  },
  detailBody: {
    display: "flex",
    flexDirection: "column",
    gap: "clamp(0.9rem, 2.2vh, 1.4rem)",
    textAlign: "left",
  },
  block: { display: "grid", gap: "0.35rem" },
  blockH: {
    fontSize: "clamp(1.05rem, 2vw, 1.3rem)",
    fontWeight: 800,
    color: "var(--blue-glow)",
    textShadow: "0 1px 10px rgba(0,0,0,0.55)",
  },
  blockP: {
    fontSize: "clamp(0.95rem, 1.7vw, 1.15rem)",
    lineHeight: 1.7,
    color: "rgba(232,242,255,0.96)",
    textShadow: "0 1px 8px rgba(0,0,0,0.65)",
  },
  list: { display: "grid", gap: "0.4rem", margin: 0, paddingLeft: "1.2em" },
  li: {
    fontSize: "clamp(0.95rem, 1.7vw, 1.15rem)",
    lineHeight: 1.6,
    color: "rgba(232,242,255,0.96)",
    textShadow: "0 1px 8px rgba(0,0,0,0.65)",
  },
  close: {
    alignSelf: "center",
    marginTop: "0.4rem",
    padding: "0.7rem 2rem",
    fontSize: "1rem",
    fontWeight: 700,
    color: "#04060d",
    background: "linear-gradient(180deg, #7fd0ff, var(--blue-bright))",
    border: "none",
    borderRadius: 999,
    cursor: "pointer",
    boxShadow: "0 8px 24px rgba(1,153,255,0.4)",
    fontFamily: "var(--font)",
  },
};
