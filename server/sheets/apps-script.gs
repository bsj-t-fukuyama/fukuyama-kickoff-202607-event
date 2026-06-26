/**
 * スキャン結果保存用 Apps Script Web App（課金・サービスアカウント不要）。
 *
 * 列: A=画像id  B=合計スコア  C=スキャン済みフラグ  D=(空)  E=user名  F=画像名
 * 画像idをキーに upsert（あれば A:C と F を更新、無ければ1行追記）。E=user名 は温存。
 *
 * ▼ セットアップ手順
 *  1. 対象スプレッドシートを開く → 上部メニュー「拡張機能」→「Apps Script」。
 *  2. 既存コードを消して、このファイルの内容を丸ごと貼り付けて保存。
 *  3. （任意）下の SHEET_TOKEN に好きな文字列を設定し、.env の SHEET_WEBHOOK_TOKEN と一致させる。
 *  4. 右上「デプロイ」→「新しいデプロイ」→ 種類「ウェブアプリ」。
 *       - 次のユーザーとして実行: 自分
 *       - アクセスできるユーザー: 全員（Anyone）
 *     → デプロイし、表示される「ウェブアプリのURL」をコピー。
 *  5. プロジェクト直下の .env に次を設定して `npm run dev` を再起動:
 *       SHEET_WEBHOOK_URL=コピーしたURL
 *       SHEET_WEBHOOK_TOKEN=（3で設定したなら同じ値。未設定なら空のままでOK）
 *
 *  ※ コードを修正したら「デプロイを管理」→ 鉛筆 → バージョン「新規」で再デプロイ（URLは不変）。
 */

// 任意の共有シークレット。空文字なら認証チェックなし。
const SHEET_TOKEN = "";

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    if (SHEET_TOKEN && body.token !== SHEET_TOKEN) {
      return json_({ ok: false, error: "unauthorized" });
    }

    const id = String(body.id || "");
    if (!id) return json_({ ok: false, error: "missing id" });

    const score = body.score;
    const name = body.name || "";
    const scanned = body.scanned === undefined ? true : body.scanned;

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

    // A列から画像idを検索
    const colA = sheet.getRange("A:A").getValues();
    let row = -1;
    for (let i = 0; i < colA.length; i++) {
      if (String(colA[i][0]) === id) {
        row = i + 1;
        break;
      }
    }

    if (row === -1) {
      // 新規: A〜F を1行追記（D=空, E=user名 は空）
      sheet.appendRow([id, score, scanned, "", "", name]);
      return json_({ ok: true, action: "appended" });
    }

    // 既存: A:C と F のみ更新（E=user名 は触らない）
    sheet.getRange(row, 1, 1, 3).setValues([[id, score, scanned]]); // A:C
    sheet.getRange(row, 6).setValue(name); // F
    return json_({ ok: true, action: "updated", row: row });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// 動作確認用（ブラウザでURLを開くと表示される）
function doGet() {
  return json_({ ok: true, hint: "POST scan results here" });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
