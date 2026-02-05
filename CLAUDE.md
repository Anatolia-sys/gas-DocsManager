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
├── Code.gs             # 全バックエンドコード統合ファイル（doGet, Setup, Repository, Service等）
└── index.html          # 全フロントエンドコード統合ファイル（HTML + CSS + Vue.js）
docs/
├── requirements.md     # 要件定義書
├── IMPROVE.md          # 追加要望
└── er-diagram.md       # ER図（Mermaid）
```

### Code.gs セクション構成
1. Utilities - UUID生成、日付フォーマット
2. Setup - 初回セットアップ、DB新規作成（recreateDatabase）、シート作成
3. SettingsRepository - 設定読み書き
4. MemberRepository - メンバーCRUD（キャッシュ対応）
5. ProjectRepository - 案件CRUD（フォルダ自動作成、キャッシュ対応）
6. TemplateRepository - テンプレートCRUD（Googleドキュメント対応）
7. MemoRepository - 議事録CRUD（CacheService対応、論理削除）
8. CalendarService - Googleカレンダー連携
9. AutoGenerator - 議事メモ自動生成・Googleドキュメント生成
10. DistributionService - 議事録配布（Gmail/Google Chat）
11. TriggerManager - 時間主導型トリガー管理
12. Entry Point - doGet()

### index.html 構成
- CSS: Claude風モダンデザイン（ホバーエフェクト強化済み）
- HTML: セットアップ画面、サイドバー、全6ページ（議事録一覧/編集、案件、メンバー、テンプレート、設定）
- JavaScript: Vue.js 3 SPA（gasRunラッパー、全CRUD操作、DB新規作成機能）

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
