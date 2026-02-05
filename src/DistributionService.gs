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
