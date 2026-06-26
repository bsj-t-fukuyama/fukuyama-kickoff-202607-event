import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  fetchServerDriveUrl,
  loadSavedDriveUrl,
  saveDriveUrl,
  fetchSheetWebhookUrl,
  saveSheetWebhookUrl,
} from "../lib/settings";

// 設定画面。いま定義できるのは「ドライブのURL」だけ。
// 初期値はユーザーが保存した値、なければサーバーが現在使っているURL。
// 入力欄には現在のドライブURLをそのまま入れておく（テキストホルダー）。

const screenVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { when: "beforeChildren" as const, staggerChildren: 0.1, delayChildren: 0.05 },
  },
  exit: { opacity: 0, transition: { duration: 0.25 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 220, damping: 24 } },
};

export default function SettingsScreen({ onBack }: { onBack: () => void }) {
  const [driveUrl, setDriveUrl] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchServerDriveUrl()
      .then((url) => {
        if (!alive) return;
        setServerUrl(url);
        // 保存済みがあればそれを、なければ現在サーバーのURLを初期表示。
        setDriveUrl(loadSavedDriveUrl() ?? url);
      })
      .catch(() => {
        if (!alive) return;
        setDriveUrl(loadSavedDriveUrl() ?? "");
      });
    // 保存先 Web App URL（サーバーの現在値＝既定URL or 保存済み）。
    fetchSheetWebhookUrl()
      .then((url) => alive && setWebhookUrl(url))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  async function handleSave() {
    await saveDriveUrl(driveUrl.trim());
    const url = await saveSheetWebhookUrl(webhookUrl.trim());
    setWebhookUrl(url);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

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
        variants={itemVariants}
        whileHover={{ x: -4 }}
        aria-label="採点画面に戻る"
      >
        ← 採点画面へ
      </motion.button>

      <motion.div style={styles.header} variants={itemVariants}>
        <div className="eyebrow">SETTINGS</div>
        <h1 style={styles.title}>設定</h1>
      </motion.div>

      <motion.div style={styles.card} variants={itemVariants}>
        <label style={styles.label} htmlFor="driveUrl">
          ドライブのURL
        </label>
        <p style={styles.hint}>採点対象の写真が入っている Google ドライブのフォルダURL。</p>
        <input
          id="driveUrl"
          type="text"
          value={driveUrl}
          onChange={(e) => setDriveUrl(e.target.value)}
          placeholder={serverUrl || "https://drive.google.com/drive/folders/..."}
          style={styles.input}
          spellCheck={false}
          autoComplete="off"
        />

        <div style={styles.divider} />

        <label style={styles.label} htmlFor="webhookUrl">
          スキャン結果の保存先（シートのWeb App URL）
        </label>
        <p style={styles.hint}>
          採点結果を書き込む Apps Script Web App のURL。スキャン後、画像idをキーにスコア・
          スキャン済みフラグをこのシートへ保存します。
        </p>
        <input
          id="webhookUrl"
          type="text"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          placeholder="https://script.google.com/macros/s/.../exec"
          style={styles.input}
          spellCheck={false}
          autoComplete="off"
        />

        <div style={styles.actions}>
          <button type="button" onClick={handleSave} style={styles.saveBtn}>
            保存する
          </button>
          {saved && <span style={styles.savedMsg}>保存しました ✓</span>}
        </div>
      </motion.div>
    </motion.div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    padding: "clamp(1.5rem, 4vh, 3rem) clamp(2rem, 5vw, 5rem)",
    gap: "clamp(1.2rem, 3vh, 2.4rem)",
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
  header: { display: "grid", gap: "0.3rem" },
  title: {
    fontSize: "clamp(2rem, 4.4vw, 3.6rem)",
    fontWeight: 800,
    letterSpacing: "-0.02em",
    background: "linear-gradient(180deg, #fff, var(--blue-glow))",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  card: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "0.7rem",
    padding: "clamp(1.4rem, 3vh, 2.4rem)",
    borderRadius: 20,
    border: "1px solid var(--line)",
    background: "linear-gradient(180deg, rgba(13,22,46,0.7), rgba(6,10,22,0.7))",
  },
  label: {
    fontSize: "clamp(1.1rem, 1.8vw, 1.5rem)",
    fontWeight: 700,
    color: "var(--text)",
    letterSpacing: "0.02em",
  },
  hint: { fontSize: "0.9rem", color: "var(--text-dim)", lineHeight: 1.5 },
  divider: { height: 1, background: "var(--line)", margin: "1.2rem 0 0.2rem" },
  input: {
    marginTop: "0.4rem",
    width: "100%",
    padding: "0.9rem 1.1rem",
    fontSize: "clamp(0.95rem, 1.4vw, 1.15rem)",
    color: "var(--text)",
    background: "rgba(4,8,18,0.7)",
    border: "1px solid rgba(120,170,255,0.3)",
    borderRadius: 12,
    outline: "none",
    fontFamily: "var(--mono)",
    letterSpacing: "0.01em",
  },
  actions: { display: "flex", alignItems: "center", gap: "1rem", marginTop: "0.8rem" },
  saveBtn: {
    padding: "0.7rem 1.6rem",
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
  savedMsg: { fontSize: "0.95rem", color: "var(--blue-glow)", fontWeight: 600 },
};
