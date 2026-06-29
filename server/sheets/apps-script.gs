/**
 * スキャン結果保存用 Apps Script Web App（課金・サービスアカウント不要）。
 *
 * 列: A=画像id  B=合計スコア  C=スキャン済みフラグ  D=user名  E=画像名
 * 画像idをキーに upsert（あれば A:C と E を更新、無ければ1行追記）。D=user名 は温存。
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
 *
 * ▼ 写真投稿機能（/view からの action:"upload"）について
 *   この版は参加者がスマホから選んだ写真を DRIVE_FOLDER_ID のフォルダへ保存する。
 *   Drive への書き込み権限が要るので、貼り替え後の初回保存/再デプロイ時に表示される
 *   「Drive へのアクセスを許可」を承認すること（承認しないと upload は失敗する）。
 */

// 任意の共有シークレット。空文字なら認証チェックなし。
const SHEET_TOKEN = "";

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    if (SHEET_TOKEN && body.token !== SHEET_TOKEN) {
      return json_({ ok: false, error: "unauthorized" });
    }

    // 写真投稿: 参加者(/view)がスマホから選んだ画像を Drive フォルダへ保存する。
    // base64 を Blob 化して folderId のフォルダに作成し、誰でも閲覧可（=google-public
    // が拾える）に共有設定する。※この機能を使うには Apps Script に Drive 権限が必要なので、
    // 貼り替え後の初回実行/再デプロイ時に表示される認可を許可すること。
    if (body.action === "upload") {
      // 変数名は doPost 内の他の宣言(name 等)と衝突しないよう up* で揃える。
      var upFolderId = String(body.folderId || "");
      if (!upFolderId) return json_({ ok: false, error: "missing folderId" });
      var upData = String(body.data || "");
      if (!upData) return json_({ ok: false, error: "missing data" });
      var upMime = String(body.mimeType || "image/jpeg");
      var upName = String(body.name || "upload_" + new Date().getTime() + ".jpg");
      var upBlob = Utilities.newBlob(Utilities.base64Decode(upData), upMime, upName);
      var upFile = DriveApp.getFolderById(upFolderId).createFile(upBlob);
      try {
        upFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (shErr) {
        // 共有設定に失敗しても作成自体は成功扱い（フォルダ側の公開設定で見える場合あり）。
      }
      return json_({ ok: true, action: "upload", id: upFile.getId(), name: upFile.getName() });
    }

    // リセット: ヘッダ(1行目)以外のデータ行をすべて消去して元の状態に戻す。
    if (body.action === "reset") {
      var sheet0 = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
      var last = sheet0.getLastRow();
      var lastCol = sheet0.getLastColumn();
      if (last > 1 && lastCol > 0) {
        sheet0.getRange(2, 1, last - 1, lastCol).clearContent();
      }
      return json_({ ok: true, action: "reset", cleared: Math.max(0, last - 1) });
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
      // 新規: A〜E を1行追記（D=user名は空, E=画像名）
      sheet.appendRow([id, score, scanned, "", name]);
      return json_({ ok: true, action: "appended" });
    }

    // 既存: A:C と E(画像名) のみ更新（D=user名 は触らない）
    sheet.getRange(row, 1, 1, 3).setValues([[id, score, scanned]]); // A:C
    sheet.getRange(row, 5).setValue(name); // E=画像名
    sheet.getRange(row, 6).setValue(""); // F: 以前の誤書き込みを掃除
    return json_({ ok: true, action: "updated", row: row });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// GET:
//  ?action=top&limit=3 … スキャン済み(C=true)の中から 合計スコア(B) 上位を返す（結果発表用）。
//  それ以外           … 動作確認用のメッセージ。
function doGet(e) {
  var action = e && e.parameter ? e.parameter.action : "";
  if (action === "top") {
    var limit = Math.max(1, Math.min(50, Number(e.parameter.limit) || 3));
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    var values = sheet.getDataRange().getValues();
    var rows = [];
    for (var i = 0; i < values.length; i++) {
      var r = values[i];
      var id = String(r[0] || "");
      if (!id) continue;
      var scanned = r[2];
      var isScanned = scanned === true || String(scanned).toLowerCase() === "true";
      if (!isScanned) continue;
      var score = Number(r[1]);
      if (isNaN(score)) continue;
      rows.push({ id: id, score: score, user: r[3] || "", name: r[4] || "" });
    }
    rows.sort(function (a, b) {
      return b.score - a.score;
    });
    return json_({ ok: true, results: rows.slice(0, limit) });
  }
  return json_({ ok: true, hint: "POST scan results here" });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
