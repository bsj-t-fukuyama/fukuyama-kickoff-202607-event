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
    "光るものは、ある。",
    "これは“あえて”ですね？",
    "ピカソも最初はこうだった。",
    "むしろ攻めてて好感度高い。",
    "誰にも撮れない一枚なのは確か。",
    "発想が自由で素晴らしい。",
    "アートに点数はつけられない…",
    "伸びしろ青天井です！",
    "次はきっとバズる、たぶん。",
    "君だけのオンリーワン。",
    "粗さも才能のうち！",
    "ここから伝説が始まる予感。",
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
    "おっ、わかってるねえ！",
    "じわじわ来る良さがある。",
    "そのセンス、嫌いじゃない。",
    "及第点どころか好印象！",
    "もう一歩で殿堂入り。",
    "堂々の中堅ランクイン！",
    "いい仕事してます。",
    "光のとらえ方がうまい。",
    "アルバム採用、確定です。",
    "幹事も満足げにうなずく。",
    "あと少しで“神”が見える。",
    "実力派、ここにあり。",
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
    "もう写真集を出していい。",
    "画角の暴力、最高です。",
    "額装してロビーに飾ろう。",
    "プロ顔負けの構図力。",
    "この一枚で表紙が決まる。",
    "ノーベル乾杯賞、受賞。",
    "鳥肌が立つレベル。",
    "今日のMVP候補、筆頭。",
    "光と影を制した者。",
    "拍手が鳴り止まない。",
    "伝説の入口に立っています。",
    "もう何も言うことはない。",
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
    "100点！額に入れて殿堂へ！",
    "完璧。ぐうの音も出ない。",
    "これぞ奇跡の一枚！！",
    "カメラの神に愛された男（女）。",
    "もう二度と撮れない最高傑作。",
    "満点きました、号外です！！",
    "全宇宙が祝福しています🌌",
    "今宵の主役、確定です！！",
    "語り継がれる伝説の誕生。",
    "ブラボー！！！スタンディングオベーション！",
    "歴史の教科書に載るレベル。",
    "優勝旗、こちらへどうぞ🏆",
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
