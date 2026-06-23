import type { ReactNode } from "react";

// Full-screen animated backdrop: drifting blue gradient blobs, a faint moving
// grid, a vignette and a grain overlay. Shared by every screen.
export default function Background({ children }: { children: ReactNode }) {
  return (
    <div style={styles.root}>
      <div style={{ ...styles.blob, ...styles.blobA }} />
      <div style={{ ...styles.blob, ...styles.blobB }} />
      <div style={styles.grid} />
      <div style={styles.vignette} />
      <div style={styles.content}>{children}</div>
      <div style={styles.grain} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: "fixed",
    inset: 0,
    overflow: "hidden",
    background:
      "radial-gradient(120% 120% at 50% -10%, #0a1430 0%, #04060d 60%, #02030a 100%)",
  },
  blob: {
    position: "absolute",
    width: "70vmax",
    height: "70vmax",
    borderRadius: "50%",
    filter: "blur(90px)",
    opacity: 0.5,
    willChange: "transform",
  },
  blobA: {
    top: "-20%",
    left: "-10%",
    background:
      "radial-gradient(circle at 30% 30%, rgba(1,153,255,0.85), rgba(1,153,255,0) 60%)",
    animation: "drift-a 26s ease-in-out infinite",
  },
  blobB: {
    bottom: "-25%",
    right: "-15%",
    background:
      "radial-gradient(circle at 60% 60%, rgba(0,102,255,0.8), rgba(0,102,255,0) 60%)",
    animation: "drift-b 32s ease-in-out infinite",
  },
  grid: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "linear-gradient(rgba(120,170,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(120,170,255,0.06) 1px, transparent 1px)",
    backgroundSize: "80px 80px",
    maskImage: "radial-gradient(120% 90% at 50% 40%, #000 30%, transparent 80%)",
    WebkitMaskImage:
      "radial-gradient(120% 90% at 50% 40%, #000 30%, transparent 80%)",
    animation: "grid-pan 6s linear infinite",
  },
  vignette: {
    position: "absolute",
    inset: 0,
    boxShadow: "inset 0 0 30vmax rgba(0,0,0,0.7)",
    pointerEvents: "none",
  },
  content: {
    position: "relative",
    width: "100%",
    height: "100%",
    zIndex: 2,
  },
  grain: {
    position: "absolute",
    inset: 0,
    zIndex: 3,
    pointerEvents: "none",
    opacity: 0.05,
    mixBlendMode: "overlay",
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
  },
};
