/**
 * 初回セットアップ処理
 * マイドライブにフォルダ・スプレッドシートを自動作成する
 */

var FOLDER_NAME_ = '議事録管理アプリ';
var SPREADSHEET_NAME_ = '議事録データ';
var PROP_SPREADSHEET_ID_ = 'spreadsheetId';
var PROP_FOLDER_ID_ = 'folderId';

// シート名定数
var SHEET_MEMOS_ = '議事録';
var SHEET_TEMPLATES_ = 'テンプレート';
var SHEET_SETTINGS_ = '設定';
var SHEET_PROJECTS_ = '案件';
var SHEET_MEMBERS_ = 'メンバー';

/**
 * セットアップが完了済みか判定する
 * @return {boolean} セットアップ完了済みならtrue
 */
function isSetupCompleted_() {
  var props = PropertiesService.getUserProperties();
  var ssId = props.getProperty(PROP_SPREADSHEET_ID_);
  if (!ssId) return false;

  try {
    SpreadsheetApp.openById(ssId);
    return true;
  } catch (e) {
    props.deleteProperty(PROP_SPREADSHEET_ID_);
    props.deleteProperty(PROP_FOLDER_ID_);
    return false;
  }
}

/**
 * 初回セットアップを実行する（フロントエンドから呼び出し）
 * @param {string} targetFolderId - 指定フォルダID（省略時はマイドライブ直下に新規フォルダ作成）
 * @return {Object} セットアップ結果
 */
function runSetup(targetFolderId) {
  if (isSetupCompleted_()) {
    return { success: true, message: 'セットアップ済みです' };
  }

  try {
    var folder;
    var folderId;

    if (targetFolderId) {
      // 指定フォルダを使用
      try {
        folder = DriveApp.getFolderById(targetFolderId);
        folderId = folder.getId();
      } catch (e) {
        return { success: false, message: '指定されたフォルダが見つかりません: ' + e.message };
      }
    } else {
      // マイドライブ直下に新規フォルダ作成
      folder = DriveApp.createFolder(FOLDER_NAME_);
      folderId = folder.getId();
    }

    // スプレッドシート作成
    var ss = SpreadsheetApp.create(SPREADSHEET_NAME_);
    var ssId = ss.getId();

    // スプレッドシートをフォルダに移動
    var file = DriveApp.getFileById(ssId);
    folder.addFile(file);
    DriveApp.getRootFolder().removeFile(file);

    // シートを作成
    setupMemoSheet_(ss);
    setupTemplateSheet_(ss);
    setupSettingsSheet_(ss);
    setupProjectSheet_(ss);
    setupMemberSheet_(ss);

    // デフォルトのSheet1を削除
    var defaultSheet = ss.getSheetByName('Sheet1');
    if (defaultSheet) {
      ss.deleteSheet(defaultSheet);
    }

    // デフォルトテンプレートを投入
    insertDefaultTemplate_(ss);

    // デフォルト設定を投入
    insertDefaultSettings_(ss, folderId);

    // プロパティに保存
    var props = PropertiesService.getUserProperties();
    props.setProperty(PROP_SPREADSHEET_ID_, ssId);
    props.setProperty(PROP_FOLDER_ID_, folderId);

    return {
      success: true,
      message: 'セットアップが完了しました',
      folderId: folderId,
      folderUrl: 'https://drive.google.com/drive/folders/' + folderId
    };
  } catch (e) {
    return { success: false, message: 'セットアップに失敗しました: ' + e.message };
  }
}

/**
 * ユーザーのGoogle Driveフォルダ一覧を取得する（フロントエンドから呼び出し）
 * @return {Array<Object>} フォルダ一覧
 */
function getDriveFolders() {
  var folders = [];
  var rootFolders = DriveApp.getRootFolder().getFolders();
  while (rootFolders.hasNext()) {
    var f = rootFolders.next();
    folders.push({
      id: f.getId(),
      name: f.getName(),
      url: f.getUrl()
    });
  }
  folders.sort(function(a, b) { return a.name.localeCompare(b.name); });
  return folders;
}

/**
 * 議事録シートのヘッダーを作成（projectId, docUrl カラム追加）
 */
