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
//
// 各コメントには文節の“中央寄り”の区切りに手で改行(\n)を入れてある。横長PCの
// 画面で中途半端な位置に自動折り返しされるのを避け、いい感じの2行に収めるため。
// RevealOverlay 側は white-space: pre-line で \n を尊重して表示する。

export type CommentTier = {
  // Short eyebrow word shown above the big line.
  badge: string;
  // The big gradient 3D headline.
  lines: string[];
};

const UNDER_50: CommentTier = {
  badge: "NICE TRY",
  lines: [
    "そこそこいいですね！\n伸び代ですねえ！",
    "挑戦的な\n画像ですねえ…",
    "これはこれで、\n味がある。",
    "勇気だけは\n満点！",
    "ある意味、記憶に\n残る一枚。",
    "伸びしろ\nしかない！",
    "個性で殴っていく\nスタイル。",
    "粗削りな\nダイヤの原石。",
    "もう一杯飲んでから\nもう一度！",
    "次回作に\nご期待ください！",
    "光るものは、\nある。",
    "これは“あえて”\nですね？",
    "ピカソも最初は\nこうだった。",
    "むしろ攻めてて\n好感度高い。",
    "誰にも撮れない一枚\nなのは確か。",
    "発想が自由で\n素晴らしい。",
    "アートに点数は\nつけられない…",
    "伸びしろ\n青天井です！",
    "次はきっと\nバズる、たぶん。",
    "君だけの\nオンリーワン。",
    "粗さも\n才能のうち！",
    "ここから伝説が\n始まる予感。",
  ],
};

const FROM_51_TO_70: CommentTier = {
  badge: "GOOD!",
  lines: [
    "やるやん！",
    "カラオケでいうと\n85点！",
    "なかなかの\n一枚！",
    "いい感じに\n仕上がってる！",
    "中堅プレイヤーの\n風格。",
    "あと一歩で\nバズる。",
    "安定感、\nあるわ〜。",
    "悪くない、\nむしろ良い。",
    "宴会部長クラスの\n実力。",
    "平均をしっかり\n超えてきた！",
    "おっ、\nわかってるねえ！",
    "じわじわ来る\n良さがある。",
    "そのセンス、\n嫌いじゃない。",
    "及第点どころか\n好印象！",
    "もう一歩で\n殿堂入り。",
    "堂々の中堅\nランクイン！",
    "いい仕事\nしてます。",
    "光のとらえ方が\nうまい。",
    "アルバム採用、\n確定です。",
    "幹事も満足げに\nうなずく。",
    "あと少しで\n“神”が見える。",
    "実力派、\nここにあり。",
  ],
};

const FROM_71_TO_99: CommentTier = {
  badge: "EXCELLENT!!",
  lines: [
    "これはCEO\nクラス…",
    "流石！",
    "これはbrave\nすぎて滅！",
    "天才の所業。",
    "プロのカメラマン\nかと思った。",
    "これは\n表彰モノ。",
    "会場が\nどよめいた。",
    "もはや芸術。",
    "額縁に入れて\n飾りたい。",
    "幹事が泣いて\n喜ぶ一枚。",
    "殿堂入り、\nいただきました。",
    "シャッターチャンスの\n神が降臨。",
    "もう写真集を\n出していい。",
    "画角の暴力、\n最高です。",
    "額装してロビーに\n飾ろう。",
    "プロ顔負けの\n構図力。",
    "この一枚で\n表紙が決まる。",
    "ノーベル乾杯賞、\n受賞。",
    "鳥肌が立つ\nレベル。",
    "今日のMVP\n候補、筆頭。",
    "光と影を\n制した者。",
    "拍手が\n鳴り止まない。",
    "伝説の入口に\n立っています。",
    "もう何も\n言うことはない。",
  ],
};

const PERFECT: CommentTier = {
  badge: "PERFECT!!!",
  lines: [
    "出ました！！！\nMVP間違いなし！！",
    "100点満点！\n伝説爆誕！！",
    "歴史が\n動いた瞬間。",
    "全人類が\n拍手喝采！！",
    "優勝。以上、\n閉会します。",
    "100点！\n額に入れて殿堂へ！",
    "完璧。ぐうの音も\n出ない。",
    "これぞ奇跡の\n一枚！！",
    "カメラの神に\n愛された男（女）。",
    "もう二度と撮れない\n最高傑作。",
    "満点きました、\n号外です！！",
    "全宇宙が\n祝福しています🌌",
    "今宵の主役、\n確定です！！",
    "語り継がれる\n伝説の誕生。",
    "ブラボー！！！\nスタンディングオベーション！",
    "歴史の教科書に\n載るレベル。",
    "優勝旗、こちらへ\nどうぞ🏆",
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
