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

// /view がポーリングして現在の上演状態を取得する。
export async function fetchPresentation(): Promise<Presentation> {
  const res = await fetch("/api/presentation");
  if (!res.ok) throw new Error(`/api/presentation ${res.status}`);
  return res.json();
}
