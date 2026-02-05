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

/**
 * HTMLファイルをインクルードするヘルパー
 * @param {string} filename - インクルードするファイル名
 * @return {string} HTML文字列
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
