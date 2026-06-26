// Google Sheet "DB" for scan results.
//
// After a photo is scored we upsert one row keyed by the Drive image id:
//   A=画像id  B=合計スコア  C=スキャン済みフラグ(true)  D=(空)  E=user名  F=画像名
// Existing rows are updated in place (A:C と F のみ。E=user名 は触らない)。新規idは追記。
//
// 2 backends (auto-selected):
//   1) webhook … Apps Script Web App に POST する（課金/サービスアカウント不要・推奨）。
//                セットアップは server/sheets/apps-script.gs を参照。
//   2) service-account … googleapis で直接書き込む（鍵＋シート編集者共有が必要）。
// どちらも未設定なら no-op（ログのみ）で、採点フローは止めない。

import { google } from "googleapis";
import { config } from "../config.js";
import { getSheetWebhookUrl } from "../settings.js";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

export function createSheetsStore() {
  const { spreadsheetId, credentialsPath, webhookToken, enabled } = config.sheets;

  if (!enabled) return { enabled: false, mode: "off", async save() {} };

  // Webhook URL は /settings から実行時に変更できるため毎回読む。
  // サービスアカウントは（使う場合のみ）遅延生成する。
  let saStore = null;
  const getSA = () => {
    if (!saStore && credentialsPath && spreadsheetId) {
      saStore = createServiceAccountStore(spreadsheetId, credentialsPath);
    }
    return saStore;
  };

  if (getSheetWebhookUrl()) console.log("[sheets] enabled via Apps Script webhook");
  else if (credentialsPath && spreadsheetId) console.log("[sheets] enabled via service account");
  else
    console.warn(
      "[sheets] no destination yet: set the Web App URL in /settings (or SHEET_WEBHOOK_URL / " +
        "GOOGLE_APPLICATION_CREDENTIALS). See server/sheets/apps-script.gs.",
    );

  async function save(item) {
    if (!item.id) return;
    const url = getSheetWebhookUrl();
    if (url) return postWebhook(url, webhookToken, item);
    const sa = getSA();
    if (sa) return sa.save(item);
    // 保存先未設定 → no-op（採点は止めない）。
  }

  return { enabled: true, mode: "auto", save };
}

// --- 1) Webhook backend ------------------------------------------------------
// 行の検索・upsert は Apps Script 側で行う。ここは結果を POST するだけ。
async function postWebhook(webhookUrl, webhookToken, item) {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    redirect: "follow",
    body: JSON.stringify({
      token: webhookToken,
      id: item.id,
      score: item.score ?? "",
      scanned: true,
      name: item.name ?? "",
    }),
  });
  if (!res.ok) throw new Error(`webhook HTTP ${res.status}`);
  const data = await res.json().catch(() => ({}));
  if (data && data.ok === false) throw new Error(`webhook: ${data.error || "rejected"}`);
}

// --- 2) Service-account backend ---------------------------------------------
function createServiceAccountStore(spreadsheetId, credentialsPath) {
  const auth = new google.auth.GoogleAuth({ keyFile: credentialsPath, scopes: SCOPES });
  const sheets = google.sheets({ version: "v4", auth });

  // Find the 1-based row whose column A equals `id` (null if not present).
  async function findRow(id) {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: "A:A" });
    const rows = res.data.values ?? [];
    for (let i = 0; i < rows.length; i++) {
      if ((rows[i]?.[0] ?? "") === id) return i + 1;
    }
    return null;
  }

  async function save(item) {
    const id = item.id;
    if (!id) return;
    const score = item.score ?? "";
    const name = item.name ?? "";

    const row = await findRow(id);
    if (row == null) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "A:F",
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: [[id, score, true, "", "", name]] },
      });
    } else {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: "USER_ENTERED",
          data: [
            { range: `A${row}:C${row}`, values: [[id, score, true]] },
            { range: `F${row}`, values: [[name]] },
          ],
        },
      });
    }
  }

  return { enabled: true, mode: "service-account", save };
}
