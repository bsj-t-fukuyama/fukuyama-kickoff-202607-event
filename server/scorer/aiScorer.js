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
import { AXES, composeResult, DEFAULT_FLOOR } from "./index.js";

export const DEFAULT_JUDGE_MODEL = "claude-opus-4-8";

// Structured-output schema. Note: JSON-schema numeric bounds (minimum/maximum)
// aren't enforced by structured outputs, so we clamp in composeResult().
const JUDGEMENT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    mood: { type: "integer", description: "笑顔・表情の良さ 0-100。笑顔が多い/はじけるほど高い" },
    people: { type: "integer", description: "にぎやかさ 0-100。人数が多く・大きく(顔の占有率が高く)写るほど高い" },
    composition: { type: "integer", description: "構図・遠近感 0-100。奥行き・バランス・水平が良いほど高い" },
    clarity: { type: "integer", description: "写りの良さ 0-100。ピント・明るさ・ブレのなさ・顔のわかりやすさ" },
    peopleCount: { type: "integer", description: "写っている人数の推定" },
    personDetected: { type: "boolean", description: "人が一人でも判定できるか" },
    multiplePeople: { type: "boolean", description: "複数人写っているか" },
    smiling: { type: "boolean", description: "笑顔の人がいるか" },
    posing: { type: "boolean", description: "ポーズしているか（特に右手でグッド/サムズアップ）" },
    instagramWorthy: { type: "boolean", description: "画角が良くインスタ映えするか" },
    faceClarity: { type: "boolean", description: "顔がはっきり写っていて誰か分かるか" },
    note: { type: "string", description: "20字以内の短い日本語コメント。前向きに。容姿はけなさない" },
  },
  required: [
    "mood", "people", "composition", "clarity", "peopleCount", "personDetected",
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

// Map the model's raw 0..100 axis values, lightly nudged by the concrete
// signals so the score reflects what the party cares about (people detectable,
// multiple people, smiles, good framing) without ever penalising appearance.
function biasFromSignals(values, s) {
  const v = { ...values };
  if (s.multiplePeople) v.people = Math.max(v.people, 60);
  if (!s.personDetected) v.people = Math.min(v.people, 55); // no one to celebrate
  if (s.smiling) v.mood = Math.max(v.mood, 60);
  if (s.instagramWorthy) v.composition = Math.max(v.composition, 65);
  if (s.faceClarity) v.clarity = Math.max(v.clarity, 60);
  // ポーズ（右手グッド等）はにぎやかさ・表情の小ボーナス。
  if (s.posing) {
    v.mood = Math.min(100, v.mood + 5);
    v.people = Math.min(100, v.people + 5);
  }
  return v;
}

export function createJudgeClient(apiKey) {
  // The SDK also reads ANTHROPIC_API_KEY from the env on its own.
  return new Anthropic(apiKey ? { apiKey } : {});
}

export async function scoreImageWithAI(
  item,
  { theme, weights, floor = DEFAULT_FLOOR, image, model = DEFAULT_JUDGE_MODEL, client },
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

  const result = composeResult(biasFromSignals(axisValues, signals), { weights, floor });
  return { ...result, signals };
}
