/**
 * テンプレートデータアクセス層
 * Googleドキュメントテンプレート対応
 */

var TEMPLATE_CACHE_KEY_ = 'templates_cache';
var TEMPLATE_CACHE_TTL_ = 300; // 5分

/**
 * テンプレート一覧を取得する（フロントエンドから呼び出し）
 * @return {Array<Object>} テンプレート一覧
 */
function getTemplates() {
  var cache = CacheService.getUserCache();
  var cached = cache.get(TEMPLATE_CACHE_KEY_);
  if (cached) {
    return JSON.parse(cached);
  }

  var sheet = getSpreadsheet_().getSheetByName(SHEET_TEMPLATES_);
  var templates = getSheetData_(sheet);

  try {
    cache.put(TEMPLATE_CACHE_KEY_, JSON.stringify(templates), TEMPLATE_CACHE_TTL_);
  } catch (e) {
    // キャッシュサイズ超過時は無視
  }

  return templates;
}

/**
 * テンプレートを1件取得する
 * @param {string} id - テンプレートID
 * @return {Object|null} テンプレート
 */
function getTemplateById(id) {
  var templates = getTemplates();
  for (var i = 0; i < templates.length; i++) {
    if (templates[i].id === id) return templates[i];
  }
  return null;
}

/**
 * デフォルトテンプレートを取得する
 * @return {Object|null} デフォルトテンプレート
 */
function getDefaultTemplate_() {
  var defaultId = getSetting_('defaultTemplateId');
  if (defaultId) {
    var tmpl = getTemplateById(defaultId);
    if (tmpl) return tmpl;
  }

  var templates = getTemplates();
  for (var i = 0; i < templates.length; i++) {
    if (templates[i].isDefault === true || templates[i].isDefault === 'TRUE') {
      return templates[i];
    }
  }

  return templates.length > 0 ? templates[0] : null;
}

/**
 * テンプレートの本文を取得する（Googleドキュメント対応）
 * docIdが設定されている場合はドキュメントから取得、なければbodyフィールドを使用
 * @param {Object} template - テンプレートオブジェクト
 * @return {string} テンプレート本文
 */
function getTemplateBody_(template) {
  if (!template) return '';

  // Googleドキュメントが登録されている場合はドキュメントから本文を取得
  if (template.docId) {
    try {
      var doc = DocumentApp.openById(template.docId);
      return doc.getBody().getText();
    } catch (e) {
      // ドキュメント取得失敗時はフォールバック
      Logger.log('Googleドキュメント取得失敗: ' + e.message);
    }
  }

  // フォールバック: スプレッドシートのbodyフィールドを使用
  return template.body || '';
}

/**
 * テンプレートを作成する（フロントエンドから呼び出し）
 * @param {Object} data - テンプレートデータ
 * @return {Object} 作成結果
 */
function createTemplate(data) {
  try {
    var sheet = getSpreadsheet_().getSheetByName(SHEET_TEMPLATES_);
    var now = nowISO_();

    var docId = data.docId || '';
    var docUrl = data.docUrl || '';

    // GoogleドキュメントURLからIDを抽出
    if (docUrl && !docId) {
      docId = extractDocIdFromUrl_(docUrl);
    }
    // docIdからURLを生成
    if (docId && !docUrl) {
      docUrl = 'https://docs.google.com/document/d/' + docId + '/edit';
    }

    // headers: id, name, body, docId, docUrl, isDefault, createdAt, updatedAt
    var row = [
      generateUUID_(),
      data.name || '無題のテンプレート',
      data.body || '',
      docId,
      docUrl,
      data.isDefault || false,
      now,
      now
    ];
    sheet.appendRow(row);
    clearTemplateCache_();
    return { success: true, id: row[0] };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * テンプレートを更新する（フロントエンドから呼び出し）
 * @param {string} id - テンプレートID
 * @param {Object} data - 更新データ
 * @return {Object} 更新結果
 */
function updateTemplate(id, data) {
  try {
    var sheet = getSpreadsheet_().getSheetByName(SHEET_TEMPLATES_);
    var rowIndex = findRowIndexById_(sheet, id);
    if (rowIndex === -1) {
      return { success: false, message: 'テンプレートが見つかりません' };
    }

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var row = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];

    // docUrlからdocIdを抽出
    if (data.docUrl && !data.docId) {
      data.docId = extractDocIdFromUrl_(data.docUrl);
    }
    if (data.docId && !data.docUrl) {
      data.docUrl = 'https://docs.google.com/document/d/' + data.docId + '/edit';
    }

    ['name', 'body', 'docId', 'docUrl', 'isDefault'].forEach(function(field) {
      if (data.hasOwnProperty(field)) {
        var colIndex = headers.indexOf(field);
        if (colIndex !== -1) {
          row[colIndex] = data[field];
        }
      }
    });

    var updatedAtIndex = headers.indexOf('updatedAt');
    if (updatedAtIndex !== -1) {
      row[updatedAtIndex] = nowISO_();
    }

    sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
    clearTemplateCache_();
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * テンプレートを削除する（フロントエンドから呼び出し）
 * @param {string} id - テンプレートID
 * @return {Object} 削除結果
 */
function deleteTemplate(id) {
  try {
    var sheet = getSpreadsheet_().getSheetByName(SHEET_TEMPLATES_);
    var rowIndex = findRowIndexById_(sheet, id);
    if (rowIndex === -1) {
      return { success: false, message: 'テンプレートが見つかりません' };
    }
    sheet.deleteRow(rowIndex);
    clearTemplateCache_();
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * GoogleドキュメントURLからドキュメントIDを抽出する
 * @param {string} url - GoogleドキュメントURL
 * @return {string} ドキュメントID
 */
function extractDocIdFromUrl_(url) {
  if (!url) return '';
  var match = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : '';
}

/**
 * テンプレートキャッシュをクリアする
 */
function clearTemplateCache_() {
  CacheService.getUserCache().remove(TEMPLATE_CACHE_KEY_);
}
