// Real pixel-judging scorer — Claude vision.
//
// Reads the actual photo and scores the four README-SCORING.md axes
// (笑顔・人数・構図/遠近・写りの良さ) on 0..100, plus a few concrete signals
// (人が判定できるか / 複数人か / 笑顔か / ポーズしているか / インスタ映えか …)
// that make the judgement explainable and let us bias the axes toward what the
// party actually cares about. It returns the SAME shape as the dummy scorer and
// runs every value through composeResult(), so the README weighting + FLOOR
// (傷つかない採点) apply identically.
//
//   scoreImageWithAI(item, { theme, weights, floor, image, model, client })
//     -> { score, grade, breakdown, signals }
//
// `image` is { mediaType, base64 } loaded by the queue (works for every drive
// provider). On any failure the caller falls back to the dummy scorer.

import Anthropic from "@anthropic-ai/sdk";
import { AXES, composeResult, DEFAULT_FLOOR, maybeBraveThroughBonus, peopleAxisValue } from "./index.js";

export const DEFAULT_JUDGE_MODEL = "claude-opus-4-8";

// Structured-output schema. Note: JSON-schema numeric bounds (minimum/maximum)
// aren't enforced by structured outputs, so we clamp in composeResult().
const JUDGEMENT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    // 先に“数え上げ”を書かせてから人数を確定させると精度が上がる（数える前に答えさせない）。
    countingNotes: {
      type: "string",
      description:
        "人数を数えた根拠を先に書く。画面を左→右/手前→奥に走査し、見つけた人を『手前左に1人(顔はっきり)、奥に2人…』のように列挙して合計する。30字程度。",
    },
    mood: { type: "integer", description: "笑顔・表情の良さ 0-100。笑顔が多い/はじけるほど高い" },
    people: { type: "integer", description: "にぎやかさ 0-100。人数が多く・大きく(顔の占有率が高く)写るほど高い" },
    composition: { type: "integer", description: "構図・遠近感 0-100。奥行き・バランス・水平が良いほど高い" },
    clarity: { type: "integer", description: "写りの良さ 0-100。ピント・明るさ・ブレのなさ・顔のわかりやすさ" },
    peopleCount: {
      type: "integer",
      description:
        "写っている人数の正確な実数。これが にぎやかさ 採点の唯一の根拠なので最優先で正確に数える。" +
        "顔がはっきり写っている人は一人ずつ確実に数え上げる。手前も奥(背景)も、横顔・後ろ姿・見切れ(体の一部だけ)も1人として数える。" +
        "ポスターや画面・鏡像の中の人物は数えない。0=人なし。自信が持てない時は控えめではなく最も近い実数を答える。" +
        "顔が大きく写っている等の“写り方”では増減させず、あくまで実際の頭数を返す。",
    },
    personDetected: { type: "boolean", description: "人が一人でも判定できるか" },
    multiplePeople: { type: "boolean", description: "複数人写っているか" },
    smiling: { type: "boolean", description: "笑顔の人がいるか" },
    posing: { type: "boolean", description: "ポーズしているか（特に右手でグッド/サムズアップ）" },
    instagramWorthy: { type: "boolean", description: "画角が良くインスタ映えするか" },
    faceClarity: { type: "boolean", description: "顔がはっきり写っていて誰か分かるか" },
    note: { type: "string", description: "20字以内の短い日本語コメント。前向きに。容姿はけなさない" },
  },
  required: [
    "countingNotes", "mood", "people", "composition", "clarity", "peopleCount", "personDetected",
    "multiplePeople", "smiling", "posing", "instagramWorthy", "faceClarity", "note",
  ],
};

