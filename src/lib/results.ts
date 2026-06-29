// 結果発表（暫定）画面のデータ。
//
// シート(DB)のスキャン済み(C=true)の中から 合計スコア(B) 上位6件をサーバー経由で取得する。
// サーバーは GAS(Apps Script) の ?action=top を叩いて集計し、画像URLを付けて返す。

export type ResultEntry = {
  imageId: string; // Drive 画像ID
  imageUrl: string; // 表示用サムネイルURL
  score: number; // 合計スコア（シートB列）
  name?: string; // 画像名（シートF列）
};

// 結果発表の表示件数（上位6件）。空きは画面側で「空いてます」と表示する。
export const PODIUM_SIZE = 6;

// 暫定の上位 PODIUM_SIZE 件（スコア降順）を取得する。失敗時は空配列。
export async function fetchResults(): Promise<ResultEntry[]> {
  const res = await fetch("/api/results");
  if (!res.ok) throw new Error(`/api/results ${res.status}`);
  const data = await res.json();
  return Array.isArray(data.results) ? data.results : [];
}
