import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { ScoredItem } from "../lib/api";

// 横長写真の追加ズーム倍率（左右の余白を詰めてなるべく大きく見せる）。
const LANDSCAPE_ZOOM = 1.1;

// The photo under judgement, with a sweeping scan beam, corner brackets and a
// filename readout. `scanning` controls whether the beam is animating.
//
// スマホの縦写真・横写真の両対応: カードを写真の実アスペクト比にぴったり合わせ、
// 利用できる領域の中で“全体が見える最大サイズ”に収める（クロップしない）。
// これで縦でも横でも、枠やコーナーが写真にフィットしたまま大きく表示できる。
export default function PhotoCard({
  item,
  scanning,
}: {
  item: ScoredItem;
  scanning: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const ratioRef = useRef<number | null>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);

  // 利用可能領域(cw×ch)に、写真比率(ratio=w/h)を保ったまま最大で収まる箱を計算。
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
    // 横長写真は左右の余白を詰めて、縦に収まる範囲でさらに拡大（横は領域を多少
    // はみ出してOK＝画面いっぱいに近づける）。縦長写真はそのまま。
    if (ratio >= 1) {
      const zoomed = h * LANDSCAPE_ZOOM;
      if (zoomed <= ch) {
        h = zoomed;
        w *= LANDSCAPE_ZOOM;
      } else {
        h = ch;
        w = ch * ratio;
      }
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

  // 領域サイズが変わったら（ウィンドウリサイズ等）再計算する。
  useLayoutEffect(() => {
    recompute();
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [recompute]);

  // 計測前のフォールバックは領域いっぱい（比率確定後に正確なサイズへ）。
  const cardSize: React.CSSProperties = box
    ? { width: box.w, height: box.h }
    : { width: "100%", height: "100%" };

  return (
    <div ref={wrapRef} style={styles.wrap}>
      <motion.div
        key={item.id}
        initial={{ opacity: 0, scale: 1.06, filter: "brightness(0.2)" }}
        animate={{ opacity: 1, scale: 1, filter: "brightness(1)" }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        style={{ ...styles.card, ...cardSize }}
      >
        <img src={item.imageUrl} alt={item.name} style={styles.img} onLoad={onImgLoad} />

        {/* scan beam */}
        {scanning && (
          <motion.div
            style={styles.beam}
            initial={{ top: "-10%" }}
            animate={{ top: "110%" }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* corner brackets */}
        <span style={{ ...styles.bracket, ...styles.tl }} />
        <span style={{ ...styles.bracket, ...styles.tr }} />
        <span style={{ ...styles.bracket, ...styles.bl }} />
        <span style={{ ...styles.bracket, ...styles.br }} />

        <div style={styles.metaWrap} className="mono">
          <div style={styles.id}>ID {item.id}</div>
        </div>
      </motion.div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  // 領域いっぱいの計測用ラッパー。中央にカードを置く。
  wrap: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 0,
    minWidth: 0,
  },
  card: {
    position: "relative",
    borderRadius: 18,
    overflow: "hidden",
    background: "#000",
    boxShadow:
      "0 40px 120px rgba(0,40,120,0.45), 0 0 0 1px rgba(120,170,255,0.18)",
  },
  // カードが写真比率にぴったりなので cover でもクロップは起きない（=全体表示）。
  img: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  beam: {
    position: "absolute",
    left: 0,
    right: 0,
    height: "14%",
    background:
      "linear-gradient(180deg, transparent, rgba(56,182,255,0.35) 45%, rgba(255,255,255,0.85) 50%, rgba(56,182,255,0.35) 55%, transparent)",
    mixBlendMode: "screen",
    pointerEvents: "none",
  },
  bracket: {
    position: "absolute",
    width: 28,
    height: 28,
    border: "2px solid rgba(180,220,255,0.85)",
  },
  tl: { top: 14, left: 14, borderRight: "none", borderBottom: "none" },
  tr: { top: 14, right: 14, borderLeft: "none", borderBottom: "none" },
  bl: { bottom: 14, left: 14, borderRight: "none", borderTop: "none" },
  br: { bottom: 14, right: 14, borderLeft: "none", borderTop: "none" },
  metaWrap: {
    position: "absolute",
    bottom: 16,
    left: 18,
    display: "flex",
    flexDirection: "column",
    gap: 3,
    textShadow: "0 2px 8px rgba(0,0,0,0.8)",
  },
  meta: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: "0.85rem",
    letterSpacing: "0.12em",
    color: "rgba(220,235,255,0.9)",
  },
  id: {
    fontSize: "0.62rem",
    letterSpacing: "0.08em",
    color: "rgba(180,205,240,0.5)",
    paddingLeft: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#ff4d4d",
    boxShadow: "0 0 10px #ff4d4d",
  },
};
