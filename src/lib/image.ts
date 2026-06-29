// スマホで選んだ写真を、アップロード前にクライアントで縮小・JPEG化する。
// 目的: 通信を軽くして投稿をスムーズにし、サーバー/Apps Script のペイロードを抑える。
// 長辺 maxDim px に収め、JPEG 品質 quality で書き出す。

export type PreparedImage = {
  dataUrl: string; // プレビュー表示用（data:image/jpeg;base64,...）
  base64: string; // アップロード本体（ヘッダを除いた base64）
  mimeType: string;
};

export async function prepareImage(
  file: File,
  maxDim = 1600,
  quality = 0.85,
): Promise<PreparedImage> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error("画像を読み込めませんでした"));
      im.src = url;
    });

    const longest = Math.max(img.naturalWidth, img.naturalHeight) || 1;
    const scale = Math.min(1, maxDim / longest);
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("この端末では画像を処理できませんでした");
    ctx.drawImage(img, 0, 0, w, h);

    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    return { dataUrl, base64: dataUrl.split(",")[1] ?? "", mimeType: "image/jpeg" };
  } finally {
    URL.revokeObjectURL(url);
  }
}
