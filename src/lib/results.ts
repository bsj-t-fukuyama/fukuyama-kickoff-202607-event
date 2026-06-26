// Provisional ranking data for the 結果発表 (result) screen.
//
// RIGHT NOW this returns dummy data so the UI can be built and demoed without a
// backend. THE FUTURE: scan results are written to a spreadsheet keyed by the
// Drive image id (画像idごとに得点などを保存), and a server endpoint aggregates
// the current top scores. To switch over, replace the body of fetchResults()
// with a `fetch("/api/results")` call — the shape below is what that endpoint
// should return, so nothing else on the screen has to change.

export type ResultEntry = {
  imageId: string; // Drive 画像ID。将来スプレッドシートの主キーになる。
  imageUrl: string; // 表示用サムネイルURL
  score: number; // 0..100（採点ロジックと同じレンジ）
  name?: string; // 任意のラベル（ファイル名・撮影者など）
};

// 表彰台のサイズ（上位3件）。空きは画面側で「空いてます」と表示する。
export const PODIUM_SIZE = 3;

// --- ダミーデータ ----------------------------------------------------------
// picsum のサンプル写真（mock プロバイダと同じ）。認証不要で表示できる。
// 件数を 1〜2 件に減らすと、余った順位が「空いてます」で表示されるのを確認できる。
const DUMMY_RESULTS: ResultEntry[] = [
  { imageId: "demo-aurora", imageUrl: "https://picsum.photos/seed/aurora/900/1100", score: 93, name: "全員集合カンパイ" },
  { imageId: "demo-cheers", imageUrl: "https://picsum.photos/seed/cheers/900/1100", score: 88, name: "ベストスマイル" },
  { imageId: "demo-toast", imageUrl: "https://picsum.photos/seed/toast/900/1100", score: 81, name: "右手グッド" },
];

// 暫定の上位 PODIUM_SIZE 件を、得点の高い順で返す。
// async なのは、将来 fetch("/api/results") に差し替えても呼び出し側が無変更で済むため。
export async function fetchResults(): Promise<ResultEntry[]> {
  // 将来の実装イメージ:
  //   const res = await fetch("/api/results");
  //   if (!res.ok) throw new Error(`/api/results ${res.status}`);
  //   return res.json();
  return [...DUMMY_RESULTS]
    .sort((a, b) => b.score - a.score)
    .slice(0, PODIUM_SIZE);
}
