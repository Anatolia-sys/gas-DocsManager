# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

gas-memomanager - Google Apps Script (GAS) ベースの議事録管理Webアプリケーション。
Googleカレンダーと連携し、会議の議事録作成・管理を効率化する。

## 技術スタック

- **バックエンド**: Google Apps Script (V8ランタイム)
- **フロントエンド**: HTML + CSS + Vue.js 3 (CDN) + Bootstrap 5 (CDN)
- **データベース**: Google スプレッドシート
- **外部連携**: Google Calendar, Google Drive, Google Docs, Gmail, Google Chat Webhook
- **開発ツール**: clasp

## ディレクトリ構成

```
src/                    # GASソースコード（claspのrootDir）
├── appsscript.json     # GASプロジェクト設定・OAuthスコープ
├── Code.gs             # エントリポイント（doGet, include）
├── Setup.gs            # 初回セットアップ・プロビジョニング
├── MemoRepository.gs   # 議事録CRUD（CacheService対応）
├── TemplateRepository.gs # テンプレートCRUD（Googleドキュメント対応）
├── SettingsRepository.gs # 設定読み書き
├── ProjectRepository.gs  # 案件CRUD
├── MemberRepository.gs   # メンバーCRUD
├── CalendarService.gs  # Googleカレンダー連携
├── AutoGenerator.gs    # 議事メモ自動生成・Googleドキュメント生成
├── DistributionService.gs # 議事録配布（Gmail/Google Chat）
├── TriggerManager.gs   # 時間主導型トリガー管理
├── Utils.gs            # ユーティリティ（UUID, 日付フォーマット）
├── index.html          # メインHTML（SPAエントリ・サイドバーナビ）
├── css.html            # Claude風モダンCSS
├── js-app.html         # Vue.jsアプリケーション・全ロジック
├── page-memos.html     # 議事録一覧画面（フィルタ・配布対応）
├── page-memo-edit.html # 議事録編集画面（案件選択・GDoc対応）
├── page-projects.html  # 案件管理画面
├── page-members.html   # メンバー管理画面
├── page-templates.html # テンプレート管理画面（Googleドキュメント対応）
└── page-settings.html  # 設定画面（フォルダ設定対応）
docs/
├── requirements.md     # 要件定義書
├── IMPROVE.md          # 追加要望
└── er-diagram.md       # ER図（Mermaid）
```

## アーキテクチャ

- **SPA構成**: index.html に全画面を含み、Vue.jsのリアクティブ表示切替でSPA動作
- **サイドバーナビ**: Claude風のダークサイドバーで画面切替
- **通信**: `google.script.run` を `gasRun()` でPromiseラッパー化し非同期通信
- **パフォーマンス**: doGet時にscriptletで初期データ埋め込み、CacheServiceでスプレッドシート読み込みキャッシュ（TTL 5-10分）
- **データ永続化**: ユーザーのマイドライブにスプレッドシートを自動作成（フォルダ指定可能）、IDは `PropertiesService.getUserProperties()` に保持

## 開発コマンド

```bash
clasp login          # Google認証
clasp create --type webapp --title "議事録管理アプリ"  # 初回のみ
clasp push           # ソースをGASにアップロード
clasp open           # ブラウザでスクリプトエディタを開く
clasp deployments    # デプロイ一覧
```

## 開発ルール

- 回答・コメントは日本語で記述する
- タスク実行時は TODO.md にチェックリストを出力する
- `.env` やAPIキーのハードコードは禁止
- ファイル削除時は必ず確認を取る
- コミットメッセージは Conventional Commits 形式に従う（`feat:`, `fix:`, `docs:`, `refactor:`, `test:`）
- GAS固有の制約: 実行時間6分上限、`IFRAME`サンドボックス、`google.script.run`非同期通信
