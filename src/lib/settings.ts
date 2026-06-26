// 設定画面のデータ層。
//
// いま定義できる設定は「ドライブのURL」だけ。
//   ・現在サーバーに設定されているURL → GET /api/config の driveUrl
//   ・ユーザーが画面で定義した値 → いまはブラウザ(localStorage)に保存しておく
// 将来、保存をサーバーへ反映（POST /api/settings 等でフォルダを切り替え）する際は
// saveDriveUrl() の中身を差し替えるだけで済むよう、ここに集約している。

const DRIVE_URL_KEY = "settings.driveUrl";

// サーバーが現在使っているドライブURL（folderId から組み立てたもの）を取得。
export async function fetchServerDriveUrl(): Promise<string> {
  const res = await fetch("/api/config");
  if (!res.ok) throw new Error(`/api/config ${res.status}`);
  const data = await res.json();
  return typeof data.driveUrl === "string" ? data.driveUrl : "";
}

// ユーザーが画面で定義・保存した値（なければ null）。
export function loadSavedDriveUrl(): string | null {
  try {
    return window.localStorage.getItem(DRIVE_URL_KEY);
  } catch {
    return null;
  }
}

// 画面で定義した値を保存する（現状はブラウザ保存。将来サーバー反映に拡張可能）。
export async function saveDriveUrl(url: string): Promise<void> {
  try {
    window.localStorage.setItem(DRIVE_URL_KEY, url);
  } catch {
    /* localStorage 不可環境では無視 */
  }
  // 将来: await fetch("/api/settings", { method: "POST", body: ... }) でサーバー反映。
}

// --- スキャン結果の保存先 (Apps Script Web App URL) -------------------------
// こちらはサーバー側に永続化され、実際の保存処理に反映される。

export async function fetchSheetWebhookUrl(): Promise<string> {
  const res = await fetch("/api/settings");
  if (!res.ok) throw new Error(`/api/settings ${res.status}`);
  const data = await res.json();
  return typeof data.sheetWebhookUrl === "string" ? data.sheetWebhookUrl : "";
}

export async function saveSheetWebhookUrl(url: string): Promise<string> {
  const res = await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sheetWebhookUrl: url }),
  });
  if (!res.ok) throw new Error(`/api/settings ${res.status}`);
  const data = await res.json();
  return typeof data.sheetWebhookUrl === "string" ? data.sheetWebhookUrl : "";
}

// --- ランキングのリセット --------------------------------------------------
// シートをヘッダのみに戻し、サーバーの集計もクリアして 1 から再スキャンさせる。
export async function resetRanking(): Promise<void> {
  const res = await fetch("/api/reset", { method: "POST" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `/api/reset ${res.status}`);
  }
}
