// 参加者(/view)がスマホで選んだ写真を Drive フォルダへ保存する。
//
// 既存の Apps Script Web App（シート保存と同じ webhook URL）に action:"upload" を
// POST するだけ。Apps Script はフォルダ所有者として動くので、サービスアカウントも
// 追加の認証鍵も不要。保存先フォルダは DRIVE_FOLDER_ID。

import { config } from "./config.js";
import { getSheetWebhookUrl } from "./settings.js";

export async function uploadToDrive({ name, mimeType, base64 }) {
  const url = getSheetWebhookUrl();
  if (!url) throw new Error("アップロード先が未設定です（Apps Script Web App URL が必要）");
  const folderId = config.google.folderId;
  if (!folderId) throw new Error("DRIVE_FOLDER_ID が未設定です");
  if (!base64) throw new Error("画像データがありません");

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    redirect: "follow",
    body: JSON.stringify({
      token: config.sheets.webhookToken,
      action: "upload",
      folderId,
      name: name || "",
      mimeType: mimeType || "image/jpeg",
      data: base64,
    }),
  });
  if (!res.ok) throw new Error(`upload webhook HTTP ${res.status}`);
  const data = await res.json().catch(() => ({}));
  if (data && data.ok === false) throw new Error(`upload: ${data.error || "rejected"}`);
  return { id: data.id, name: data.name };
}
