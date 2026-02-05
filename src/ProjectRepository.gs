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
