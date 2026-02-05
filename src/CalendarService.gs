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
