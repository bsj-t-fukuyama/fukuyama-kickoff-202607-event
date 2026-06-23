// Score-reaction comments shown big across the screen at reveal time.
//
// Buckets by final score:
//   0..50   伸び代ゾーン（やさしく前向きに。投稿者が傷つかないよう “惜しい” で止める）
//   51..70  やるやんゾーン
//   71..99  上位ゾーン
//   100     満点・伝説ゾーン
//
// Keep the tone playful and celebratory. We deliberately never insult the
// person in the photo — only react to the “shot” with over-the-top hype.

export type CommentTier = {
  // Short eyebrow word shown above the big line.
  badge: string;
  // The big gradient 3D headline.
  lines: string[];
};

const UNDER_50: CommentTier = {
  badge: "NICE TRY",
  lines: [
    "そこそこいいですね！伸び代ですねえ！",
    "挑戦的な画像ですねえ…",
    "これはこれで、味がある。",
    "勇気だけは満点！",
    "ある意味、記憶に残る一枚。",
    "伸びしろしかない！",
    "個性で殴っていくスタイル。",
    "粗削りなダイヤの原石。",
    "もう一杯飲んでからもう一度！",
    "次回作にご期待ください！",
  ],
};

const FROM_51_TO_70: CommentTier = {
  badge: "GOOD!",
  lines: [
    "やるやん！",
    "カラオケでいうと85点！",
    "なかなかの一枚！",
    "いい感じに仕上がってる！",
    "中堅プレイヤーの風格。",
    "あと一歩でバズる。",
    "安定感、あるわ〜。",
    "悪くない、むしろ良い。",
    "宴会部長クラスの実力。",
    "平均をしっかり超えてきた！",
  ],
};

const FROM_71_TO_99: CommentTier = {
  badge: "EXCELLENT!!",
  lines: [
    "これはCEOクラス…",
    "流石！",
    "これはbraveすぎて滅！",
    "天才の所業。",
    "プロのカメラマンかと思った。",
    "これは表彰モノ。",
    "会場がどよめいた。",
    "もはや芸術。",
    "額縁に入れて飾りたい。",
    "幹事が泣いて喜ぶ一枚。",
    "殿堂入り、いただきました。",
    "シャッターチャンスの神が降臨。",
  ],
};

const PERFECT: CommentTier = {
  badge: "PERFECT!!!",
  lines: [
    "出ました！！！MVP間違いなし！！",
    "100点満点！伝説爆誕！！",
    "歴史が動いた瞬間。",
    "全人類が拍手喝采！！",
    "優勝。以上、閉会します。",
  ],
};

function tierFor(score: number): CommentTier {
  if (score >= 100) return PERFECT;
  if (score >= 71) return FROM_71_TO_99;
  if (score >= 51) return FROM_51_TO_70;
  return UNDER_50;
}

// Deterministic index from a seed string so the same photo keeps the same
// comment across re-renders (the scoring animation re-renders ~60fps).
function seededIndex(seed: string, mod: number): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % mod;
}

export function pickComment(score: number, seed: string): { badge: string; line: string } {
  const tier = tierFor(score);
  const line = tier.lines[seededIndex(seed, tier.lines.length)];
  return { badge: tier.badge, line };
}
