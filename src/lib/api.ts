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
