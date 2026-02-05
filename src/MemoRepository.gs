/**
 * 議事録データアクセス層
 * CacheServiceによるキャッシュ対応
 */

var MEMO_CACHE_KEY_ = 'memos_cache';
var MEMO_CACHE_TTL_ = 300; // 5分

/**
 * 議事録一覧を取得する（フロントエンドから呼び出し）
 * @return {Array<Object>} 議事録一覧（論理削除を除く）
 */
function getMemos() {
  var cache = CacheService.getUserCache();
  var cached = cache.get(MEMO_CACHE_KEY_);
  if (cached) {
    return JSON.parse(cached);
  }

  var sheet = getSpreadsheet_().getSheetByName(SHEET_MEMOS_);
  var data = getSheetData_(sheet);

  // 論理削除を除外
  var memos = data.filter(function(row) {
    return row.deleted !== true && row.deleted !== 'TRUE';
  });

  try {
    cache.put(MEMO_CACHE_KEY_, JSON.stringify(memos), MEMO_CACHE_TTL_);
  } catch (e) {
    // キャッシュサイズ超過時は無視
  }

  return memos;
}

/**
 * 議事録を1件取得する（フロントエンドから呼び出し）
 * @param {string} id - 議事録ID
 * @return {Object|null} 議事録オブジェクト
 */
function getMemoById(id) {
  var memos = getMemos();
  for (var i = 0; i < memos.length; i++) {
    if (memos[i].id === id) return memos[i];
  }
  return null;
}

/**
 * 議事録を作成する（フロントエンドから呼び出し）
 * @param {Object} memoData - 議事録データ
 * @return {Object} 作成結果
 */
function createMemo(memoData) {
  try {
    var sheet = getSpreadsheet_().getSheetByName(SHEET_MEMOS_);
    var now = nowISO_();
    // headers: id, eventId, projectId, title, date, startTime, endTime,
    //          attendees, meetingLink, templateId, content,
    //          status, docUrl, createdAt, updatedAt, deleted
    var row = [
      generateUUID_(),
      memoData.eventId || '',
      memoData.projectId || '',
      memoData.title || '',
      memoData.date || '',
      memoData.startTime || '',
      memoData.endTime || '',
      memoData.attendees || '',
      memoData.meetingLink || '',
      memoData.templateId || '',
      memoData.content || '',
      memoData.status || 'draft',
      memoData.docUrl || '',
      now,
      now,
      false
    ];
    sheet.appendRow(row);
    clearMemoCache_();
    return { success: true, id: row[0] };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * 議事録を更新する（フロントエンドから呼び出し）
 * @param {string} id - 議事録ID
 * @param {Object} memoData - 更新データ
 * @return {Object} 更新結果
 */
function updateMemo(id, memoData) {
  try {
    var sheet = getSpreadsheet_().getSheetByName(SHEET_MEMOS_);
    var rowIndex = findRowIndexById_(sheet, id);
    if (rowIndex === -1) {
      return { success: false, message: '議事録が見つかりません' };
    }

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var row = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];

    // 更新可能フィールド（projectId, docUrl 追加）
    var updatableFields = ['title', 'date', 'startTime', 'endTime', 'attendees',
                           'meetingLink', 'templateId', 'content', 'status',
                           'projectId', 'docUrl'];
    updatableFields.forEach(function(field) {
      if (memoData.hasOwnProperty(field)) {
        var colIndex = headers.indexOf(field);
        if (colIndex !== -1) {
          row[colIndex] = memoData[field];
        }
      }
    });

    var updatedAtIndex = headers.indexOf('updatedAt');
    if (updatedAtIndex !== -1) {
      row[updatedAtIndex] = nowISO_();
    }

    sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
    clearMemoCache_();
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * 議事録を論理削除する（フロントエンドから呼び出し）
 * @param {string} id - 議事録ID
 * @return {Object} 削除結果
 */
function deleteMemo(id) {
  return updateMemo(id, { status: 'archived' });
}

/**
 * 議事録を一括ステータス変更する（フロントエンドから呼び出し）
 * @param {Array<string>} ids - 議事録IDリスト
 * @param {string} status - 変更先ステータス
 * @return {Object} 更新結果
 */
function bulkUpdateMemoStatus(ids, status) {
  try {
    ids.forEach(function(id) {
      updateMemo(id, { status: status });
    });
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * 議事録を一括論理削除する（フロントエンドから呼び出し）
 * @param {Array<string>} ids - 議事録IDリスト
 * @return {Object} 削除結果
 */
function bulkDeleteMemos(ids) {
  try {
    var sheet = getSpreadsheet_().getSheetByName(SHEET_MEMOS_);
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var deletedIndex = headers.indexOf('deleted');
    var updatedAtIndex = headers.indexOf('updatedAt');

    ids.forEach(function(id) {
      var rowIndex = findRowIndexById_(sheet, id);
      if (rowIndex !== -1) {
        sheet.getRange(rowIndex, deletedIndex + 1).setValue(true);
        sheet.getRange(rowIndex, updatedAtIndex + 1).setValue(nowISO_());
      }
    });
    clearMemoCache_();
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * イベントIDで議事メモが存在するか確認する
 * @param {string} eventId - GoogleカレンダーのイベントID
 * @return {boolean} 存在する場合true
 */
function memoExistsByEventId_(eventId) {
  var memos = getMemos();
  return memos.some(function(memo) {
    return memo.eventId === eventId;
  });
}

/**
 * メモキャッシュをクリアする
 */
function clearMemoCache_() {
  CacheService.getUserCache().remove(MEMO_CACHE_KEY_);
}

/**
 * シートデータをオブジェクト配列として取得する（汎用）
 * @param {Sheet} sheet - シートオブジェクト
 * @return {Array<Object>} データ配列
 */
function getSheetData_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  return data.map(function(row) {
    var obj = {};
    headers.forEach(function(header, i) {
      obj[header] = row[i];
    });
    return obj;
  });
}

/**
 * IDでシートの行番号を検索する（1始まり）
 * @param {Sheet} sheet - シートオブジェクト
 * @param {string} id - 検索するID
 * @return {number} 行番号（見つからない場合-1）
 */
function findRowIndexById_(sheet, id) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;

  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] === id) return i + 2;
  }
  return -1;
}
