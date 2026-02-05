// ============================================================
// Utilities (from original Utils.gs)
// ============================================================

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

// ============================================================
// Setup (from original Setup.gs)
// ============================================================

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
 * 新規データベースを作成する（設定画面から呼び出し）
 * 旧DBは削除せず保持し、新しいスプレッドシートを作成してPropertiesServiceを更新する
 * @param {string} targetFolderId - 保存先フォルダID（省略時は現在のフォルダまたはマイドライブ直下）
 * @return {Object} 作成結果
 */
function recreateDatabase(targetFolderId) {
  try {
    var props = PropertiesService.getUserProperties();

    // キャッシュをクリア
    CacheService.getUserCache().removeAll([
      'memos', 'templates', 'settings',
      'memos_cache', 'templates_cache', 'projects_cache', 'members_cache'
    ]);

    // フォルダ決定
    var folder;
    var folderId;

    if (targetFolderId) {
      folder = DriveApp.getFolderById(targetFolderId);
      folderId = folder.getId();
    } else {
      // 現在の保存先フォルダがあればそこを使用
      var currentFolderId = props.getProperty(PROP_FOLDER_ID_);
      if (currentFolderId) {
        try {
          folder = DriveApp.getFolderById(currentFolderId);
          folderId = currentFolderId;
        } catch (e) {
          // 現在のフォルダにアクセスできない場合は新規作成
          folder = DriveApp.createFolder(FOLDER_NAME_);
          folderId = folder.getId();
        }
      } else {
        folder = DriveApp.createFolder(FOLDER_NAME_);
        folderId = folder.getId();
      }
    }

    // 新しいスプレッドシートを作成
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

    // プロパティを更新
    props.setProperty(PROP_SPREADSHEET_ID_, ssId);
    props.setProperty(PROP_FOLDER_ID_, folderId);

    return {
      success: true,
      message: '新しいデータベースを作成しました。ページをリロードしてください。',
      folderId: folderId,
      folderUrl: 'https://drive.google.com/drive/folders/' + folderId
    };
  } catch (e) {
    return { success: false, message: 'データベース作成に失敗しました: ' + e.message };
  }
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

// ============================================================
// Settings Repository (from original SettingsRepository.gs)
// ============================================================

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

// ============================================================
// Member Repository (from original MemberRepository.gs)
// ============================================================

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

// ============================================================
// Project Repository (from original ProjectRepository.gs)
// ============================================================

/**
 * 案件データアクセス層
 */

var PROJECT_CACHE_KEY_ = 'projects_cache';
var PROJECT_CACHE_TTL_ = 300; // 5分

/**
 * 案件一覧を取得する（フロントエンドから呼び出し）
 * @return {Array<Object>} 案件一覧
 */
function getProjects() {
  var cache = CacheService.getUserCache();
  var cached = cache.get(PROJECT_CACHE_KEY_);
  if (cached) {
    return JSON.parse(cached);
  }

  var sheet = getSpreadsheet_().getSheetByName(SHEET_PROJECTS_);
  var projects = getSheetData_(sheet);

  try {
    cache.put(PROJECT_CACHE_KEY_, JSON.stringify(projects), PROJECT_CACHE_TTL_);
  } catch (e) {
    // キャッシュサイズ超過時は無視
  }

  return projects;
}

/**
 * 案件を1件取得する
 * @param {string} id - 案件ID
 * @return {Object|null} 案件
 */
function getProjectById(id) {
  var projects = getProjects();
  for (var i = 0; i < projects.length; i++) {
    if (projects[i].id === id) return projects[i];
  }
  return null;
}

/**
 * 案件を作成する（フロントエンドから呼び出し）
 * @param {Object} data - 案件データ
 * @return {Object} 作成結果
 */
function createProject(data) {
  try {
    var sheet = getSpreadsheet_().getSheetByName(SHEET_PROJECTS_);
    var now = nowISO_();

    // 案件フォルダを作成（指定があればそのフォルダ内に、なければベースフォルダ内に）
    var folderId = data.folderId || '';
    var folderUrl = data.folderUrl || '';

    if (!folderId && data.name) {
      // ベースフォルダ内に案件フォルダを自動作成
      var baseFolderId = PropertiesService.getUserProperties().getProperty(PROP_FOLDER_ID_);
      if (baseFolderId) {
        try {
          var baseFolder = DriveApp.getFolderById(baseFolderId);
          var projectFolder = baseFolder.createFolder(data.name);
          folderId = projectFolder.getId();
          folderUrl = projectFolder.getUrl();
        } catch (e) {
          // フォルダ作成に失敗しても案件自体は作成する
        }
      }
    }

    var memberIds = data.memberIds || '[]';
    if (Array.isArray(memberIds)) {
      memberIds = JSON.stringify(memberIds);
    }

    // headers: id, name, folderId, folderUrl, description, memberIds, status, createdAt, updatedAt
    var row = [
      generateUUID_(),
      data.name || '',
      folderId,
      folderUrl,
      data.description || '',
      memberIds,
      data.status || 'active',
      now,
      now
    ];
    sheet.appendRow(row);
    clearProjectCache_();
    return { success: true, id: row[0] };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * 案件を更新する（フロントエンドから呼び出し）
 * @param {string} id - 案件ID
 * @param {Object} data - 更新データ
 * @return {Object} 更新結果
 */
function updateProject(id, data) {
  try {
    var sheet = getSpreadsheet_().getSheetByName(SHEET_PROJECTS_);
    var rowIndex = findRowIndexById_(sheet, id);
    if (rowIndex === -1) {
      return { success: false, message: '案件が見つかりません' };
    }

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var row = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];

    var updatableFields = ['name', 'folderId', 'folderUrl', 'description', 'memberIds', 'status'];
    updatableFields.forEach(function(field) {
      if (data.hasOwnProperty(field)) {
        var colIndex = headers.indexOf(field);
        if (colIndex !== -1) {
          var value = data[field];
          // memberIds が配列の場合はJSON文字列に変換
          if (field === 'memberIds' && Array.isArray(value)) {
            value = JSON.stringify(value);
          }
          row[colIndex] = value;
        }
      }
    });

    var updatedAtIndex = headers.indexOf('updatedAt');
    if (updatedAtIndex !== -1) {
      row[updatedAtIndex] = nowISO_();
    }

    sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
    clearProjectCache_();
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * 案件を削除する（フロントエンドから呼び出し）
 * @param {string} id - 案件ID
 * @return {Object} 削除結果
 */
function deleteProject(id) {
  try {
    var sheet = getSpreadsheet_().getSheetByName(SHEET_PROJECTS_);
    var rowIndex = findRowIndexById_(sheet, id);
    if (rowIndex === -1) {
      return { success: false, message: '案件が見つかりません' };
    }
    sheet.deleteRow(rowIndex);
    clearProjectCache_();
    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * 案件キャッシュをクリアする
 */
function clearProjectCache_() {
  CacheService.getUserCache().remove(PROJECT_CACHE_KEY_);
}

// ============================================================
// Template Repository (from original TemplateRepository.gs)
// ============================================================

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

// ============================================================
// Memo Repository (from original MemoRepository.gs)
// ============================================================

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

// ============================================================
// Calendar Service (from original CalendarService.gs)
// ============================================================

/**
 * Googleカレンダー連携サービス
 */

var CALENDAR_CACHE_KEY_ = 'calendar_events_';
var CALENDAR_CACHE_TTL_ = 600; // 10分

/**
 * 指定日のカレンダーイベントを取得する（フロントエンドから呼び出し）
 * @param {string} dateStr - 日付文字列（YYYY-MM-DD）。省略時は当日
 * @return {Array<Object>} イベント一覧
 */
function getCalendarEvents(dateStr) {
  var targetDate = dateStr ? new Date(dateStr) : new Date();
  var dateKey = Utilities.formatDate(targetDate, 'Asia/Tokyo', 'yyyy-MM-dd');

  // キャッシュ確認
  var cache = CacheService.getUserCache();
  var cacheKey = CALENDAR_CACHE_KEY_ + dateKey;
  var cached = cache.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // 対象カレンダーIDを設定から取得
  var calendarIds = getTargetCalendarIds_();

  var startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  var endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  var events = [];

  calendarIds.forEach(function(calId) {
    try {
      var calendar = CalendarApp.getCalendarById(calId);
      if (!calendar) return;

      var calEvents = calendar.getEvents(startOfDay, endOfDay);
      calEvents.forEach(function(event) {
        events.push({
          eventId: event.getId(),
          title: event.getTitle(),
          date: dateKey,
          startTime: formatTime_(event.getStartTime()),
          endTime: formatTime_(event.getEndTime()),
          attendees: getAttendeeEmails_(event),
          meetingLink: extractMeetingLink_(event),
          description: event.getDescription() || ''
        });
      });
    } catch (e) {
      // アクセスできないカレンダーはスキップ
    }
  });

  // 開始時刻順でソート
  events.sort(function(a, b) {
    return a.startTime.localeCompare(b.startTime);
  });

  // キャッシュに保存
  try {
    cache.put(cacheKey, JSON.stringify(events), CALENDAR_CACHE_TTL_);
  } catch (e) {
    // キャッシュサイズ超過時は無視
  }

  return events;
}

/**
 * ユーザーのカレンダー一覧を取得する（フロントエンドから呼び出し）
 * @return {Array<Object>} カレンダー一覧（id, name）
 */
function getUserCalendars() {
  var calendars = CalendarApp.getAllCalendars();
  return calendars.map(function(cal) {
    return {
      id: cal.getId(),
      name: cal.getName()
    };
  });
}

/**
 * 対象カレンダーIDリストを取得する
 * @return {Array<string>} カレンダーIDリスト
 */
function getTargetCalendarIds_() {
  try {
    var setting = getSetting_('targetCalendarIds');
    if (setting) {
      return JSON.parse(setting);
    }
  } catch (e) {
    // パースエラー時はデフォルト
  }
  return ['primary'];
}

/**
 * イベントの参加者メールアドレスを取得する
 * @param {CalendarEvent} event - カレンダーイベント
 * @return {string} カンマ区切りのメールアドレス
 */
function getAttendeeEmails_(event) {
  try {
    var guests = event.getGuestList();
    return guests.map(function(guest) {
      return guest.getEmail();
    }).join(', ');
  } catch (e) {
    return '';
  }
}

/**
 * イベントから会議リンクを抽出する
 * @param {CalendarEvent} event - カレンダーイベント
 * @return {string} 会議リンク
 */
function extractMeetingLink_(event) {
  // hangoutLinkプロパティを試す
  try {
    // Calendar Advanced Serviceが使えない場合、descriptionからURLを抽出
    var desc = event.getDescription() || '';
    var meetMatch = desc.match(/https:\/\/meet\.google\.com\/[a-z\-]+/);
    if (meetMatch) return meetMatch[0];

    var teamsMatch = desc.match(/https:\/\/teams\.microsoft\.com\/[^\s<"]+/);
    if (teamsMatch) return teamsMatch[0];

    var zoomMatch = desc.match(/https:\/\/[a-z0-9]+\.zoom\.us\/[^\s<"]+/);
    if (zoomMatch) return zoomMatch[0];
  } catch (e) {
    // 抽出失敗時は空文字
  }
  return '';
}

// ============================================================
// Auto Generator (from original AutoGenerator.gs)
// ============================================================

/**
 * 議事メモ自動生成サービス
 * 案件フォルダへのGoogleドキュメント自動生成に対応
 */

/**
 * テンプレートのプレースホルダーを展開する
 * @param {string} templateBody - テンプレート本文
 * @param {Object} eventData - カレンダーイベントデータ
 * @return {string} 展開済みテキスト
 */
function expandPlaceholders_(templateBody, eventData) {
  var placeholders = {
    '{{会議タイトル}}': eventData.title || '',
    '{{日付}}': eventData.date || '',
    '{{開始時刻}}': eventData.startTime || '',
    '{{終了時刻}}': eventData.endTime || '',
    '{{参加者}}': eventData.attendees || '',
    '{{会議リンク}}': eventData.meetingLink || '',
    '{{説明}}': eventData.description || ''
  };

  var result = templateBody;
  Object.keys(placeholders).forEach(function(key) {
    result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), placeholders[key]);
  });

  return result;
}

/**
 * 案件フォルダにGoogleドキュメントとして議事録を作成する
 * @param {Object} memoData - 議事録データ
 * @param {string} projectId - 案件ID
 * @return {Object} { docUrl: string } ドキュメントURL
 */
function createMemoDocument_(memoData, projectId) {
  var docUrl = '';

  if (!projectId) return { docUrl: '' };

  try {
    var project = getProjectById(projectId);
    if (!project || !project.folderId) return { docUrl: '' };

    var folder = DriveApp.getFolderById(project.folderId);

    // Googleドキュメントを作成
    var docTitle = (memoData.date || '') + ' ' + (memoData.title || '議事録');
    var doc = DocumentApp.create(docTitle);
    var docId = doc.getId();

    // 本文を設定
    var body = doc.getBody();
    body.setText(memoData.content || '');

    doc.saveAndClose();

    // ドキュメントを案件フォルダに移動
    var file = DriveApp.getFileById(docId);
    folder.addFile(file);
    DriveApp.getRootFolder().removeFile(file);

    docUrl = doc.getUrl();
  } catch (e) {
    Logger.log('ドキュメント作成失敗: ' + e.message);
  }

  return { docUrl: docUrl };
}

/**
 * カレンダーイベントから議事メモを自動生成する（トリガーから呼び出し）
 */
function generateDailyMemos() {
  if (!isSetupCompleted_()) return;

  var events = getCalendarEvents();
  if (events.length === 0) return;

  // デフォルトテンプレート取得（Googleドキュメント対応）
  var template = getDefaultTemplate_();
  if (!template) return;

  var templateBody = getTemplateBody_(template);

  var created = 0;
  events.forEach(function(event) {
    if (memoExistsByEventId_(event.eventId)) return;

    var content = expandPlaceholders_(templateBody, event);

    var result = createMemo({
      eventId: event.eventId,
      title: event.title,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      attendees: event.attendees,
      meetingLink: event.meetingLink,
      templateId: template.id,
      content: content,
      status: 'draft'
    });

    if (result.success) created++;
  });

  Logger.log('自動生成完了: ' + created + '件の議事メモを作成しました');
}

/**
 * カレンダーイベントから手動で議事メモを生成する（フロントエンドから呼び出し）
 * @param {string} dateStr - 日付文字列（YYYY-MM-DD）。省略時は当日
 * @param {string} projectId - 案件ID（省略可）
 * @return {Object} 生成結果
 */
function generateMemosFromCalendar(dateStr, projectId) {
  try {
    var events = getCalendarEvents(dateStr);
    if (events.length === 0) {
      return { success: true, created: 0, message: '対象のイベントがありません' };
    }

    var template = getDefaultTemplate_();
    if (!template) {
      return { success: false, message: 'テンプレートが設定されていません' };
    }

    var templateBody = getTemplateBody_(template);

    var created = 0;
    var skipped = 0;
    events.forEach(function(event) {
      if (memoExistsByEventId_(event.eventId)) {
        skipped++;
        return;
      }

      var content = expandPlaceholders_(templateBody, event);

      var memoData = {
        eventId: event.eventId,
        projectId: projectId || '',
        title: event.title,
        date: event.date,
        startTime: event.startTime,
        endTime: event.endTime,
        attendees: event.attendees,
        meetingLink: event.meetingLink,
        templateId: template.id,
        content: content,
        status: 'draft'
      };

      // 案件指定がある場合はGoogleドキュメントも作成
      if (projectId) {
        var docResult = createMemoDocument_(memoData, projectId);
        memoData.docUrl = docResult.docUrl;
      }

      var result = createMemo(memoData);
      if (result.success) created++;
    });

    return {
      success: true,
      created: created,
      skipped: skipped,
      message: created + '件作成、' + skipped + '件スキップ（既存）'
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * 既存の議事録からGoogleドキュメントを生成する（フロントエンドから呼び出し）
 * @param {string} memoId - 議事録ID
 * @param {string} projectId - 案件ID
 * @return {Object} 生成結果
 */
function createDocumentFromMemo(memoId, projectId) {
  try {
    var memo = getMemoById(memoId);
    if (!memo) {
      return { success: false, message: '議事録が見つかりません' };
    }

    var pid = projectId || memo.projectId;
    if (!pid) {
      return { success: false, message: '案件が指定されていません' };
    }

    var docResult = createMemoDocument_(memo, pid);
    if (docResult.docUrl) {
      // 議事録にドキュメントURLを保存
      updateMemo(memoId, { docUrl: docResult.docUrl, projectId: pid });
      return { success: true, docUrl: docResult.docUrl, message: 'ドキュメントを作成しました' };
    } else {
      return { success: false, message: 'ドキュメント作成に失敗しました' };
    }
  } catch (e) {
    return { success: false, message: e.message };
  }
}

// ============================================================
// Distribution Service (from original DistributionService.gs)
// ============================================================

/**
 * 議事録配布サービス
 * Gmail送信およびGoogle Chat Webhook送信に対応
 */

/**
 * 議事録をメンバーにメールで配布する（フロントエンドから呼び出し）
 * @param {string} memoId - 議事録ID
 * @param {Array<string>} memberIds - 送信先メンバーIDリスト
 * @return {Object} 配布結果
 */
function distributeMemoByEmail(memoId, memberIds) {
  try {
    var memo = getMemoById(memoId);
    if (!memo) {
      return { success: false, message: '議事録が見つかりません' };
    }

    var members = getMembersByIds(memberIds);
    if (members.length === 0) {
      return { success: false, message: '送信先メンバーが選択されていません' };
    }

    // メール送信先を収集
    var recipients = members
      .filter(function(m) { return m.email; })
      .map(function(m) { return m.email; });

    if (recipients.length === 0) {
      return { success: false, message: 'メールアドレスが登録されているメンバーがいません' };
    }

    // メール本文を構成
    var subject = '【議事録】' + (memo.title || '無題');
    var body = buildEmailBody_(memo);

    // Gmail送信
    GmailApp.sendEmail(recipients.join(','), subject, body, {
      name: '議事録管理アプリ',
      noReply: true
    });

    return {
      success: true,
      message: recipients.length + '件のメールを送信しました',
      sentTo: recipients
    };
  } catch (e) {
    return { success: false, message: 'メール送信に失敗しました: ' + e.message };
  }
}

/**
 * 議事録をGoogle Chat Webhookで配布する（フロントエンドから呼び出し）
 * @param {string} memoId - 議事録ID
 * @param {Array<string>} memberIds - 送信先メンバーIDリスト
 * @return {Object} 配布結果
 */
function distributeMemoByChat(memoId, memberIds) {
  try {
    var memo = getMemoById(memoId);
    if (!memo) {
      return { success: false, message: '議事録が見つかりません' };
    }

    var members = getMembersByIds(memberIds);
    if (members.length === 0) {
      return { success: false, message: '送信先メンバーが選択されていません' };
    }

    // Webhook URLを持つメンバーを抽出（重複排除）
    var webhookUrls = [];
    var seenUrls = {};
    members.forEach(function(m) {
      if (m.chatWebhookUrl && !seenUrls[m.chatWebhookUrl]) {
        webhookUrls.push(m.chatWebhookUrl);
        seenUrls[m.chatWebhookUrl] = true;
      }
    });

    if (webhookUrls.length === 0) {
      return { success: false, message: 'Webhook URLが登録されているメンバーがいません' };
    }

    // Chat用のメッセージを構成
    var chatMessage = buildChatMessage_(memo);

    // 各Webhook URLに送信
    var sentCount = 0;
    var errors = [];
    webhookUrls.forEach(function(url) {
      try {
        var options = {
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify({ text: chatMessage }),
          muteHttpExceptions: true
        };
        var response = UrlFetchApp.fetch(url, options);
        if (response.getResponseCode() === 200) {
          sentCount++;
        } else {
          errors.push('HTTP ' + response.getResponseCode());
        }
      } catch (e) {
        errors.push(e.message);
      }
    });

    if (sentCount > 0) {
      return {
        success: true,
        message: sentCount + '件のWebhookに送信しました' +
                 (errors.length > 0 ? '（' + errors.length + '件失敗）' : '')
      };
    } else {
      return { success: false, message: 'Webhook送信に失敗しました: ' + errors.join(', ') };
    }
  } catch (e) {
    return { success: false, message: 'Chat送信に失敗しました: ' + e.message };
  }
}

/**
 * メール本文を構成する（内部用）
 * @param {Object} memo - 議事録オブジェクト
 * @return {string} メール本文
 */
function buildEmailBody_(memo) {
  var lines = [];
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('議事録: ' + (memo.title || '無題'));
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━');
  lines.push('');
  lines.push('日時: ' + (memo.date || '') + ' ' + (memo.startTime || '') +
             (memo.endTime ? ' - ' + memo.endTime : ''));
  lines.push('参加者: ' + (memo.attendees || ''));
  if (memo.meetingLink) {
    lines.push('会議リンク: ' + memo.meetingLink);
  }
  if (memo.docUrl) {
    lines.push('Googleドキュメント: ' + memo.docUrl);
  }
  lines.push('');
  lines.push('--- 議事録内容 ---');
  lines.push('');
  lines.push(memo.content || '（内容なし）');
  lines.push('');
  lines.push('---');
  lines.push('※ このメールは議事録管理アプリから自動送信されました。');

  return lines.join('\n');
}

/**
 * Google Chat用のメッセージを構成する（内部用）
 * @param {Object} memo - 議事録オブジェクト
 * @return {string} Chatメッセージ
 */
function buildChatMessage_(memo) {
  var lines = [];
  lines.push('*【議事録】' + (memo.title || '無題') + '*');
  lines.push('');
  lines.push('日時: ' + (memo.date || '') + ' ' + (memo.startTime || '') +
             (memo.endTime ? ' - ' + memo.endTime : ''));
  lines.push('参加者: ' + (memo.attendees || ''));
  if (memo.meetingLink) {
    lines.push('会議リンク: ' + memo.meetingLink);
  }
  if (memo.docUrl) {
    lines.push('ドキュメント: ' + memo.docUrl);
  }
  lines.push('');
  // Chatメッセージは文字数制限があるため本文は要約
  var content = memo.content || '';
  if (content.length > 500) {
    content = content.substring(0, 500) + '...\n（続きはドキュメントを参照）';
  }
  lines.push(content);

  return lines.join('\n');
}

// ============================================================
// Trigger Manager (from original TriggerManager.gs)
// ============================================================

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

// ============================================================
// Entry Point (from original Code.gs)
// ============================================================

/**
 * Webアプリのエントリポイント
 * @param {Object} e - リクエストパラメータ
 * @return {HtmlOutput} HTML出力
 */
function doGet(e) {
  var isSetupDone = isSetupCompleted_();

  var template = HtmlService.createTemplateFromFile('index');
  template.isSetupDone = isSetupDone;

  // 初期データの埋め込み（パフォーマンス最適化）
  if (isSetupDone) {
    try {
      template.initialMemos = JSON.stringify(getMemos());
      template.initialTemplates = JSON.stringify(getTemplates());
      template.initialSettings = JSON.stringify(getAllSettings());
      template.initialProjects = JSON.stringify(getProjects());
      template.initialMembers = JSON.stringify(getMembers());
    } catch (err) {
      template.initialMemos = '[]';
      template.initialTemplates = '[]';
      template.initialSettings = '{}';
      template.initialProjects = '[]';
      template.initialMembers = '[]';
    }
  } else {
    template.initialMemos = '[]';
    template.initialTemplates = '[]';
    template.initialSettings = '{}';
    template.initialProjects = '[]';
    template.initialMembers = '[]';
  }

  return template
    .evaluate()
    .setTitle('議事録管理アプリ')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
