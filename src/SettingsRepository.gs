/**
 * 設定データアクセス層
 */

/**
 * 全設定を取得する（フロントエンドから呼び出し）
 * @return {Object} 設定オブジェクト（key-value形式）
 */
function getAllSettings() {
  var sheet = getSpreadsheet_().getSheetByName(SHEET_SETTINGS_);
  var data = getSheetData_(sheet);
  var settings = {};
  data.forEach(function(row) {
    settings[row.key] = row.value;
  });
  return settings;
}

/**
 * 設定値を1件取得する（内部用）
 * @param {string} key - 設定キー
 * @return {string|null} 設定値
 */
function getSetting_(key) {
  var settings = getAllSettings();
  return settings[key] || null;
}

/**
 * 設定を保存する（フロントエンドから呼び出し）
 * @param {Object} settingsObj - 設定オブジェクト（key-value形式）
 * @return {Object} 保存結果
 */
function saveSettings(settingsObj) {
  try {
    var sheet = getSpreadsheet_().getSheetByName(SHEET_SETTINGS_);

    Object.keys(settingsObj).forEach(function(key) {
      var rowIndex = findSettingRowIndex_(sheet, key);
      if (rowIndex !== -1) {
        // 既存の設定を更新
        sheet.getRange(rowIndex, 2).setValue(settingsObj[key]);
      } else {
        // 新規設定を追加
        sheet.appendRow([key, settingsObj[key]]);
      }
    });

    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * 設定キーの行番号を検索する
 * @param {Sheet} sheet - シートオブジェクト
 * @param {string} key - 設定キー
 * @return {number} 行番号（見つからない場合-1）
 */
function findSettingRowIndex_(sheet, key) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;

  var keys = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < keys.length; i++) {
    if (keys[i][0] === key) return i + 2;
  }
  return -1;
}
