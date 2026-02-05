/**
 * メンバーデータアクセス層
 */

var MEMBER_CACHE_KEY_ = 'members_cache';
var MEMBER_CACHE_TTL_ = 300; // 5分

/**
 * メンバー一覧を取得する（フロントエンドから呼び出し）
 * @return {Array<Object>} メンバー一覧
 */
function getMembers() {
  var cache = CacheService.getUserCache();
  var cached = cache.get(MEMBER_CACHE_KEY_);
  if (cached) {
    return JSON.parse(cached);
  }

  var sheet = getSpreadsheet_().getSheetByName(SHEET_MEMBERS_);
  var members = getSheetData_(sheet);

  try {
    cache.put(MEMBER_CACHE_KEY_, JSON.stringify(members), MEMBER_CACHE_TTL_);
  } catch (e) {
    // キャッシュサイズ超過時は無視
  }

  return members;
}

/**
 * メンバーを1件取得する
 * @param {string} id - メンバーID
 * @return {Object|null} メンバー
 */
function getMemberById(id) {
  var members = getMembers();
  for (var i = 0; i < members.length; i++) {
    if (members[i].id === id) return members[i];
  }
  return null;
}

/**
 * 複数メンバーをIDリストで取得する
 * @param {Array<string>} ids - メンバーIDリスト
 * @return {Array<Object>} メンバー一覧
 */
function getMembersByIds(ids) {
  if (!ids || ids.length === 0) return [];
  var members = getMembers();
  return members.filter(function(m) {
    return ids.indexOf(m.id) !== -1;
  });
}

/**
 * メンバーを作成する（フロントエンドから呼び出し）
 * @param {Object} data - メンバーデータ
 * @return {Object} 作成結果
 */
function createMember(data) {
  try {
    var sheet = getSpreadsheet_().getSheetByName(SHEET_MEMBERS_);
    var now = nowISO_();
    // headers: id, name, email, chatWebhookUrl, createdAt, updatedAt
    var row = [
      generateUUID_(),
      data.name || '',
      data.email || '',
      data.chatWebhookUrl || '',
      now,
      now
    ];
    sheet.appendRow(row);
    clearMemberCache_();
    return { success: true, id: row[0] };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * メンバーを更新する（フロントエンドから呼び出し）
 * @param {string} id - メンバーID
 * @param {Object} data - 更新データ
 * @return {Object} 更新結果
 */
function updateMember(id, data) {
  try {
    var sheet = getSpreadsheet_().getSheetByName(SHEET_MEMBERS_);
    var rowIndex = findRowIndexById_(sheet, id);
    if (rowIndex === -1) {
      return { success: false, message: 'メンバーが見つかりません' };
    }

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var row = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];

    ['name', 'email', 'chatWebhookUrl'].forEach(function(field) {
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
    clearMemberCache_();
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * メンバーを削除する（フロントエンドから呼び出し）
 * @param {string} id - メンバーID
 * @return {Object} 削除結果
 */
function deleteMember(id) {
  try {
    var sheet = getSpreadsheet_().getSheetByName(SHEET_MEMBERS_);
    var rowIndex = findRowIndexById_(sheet, id);
    if (rowIndex === -1) {
      return { success: false, message: 'メンバーが見つかりません' };
    }
    sheet.deleteRow(rowIndex);
    clearMemberCache_();
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * メンバーキャッシュをクリアする
 */
function clearMemberCache_() {
  CacheService.getUserCache().remove(MEMBER_CACHE_KEY_);
}
