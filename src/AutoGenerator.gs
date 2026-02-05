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
