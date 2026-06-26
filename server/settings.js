// Runtime settings editable from the /settings screen and persisted to disk so
// they survive restarts. Currently holds the Sheet save destination (Apps Script
// Web App URL). Defaults come from config (env or built-in default URL).
//
// Stored as a plain JSON file (NOT imported as a module, so `node --watch`
// doesn't restart when we write it).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";

const dir = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(dir, "runtime-settings.json");

let state = {};
try {
  state = JSON.parse(fs.readFileSync(FILE, "utf8"));
} catch {
  state = {};
}

function persist() {
  try {
    fs.writeFileSync(FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error("[settings] persist failed:", err.message);
  }
}

// 保存先 Web App URL（未設定・空なら config の既定値にフォールバック）。
export function getSheetWebhookUrl() {
  const saved = typeof state.sheetWebhookUrl === "string" ? state.sheetWebhookUrl.trim() : "";
  if (saved) return saved;
  return (config.sheets.webhookUrl ?? "").trim();
}

export function setSheetWebhookUrl(url) {
  state.sheetWebhookUrl = typeof url === "string" ? url.trim() : "";
  persist();
}

// 設定画面へ返すスナップショット。
export function getSettings() {
  return {
    sheetWebhookUrl: getSheetWebhookUrl(),
    driveUrl: config.google.folderId
      ? `https://drive.google.com/drive/folders/${config.google.folderId}`
      : "",
  };
}
