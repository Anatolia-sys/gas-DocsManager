# TODO2 - 追加要望 実装タスク

## 概要
IMPROVE.md に記載の6つの追加要望を実装する。

---

## フェーズ A: データモデル変更・基盤整備

- [x] ER図の作成（docs/er-diagram.md）
- [x] appsscript.json に OAuth スコープ追加（documents, gmail.send, drive）
- [x] Setup.gs: 案件シート・メンバーシート追加
- [x] Setup.gs: フォルダ指定セットアップ対応
- [x] 議事録シートに projectId / docUrl カラム追加
- [x] テンプレートシートに docId / docUrl カラム追加

## フェーズ B: バックエンド - 案件・メンバー管理

- [x] ProjectRepository.gs: 案件CRUD実装
- [x] MemberRepository.gs: メンバーCRUD実装
- [x] MemoRepository.gs: projectId 対応（フィルタ・保存）
- [x] AutoGenerator.gs: 案件フォルダへのGoogleドキュメント自動生成

## フェーズ C: バックエンド - テンプレート・配布

- [x] TemplateRepository.gs: Googleドキュメントテンプレート対応
- [x] DistributionService.gs: Gmail送信機能
- [x] DistributionService.gs: Google Chat Webhook送信機能

## フェーズ D: フロントエンド - 新規画面

- [x] page-projects.html: 案件管理画面
- [x] page-members.html: メンバー管理画面
- [x] index.html: ナビゲーション追加（案件・メンバー）

## フェーズ E: フロントエンド - 既存画面改修

- [x] page-memos.html: フィルター強化（日付範囲・案件別）
- [x] page-memos.html: 配布ボタン追加
- [x] page-templates.html: Googleドキュメント登録対応
- [x] page-settings.html: フォルダ指定UI追加
- [x] js-app.html: 全新機能のVue.jsロジック追加

## フェーズ F: デザイン刷新

- [x] css.html: Claude風モダンデザイン適用
- [x] index.html: サイドバーナビゲーション化
- [x] 全画面: カード型レイアウト・統一デザイン

## フェーズ G: 検証（デプロイ後に実施）

> **注**: 以下は `clasp push` でGASにアップロード後、Webアプリとして動作確認する項目です。

- [ ] clasp push でデプロイ確認
- [ ] 新規セットアップフローの動作確認（フォルダ選択 → スプレッドシート作成）
- [ ] 案件・メンバーCRUDの動作確認
- [ ] Googleドキュメントテンプレートの動作確認
- [ ] 議事録配布（Gmail / Google Chat）の動作確認
- [ ] フィルター・検索機能の動作確認（案件別、日付範囲）
- [ ] サイドバーナビゲーション・レスポンシブデザインの確認

---

## 実装サマリー

| 要望 | 対応ファイル | ステータス |
|------|-------------|-----------|
| Googleドキュメントテンプレート | TemplateRepository.gs, AutoGenerator.gs, page-templates.html | ✅ 完了 |
| フィルター・検索機能 | page-memos.html, js-app.html | ✅ 完了 |
| 初期セットアップ（フォルダ指定） | Setup.gs, index.html, js-app.html | ✅ 完了 |
| 案件管理 | ProjectRepository.gs, page-projects.html, AutoGenerator.gs | ✅ 完了 |
| Claude風モダンデザイン | css.html, index.html, 全画面HTML | ✅ 完了 |
| メンバー管理・配布 | MemberRepository.gs, DistributionService.gs, page-members.html | ✅ 完了 |
