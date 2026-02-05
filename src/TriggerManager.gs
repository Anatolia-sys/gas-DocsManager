/**
 * トリガー管理サービス
 */

var TRIGGER_FUNCTION_NAME_ = 'generateDailyMemos';

/**
 * 自動生成トリガーを登録する（フロントエンドから呼び出し）
 * @param {number} hour - 実行時刻（0-23）
 * @return {Object} 登録結果
 */
function setupDailyTrigger(hour) {
  try {
    // 既存トリガーを削除
    removeDailyTrigger_();

    // 新しいトリガーを作成
    ScriptApp.newTrigger(TRIGGER_FUNCTION_NAME_)
      .timeBased()
      .atHour(hour)
      .everyDays(1)
      .inTimezone('Asia/Tokyo')
      .create();

    // 設定に保存
    saveSettings({ triggerHour: String(hour) });

    return { success: true, message: '毎日' + hour + '時に自動生成を設定しました' };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * 自動生成トリガーを解除する（フロントエンドから呼び出し）
 * @return {Object} 解除結果
 */
function removeDailyTrigger() {
  try {
    removeDailyTrigger_();
    return { success: true, message: 'トリガーを解除しました' };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * 既存の自動生成トリガーを削除する（内部用）
 */
function removeDailyTrigger_() {
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === TRIGGER_FUNCTION_NAME_) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

/**
 * 現在のトリガー状態を取得する（フロントエンドから呼び出し）
 * @return {Object} トリガー情報
 */
function getTriggerStatus() {
  var triggers = ScriptApp.getProjectTriggers();
  var triggerInfo = null;

  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === TRIGGER_FUNCTION_NAME_) {
      triggerInfo = {
        active: true,
        type: trigger.getEventType().toString()
      };
    }
  });

  if (!triggerInfo) {
    triggerInfo = { active: false };
  }

  // 設定からhourを取得
  triggerInfo.hour = getSetting_('triggerHour') || '7';

  return triggerInfo;
}
