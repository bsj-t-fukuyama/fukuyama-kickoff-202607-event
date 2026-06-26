// Google Sheet "DB" for scan results.
//
// After a photo is scored we upsert one row keyed by the Drive image id:
//   A=画像id  B=合計スコア  C=スキャン済みフラグ(true)  D=user名  E=画像名
// Existing rows are updated in place (A:C と E のみ。D=user名 は触らない)。新規idは追記。
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

// 結果発表用: スキャン済み(C=true)の中から 合計スコア(B) 上位 `limit` 件を返す。
// 返り値: [{ id, score, user, name }]（スコア降順）。
//
// 主経路は「公開シートのCSVエクスポート」（認証不要・即時。アプリは元々
// 公開Driveに依存しているので同じ前提）。失敗時のみ GAS の ?action=top を試す。
export async function fetchTopResults(limit = 3) {
  const { spreadsheetId } = config.sheets;

  // 1) 公開シートCSV（gviz）から読む。
  if (spreadsheetId) {
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv`;
      const res = await fetch(csvUrl, { redirect: "follow", headers: { "User-Agent": "Mozilla/5.0" } });
      if (res.ok) {
        return rankRows(parseCsv(await res.text()), limit);
      }
    } catch {
      /* CSV 取得に失敗したら下の webhook フォールバックへ */
    }
  }

  // 2) フォールバック: GAS Web App の ?action=top。
  const url = getSheetWebhookUrl();
  if (url) {
    const u = url + (url.includes("?") ? "&" : "?") + `action=top&limit=${limit}`;
    const res = await fetch(u, { redirect: "follow" });
    if (!res.ok) throw new Error(`results webhook HTTP ${res.status}`);
    const data = await res.json().catch(() => ({}));
    if (data && data.ok === false) throw new Error(`results: ${data.error || "rejected"}`);
    return Array.isArray(data.results) ? data.results.slice(0, limit) : [];
  }

  return [];
}

// シートをリセット: ヘッダ(1行目)以外のデータ行をすべて消去する。
// 主経路は GAS Web App（書き込み権限が要るため CSV では不可）。SAがあればそれで消去。
export async function resetSheet() {
  const url = getSheetWebhookUrl();
  if (url) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      redirect: "follow",
      body: JSON.stringify({ token: config.sheets.webhookToken, action: "reset" }),
    });
    if (!res.ok) throw new Error(`reset webhook HTTP ${res.status}`);
    const data = await res.json().catch(() => ({}));
    if (data && data.ok === false) throw new Error(`reset: ${data.error || "rejected"}`);
    return;
  }

  const { spreadsheetId, credentialsPath } = config.sheets;
  if (credentialsPath && spreadsheetId) {
    const auth = new google.auth.GoogleAuth({ keyFile: credentialsPath, scopes: SCOPES });
    const sheets = google.sheets({ version: "v4", auth });
    await sheets.spreadsheets.values.clear({ spreadsheetId, range: "A2:Z" });
    return;
  }

  throw new Error("リセット先が未設定です（SHEET_WEBHOOK_URL か サービスアカウントが必要）");
}

// スキャン済み(C=true)の画像idを全件返す（Set<string>）。
// サーバー再起動時に seen を復元し、同じ画像の再スキャン（再採点）を防ぐ用途。
// 主経路は公開シートCSV（fetchTopResults と同じ前提）。失敗時のみ GAS ?action=top を試す。
export async function fetchScannedIds() {
  const { spreadsheetId } = config.sheets;

  // 1) 公開シートCSV（gviz）から全行読む。
  if (spreadsheetId) {
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv`;
      const res = await fetch(csvUrl, { redirect: "follow", headers: { "User-Agent": "Mozilla/5.0" } });
      if (res.ok) return scannedIdSet(parseCsv(await res.text()));
    } catch {
      /* CSV 取得に失敗したら下の webhook フォールバックへ */
    }
  }

  // 2) フォールバック: GAS Web App の ?action=top（上位のみだが保険）。
  const url = getSheetWebhookUrl();
  if (url) {
    try {
      const u = url + (url.includes("?") ? "&" : "?") + `action=top&limit=50`;
      const res = await fetch(u, { redirect: "follow" });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const set = new Set();
        if (Array.isArray(data.results)) {
          for (const r of data.results) if (r?.id) set.add(String(r.id).trim());
        }
        return set;
      }
    } catch {
      /* 取得失敗時は空集合（全件スキャンにフォールバック） */
    }
  }

  return new Set();
}

// 行配列 → スキャン済み(C=true)の画像id Set。列: A=id C=flag。
function scannedIdSet(rows) {
  const set = new Set();
  for (const r of rows) {
    const id = String(r?.[0] ?? "").trim();
    if (!id) continue;
    const scanned = String(r?.[2] ?? "").trim().toLowerCase();
    if (scanned === "true") set.add(id);
  }
  return set;
}

// 行配列 → スキャン済みのみ・スコア降順・上位limit。列: A=id B=score C=flag D=user E=画像名。
// 画像名は E 優先、無ければ F（旧フォーマットの保険）。
function rankRows(rows, limit) {
  const out = [];
  for (const r of rows) {
    const id = String(r?.[0] ?? "").trim();
    if (!id) continue;
    const scanned = String(r?.[2] ?? "").trim().toLowerCase();
    if (scanned !== "true") continue;
    const score = Number(r?.[1]);
    if (Number.isNaN(score)) continue;
    // 画像名は E 優先、空なら F（旧フォーマットの保険）。
    const name = String(r?.[4] ?? "").trim() || String(r?.[5] ?? "").trim();
    out.push({ id, score, user: String(r?.[3] ?? "").trim(), name });
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, limit);
}

// 最小CSVパーサ（"..." クオート・""エスケープ・カンマ・改行に対応）。
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
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
      // 新規: A〜E（D=user名は空, E=画像名）
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "A:E",
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: [[id, score, true, "", name]] },
      });
    } else {
      // 既存: A:C と E(画像名) のみ（D=user名 は温存）
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: "USER_ENTERED",
          data: [
            { range: `A${row}:C${row}`, values: [[id, score, true]] },
            { range: `E${row}`, values: [[name]] },
          ],
        },
      });
    }
  }

  return { enabled: true, mode: "service-account", save };
}
