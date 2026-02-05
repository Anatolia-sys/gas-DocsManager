/**
 * ユーティリティ関数
 */

/**
 * UUIDを生成する
 * @return {string} UUID文字列
 */
function generateUUID_() {
  return Utilities.getUuid();
}

/**
 * 日付をYYYY/MM/DD形式でフォーマットする
 * @param {Date} date - 日付オブジェクト
 * @return {string} フォーマット済み文字列
 */
function formatDate_(date) {
  return Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy/MM/dd');
}

/**
 * 時刻をHH:MM形式でフォーマットする
 * @param {Date} date - 日付オブジェクト
 * @return {string} フォーマット済み文字列
 */
function formatTime_(date) {
  return Utilities.formatDate(date, 'Asia/Tokyo', 'HH:mm');
}

/**
 * 現在日時をISO文字列で返す
 * @return {string} ISO日時文字列
 */
function nowISO_() {
  return new Date().toISOString();
}
