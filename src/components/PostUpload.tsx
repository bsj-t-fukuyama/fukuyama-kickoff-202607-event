import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { prepareImage, type PreparedImage } from "../lib/image";
import { uploadPhoto } from "../lib/api";

// /view（参加者スマホ）の右下に出す投稿フローティングボタン。
//
// 流れ: ボタン → 端末の写真を選ぶ → 「この写真を送りますか？」と“選んだ画像を見せて”確認
// （誤って機密写真を送る事故を防ぐ）→ OK で Drive フォルダへアップロード。
//
// アップした写真はサーバーのポーリングで拾われ、そのまま採点・上演に乗る。

type Phase = "idle" | "preparing" | "confirm" | "uploading" | "done" | "error";

export default function PostUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [picked, setPicked] = useState<PreparedImage | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");

  const openPicker = () => {
    if (phase === "uploading" || phase === "preparing") return;
    inputRef.current?.click();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 同じファイルを連続で選べるよう input をリセット。
    e.target.value = "";
    if (!file) return;
    setError("");
    setPhase("preparing");
    try {
      const prepared = await prepareImage(file);
      setPicked(prepared);
      setFileName(file.name || "photo.jpg");
      setPhase("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "画像の準備に失敗しました");
      setPhase("error");
    }
  };

  const cancel = () => {
    setPicked(null);
    setFileName("");
    setPhase("idle");
  };

  const send = async () => {
    if (!picked) return;
    setPhase("uploading");
    setError("");
    try {
      await uploadPhoto({ name: fileName, mimeType: picked.mimeType, data: picked.base64 });
      setPhase("done");
      setPicked(null);
      window.setTimeout(() => setPhase((p) => (p === "done" ? "idle" : p)), 2600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "アップロードに失敗しました");
      setPhase("error");
    }
  };

  const busy = phase === "uploading" || phase === "preparing";

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onFile}
        style={{ display: "none" }}
      />

      {/* フローティングボタン（横長・角丸の「＋ 投稿する」） */}
      <div style={styles.fabWrap}>
        <motion.button
          type="button"
          onClick={openPicker}
          style={styles.fab}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.94 }}
          aria-label="写真を投稿する"
          disabled={busy}
        >
          <span style={styles.fabPlus}>{phase === "preparing" ? "…" : "＋"}</span>
          <span style={styles.fabText}>投稿する</span>
        </motion.button>
      </div>

      {/* 確認モーダル: 選んだ写真を見せて「本当に送っていいですか？」 */}
      <AnimatePresence>
        {phase === "confirm" && picked && (
          <motion.div
            style={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              style={styles.modal}
              initial={{ y: 40, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
            >
              <div style={styles.modalTitle}>本当に送っていいですか？</div>
              <div style={styles.modalSub}>この写真がみんなの画面に表示されます</div>

              <div style={styles.previewWrap}>
                <img src={picked.dataUrl} alt={fileName} style={styles.preview} />
              </div>
              <div style={styles.fileName}>{fileName}</div>

              <div style={styles.actions}>
                <button type="button" onClick={cancel} style={styles.cancelBtn}>
                  キャンセル
                </button>
                <button type="button" onClick={send} style={styles.sendBtn}>
                  送信する
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* アップロード中 / 完了 / エラーの簡易トースト */}
      <AnimatePresence>
        {(phase === "uploading" || phase === "done" || phase === "error") && (
          <motion.div
            key={phase}
            style={{
              ...styles.toast,
              ...(phase === "error" ? styles.toastError : null),
              ...(phase === "done" ? styles.toastDone : null),
            }}
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
          >
            {phase === "uploading" && "アップロード中…"}
            {phase === "done" && "送信しました！ありがとう🎉"}
            {phase === "error" && (
              <span onClick={() => setPhase("idle")} style={{ cursor: "pointer" }}>
                ⚠️ {error}（タップで閉じる）
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  fabWrap: {
    position: "fixed",
    right: "max(16px, env(safe-area-inset-right))",
    bottom: "max(20px, env(safe-area-inset-bottom))",
    zIndex: 10005,
    display: "flex",
    pointerEvents: "auto",
  },
  // 横長・角丸の長方形ボタン。高さは元の丸ボタン(64px)の約80%。
  fab: {
    height: 51,
    padding: "0 18px",
    borderRadius: 16,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    border: "1px solid rgba(56,182,255,0.55)",
    background: "linear-gradient(160deg, #1fa2ff, #0066ff)",
    color: "#fff",
    cursor: "pointer",
    boxShadow: "0 10px 28px rgba(1,90,255,0.5), 0 0 0 5px rgba(56,182,255,0.12)",
  },
  fabPlus: { fontSize: "1.5rem", fontWeight: 800, lineHeight: 1 },
  fabText: { fontSize: "0.95rem", fontWeight: 800, letterSpacing: "0.06em" },
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 10060,
    display: "grid",
    placeItems: "center",
    padding: "5vw",
    background: "rgba(2,5,14,0.78)",
    backdropFilter: "blur(6px)",
  },
  modal: {
    width: "min(440px, 92vw)",
    maxHeight: "88vh",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.7rem",
    padding: "clamp(1.1rem, 5vw, 1.8rem)",
    borderRadius: 22,
    background: "linear-gradient(180deg, rgba(12,18,38,0.99), rgba(8,12,28,0.99))",
    border: "1px solid rgba(120,170,255,0.3)",
    boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
    textAlign: "center",
  },
  modalTitle: {
    fontSize: "clamp(1.3rem, 5.5vw, 1.7rem)",
    fontWeight: 900,
    background: "linear-gradient(180deg, #fff, #9fd2ff)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  modalSub: { fontSize: "0.85rem", color: "var(--text-dim)" },
  previewWrap: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
    background: "#000",
    border: "1px solid rgba(120,170,255,0.2)",
  },
  preview: { width: "100%", maxHeight: "52vh", objectFit: "contain", display: "block" },
  fileName: {
    fontSize: "0.78rem",
    color: "var(--text-dim)",
    wordBreak: "break-all",
    maxWidth: "100%",
  },
  actions: { display: "flex", gap: "0.8rem", width: "100%", marginTop: "0.3rem" },
  cancelBtn: {
    flex: 1,
    padding: "0.85rem 1rem",
    borderRadius: 99,
    border: "1px solid rgba(160,195,255,0.4)",
    background: "transparent",
    color: "var(--text)",
    fontSize: "1rem",
    fontWeight: 700,
    cursor: "pointer",
  },
  sendBtn: {
    flex: 1.4,
    padding: "0.85rem 1rem",
    borderRadius: 99,
    border: "1px solid rgba(56,182,255,0.6)",
    background: "linear-gradient(160deg, #1fa2ff, #0066ff)",
    color: "#fff",
    fontSize: "1rem",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 8px 22px rgba(1,90,255,0.45)",
  },
  toast: {
    position: "fixed",
    left: "50%",
    bottom: "max(96px, calc(env(safe-area-inset-bottom) + 96px))",
    transform: "translateX(-50%)",
    zIndex: 10061,
    maxWidth: "90vw",
    padding: "0.7rem 1.2rem",
    borderRadius: 99,
    background: "rgba(1,153,255,0.95)",
    color: "#fff",
    fontSize: "0.9rem",
    fontWeight: 700,
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
    textAlign: "center",
  },
  toastDone: { background: "rgba(28,170,90,0.96)" },
  toastError: { background: "rgba(210,60,60,0.96)" },
};