function buildPrompt(theme) {
  return [
    `これは懇親会の写真です。お題は「${theme}」。`,
    "カラオケの採点のように、写真の“撮り方と場の楽しさ”を採点してください。",
    "",
    "採点する4軸（いずれも 0〜100）:",
    "- mood 笑顔・表情: 笑顔の人数と強さ。多いほど高い。",
    "- people にぎやかさ: 人数が多く、かつ大きく（顔の画面占有率が高く）写るほど高い。",
    "- composition 構図・遠近感: 奥行き・バランス・水平。遠近法がきいているほど高い。",
    "- clarity 写りの良さ: ピント・明るさ・ブレのなさ・顔のわかりやすさ。",
    "",
    "【人数の数え方（最重要・丁寧に）】",
    "まず countingNotes に“数え上げの根拠”を書き、その合計を peopleCount に入れてください（数える前に答えない）。",
    "peopleCount は写っている人数の“正確な実数”。にぎやかさ点はこの実数だけで決まります。",
    "- 画面を 左→右、手前→奥 と走査し、人を一人ずつ拾って列挙してから合計する。",
    "- はっきり顔が写っている人は確実に数える。二人写っていれば必ず2人と数える（取りこぼし厳禁）。",
    "- 奥・背景・端で見切れている人、横顔・後ろ姿・体の一部だけ（手や肩だけ）の人も別人なら数える。",
    "- 顔が隠れていても人と判断できれば数える。",
    "- ポスター/看板/スマホ・テレビ画面の中の人物、鏡・ガラスの映り込みは数えない。",
    "- 群衆など多い場合も、ざっくりではなく最も近い実数を見積もる。0人なら0。",
    "- 顔が大きくアップで写っていても“写り方”では水増ししない。1人なら1。あくまで実際の頭数を返す。",
    "",
    "あわせて具体的な観点も判定してください: 人が判定できるか / 複数人か /",
    "笑顔か / ポーズ（特に右手のグッド・サムズアップ）をしているか /",
    "画角が良くインスタ映えするか / 顔がはっきり写って誰か分かるか。",
    "",
    "重要なルール（投稿者が傷つかないように）:",
    "- 被写体の容姿・美醜・年齢・性別は評価に一切使わない。",
    "- 評価するのは“写真の撮り方と場の雰囲気”であって、写っている人の見た目ではない。",
    "- note は前向きな短い一言にする。けなさない。",
  ].join("\n");
}

// Map the model's raw 0..100 axis values, nudged by the concrete signals so the
// score reflects what the party cares about, without ever penalising appearance.
// `seed` makes the にぎやかさ fun-jitter stable per image. 人数軸ロジックは
// ./index.js の peopleAxisValue に集約（ダミー採点と共有）。
function biasFromSignals(values, s, seed) {
  const v = { ...values };

  // にぎやかさ軸は“実際の人数”だけで決める（占有率や写り方は無視）。
  // 人数の細かいレンジ + 画像ごとに安定した ±3点 の面白さブレを乗せる。
  if (Number.isFinite(s.peopleCount)) {
    v.people = peopleAxisValue(s.peopleCount, seed);
  } else if (s.multiplePeople) {
    v.people = Math.max(v.people, 56);
  } else if (!s.personDetected) {
    v.people = Math.min(v.people, 30); // no one to celebrate
  }

  if (s.smiling) v.mood = Math.max(v.mood, 60);
  if (s.instagramWorthy) v.composition = Math.max(v.composition, 65);
  if (s.faceClarity) v.clarity = Math.max(v.clarity, 60);
  // ポーズ（右手グッド等）は表情の小ボーナス（人数は実数のままにする）。
  if (s.posing) v.mood = Math.min(100, v.mood + 5);

  return v;
}

export function createJudgeClient(apiKey) {
  // The SDK also reads ANTHROPIC_API_KEY from the env on its own.
  return new Anthropic(apiKey ? { apiKey } : {});
}

export async function scoreImageWithAI(
  item,
  { theme, weights, floor = DEFAULT_FLOOR, bonusChance, image, model = DEFAULT_JUDGE_MODEL, client },
) {
  if (!image?.base64) throw new Error("no image bytes to judge");
  const anthropic = client ?? createJudgeClient();

  const response = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    output_config: {
      format: { type: "json_schema", schema: JUDGEMENT_SCHEMA },
    },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: image.mediaType || "image/jpeg", data: image.base64 },
          },
          { type: "text", text: buildPrompt(theme) },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("judge refused this image");
  }

  const text = response.content.find((b) => b.type === "text")?.text ?? "";
  const parsed = JSON.parse(text);

  const signals = {
    peopleCount: parsed.peopleCount,
    personDetected: parsed.personDetected,
    multiplePeople: parsed.multiplePeople,
    smiling: parsed.smiling,
    posing: parsed.posing,
    instagramWorthy: parsed.instagramWorthy,
    faceClarity: parsed.faceClarity,
    note: parsed.note,
  };

  const axisValues = {};
  for (const axis of AXES) axisValues[axis.key] = parsed[axis.key];

  // 比重は config.weights（mood/composition/clarity 各0.20、people 0.40）をそのまま使う。
  const base = composeResult(biasFromSignals(axisValues, signals, item.id), { weights, floor });
  const result = maybeBraveThroughBonus(base, { weights, floor, seed: item.id, chance: bonusChance });
  return { ...result, signals };
}