function setupMemoSheet_(ss) {
  var sheet = ss.insertSheet(SHEET_MEMOS_);
  var headers = [
    'id', 'eventId', 'projectId', 'title', 'date', 'startTime', 'endTime',
    'attendees', 'meetingLink', 'templateId', 'content',
    'status', 'docUrl', 'createdAt', 'updatedAt', 'deleted'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
}

/**
 * テンプレートシートのヘッダーを作成（docId, docUrl カラム追加）
 */
function setupTemplateSheet_(ss) {
  var sheet = ss.insertSheet(SHEET_TEMPLATES_);
  var headers = ['id', 'name', 'body', 'docId', 'docUrl', 'isDefault', 'createdAt', 'updatedAt'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
}

/**
 * 設定シートのヘッダーを作成
 */
function setupSettingsSheet_(ss) {
  var sheet = ss.insertSheet(SHEET_SETTINGS_);
  var headers = ['key', 'value'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
}

/**
 * 案件シートのヘッダーを作成
 */
function setupProjectSheet_(ss) {
  var sheet = ss.insertSheet(SHEET_PROJECTS_);
  var headers = [
    'id', 'name', 'folderId', 'folderUrl', 'description',
    'memberIds', 'status', 'createdAt', 'updatedAt'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
}

/**
 * メンバーシートのヘッダーを作成
 */
function setupMemberSheet_(ss) {
  var sheet = ss.insertSheet(SHEET_MEMBERS_);
  var headers = ['id', 'name', 'email', 'chatWebhookUrl', 'createdAt', 'updatedAt'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
}

/**
 * デフォルトテンプレートを投入
 */
function insertDefaultTemplate_(ss) {
  var sheet = ss.getSheetByName(SHEET_TEMPLATES_);
  var now = new Date().toISOString();
  var defaultBody = [
    '# {{会議タイトル}}',
    '',
    '**日時**: {{日付}} {{開始時刻}} - {{終了時刻}}',
    '**参加者**: {{参加者}}',
    '**会議リンク**: {{会議リンク}}',
    '',
    '## アジェンダ',
    '- ',
    '',
    '## 議事内容',
    '- ',
    '',
    '## 決定事項',
    '- ',
    '',
    '## アクションアイテム',
    '| 担当者 | タスク | 期限 |',
    '|--------|--------|------|',
    '|        |        |      |',
    '',
    '## 備考',
    '- '
  ].join('\n');

  // headers: id, name, body, docId, docUrl, isDefault, createdAt, updatedAt
  var row = [generateUUID_(), 'デフォルトテンプレート', defaultBody, '', '', true, now, now];
  sheet.appendRow(row);
}

/**
 * デフォルト設定を投入
 */
function insertDefaultSettings_(ss, folderId) {
  var sheet = ss.getSheetByName(SHEET_SETTINGS_);
  var defaults = [
    ['triggerHour', '7'],
    ['targetCalendarIds', '["primary"]'],
    ['defaultTemplateId', ''],
    ['baseFolderId', folderId || ''],
    ['baseFolderUrl', folderId ? 'https://drive.google.com/drive/folders/' + folderId : '']
  ];
  defaults.forEach(function(row) {
    sheet.appendRow(row);
  });
}

/**
 * セットアップをリセットする（設定画面から呼び出し）
 * @return {Object} リセット結果
 */
function resetSetup() {
  var props = PropertiesService.getUserProperties();
  props.deleteProperty(PROP_SPREADSHEET_ID_);
  props.deleteProperty(PROP_FOLDER_ID_);

  CacheService.getUserCache().removeAll([
    'memos', 'templates', 'settings'
  ]);

  return { success: true, message: 'リセットしました。次回アクセス時に再セットアップされます。' };
}

/**
 * スプレッドシートを取得する（内部用）
 * @return {Spreadsheet} スプレッドシート
 */
function getSpreadsheet_() {
  var ssId = PropertiesService.getUserProperties().getProperty(PROP_SPREADSHEET_ID_);
  if (!ssId) {
    throw new Error('セットアップが完了していません');
  }
  return SpreadsheetApp.openById(ssId);
}
