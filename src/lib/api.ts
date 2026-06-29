export type Axis = {
  key: string;
  label: string;
  value: number; // 0..100
  weight: number;
};

// Concrete signals the AI judge detected (absent when the dummy scorer ran).
export type JudgeSignals = {
  peopleCount?: number;
  personDetected?: boolean;
  multiplePeople?: boolean;
  smiling?: boolean;
  posing?: boolean;
  instagramWorthy?: boolean;
  faceClarity?: boolean;
  note?: string;
};

export type ScoredItem = {
  id: string;
  name: string;
  imageUrl: string;
  index: number;
  score: number; // 0..100
  grade: "S" | "A" | "B" | "C" | "D";
  breakdown: Axis[];
  signals?: JudgeSignals;
};

export type QueueStats = {
  total: number;
  shown: number;
  pending: number;
  theme: string;
  provider: string;
  running?: boolean; // スキャン稼働中か（スタート前/リセット後は false）
};

export type NextResponse = {
  item: ScoredItem | null;
  stats: QueueStats;
};

export async function fetchNext(cursor: number): Promise<NextResponse> {
  const res = await fetch(`/api/next?cursor=${cursor}`);
  if (!res.ok) throw new Error(`/api/next ${res.status}`);
  return res.json();
}

// --- リアルタイム同期（/main 主導 → /view 追従） ----------------------------
export type Presentation = {
  index: number | null; // 現在 /main が表示中の写真の index（null=未開始）
  startedAt?: number; // その表示を開始したサーバー時刻(ms)
  now: number; // サーバーの現在時刻(ms)
};

// /main が写真を切り替えたら呼ぶ: 「いまこの index を出した」と報告。
export async function reportPresentation(index: number): Promise<void> {
  await fetch("/api/presentation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ index }),
  });
}

// /main が次の写真待ち（アイドル）になったら呼ぶ: /view も待機画面へ戻す。
export async function reportIdle(): Promise<void> {
  await fetch("/api/presentation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ index: null }),
  });
}

// --- スキャンの開始（スタート画面） ---------------------------------------
// 現在スキャンが稼働中か。/main がスタート画面を出すか判定するのに使う。
export async function fetchRunning(): Promise<boolean> {
  const res = await fetch("/api/state");
  if (!res.ok) throw new Error(`/api/state ${res.status}`);
  const data = await res.json();
  return !!data.running;
}

// 「スタート！」: スキャンを開始する。
export async function startScan(): Promise<void> {
  const res = await fetch("/api/start", { method: "POST" });
  if (!res.ok) throw new Error(`/api/start ${res.status}`);
}

// /view がポーリングして現在の上演状態を取得する。
export async function fetchPresentation(): Promise<Presentation> {
  const res = await fetch("/api/presentation");
  if (!res.ok) throw new Error(`/api/presentation ${res.status}`);
  return res.json();
}

// --- 参加者の写真投稿（/view → Drive フォルダ） -----------------------------
export async function uploadPhoto(input: {
  name: string;
  mimeType: string;
  data: string; // base64（dataURL のヘッダを除いた本体）
}): Promise<{ id?: string; name?: string }> {
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) throw new Error(data.error || `/api/upload ${res.status}`);
  return data;
}
