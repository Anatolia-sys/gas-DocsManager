# ER図 - 議事録管理アプリ（改修後）

## Mermaid ER Diagram

```mermaid
erDiagram
    MEMOS {
        string id PK "UUID"
        string eventId "GoogleカレンダーイベントID"
        string projectId FK "案件ID"
        string title "会議タイトル"
        date date "会議日"
        time startTime "開始時刻"
        time endTime "終了時刻"
        string attendees "参加者（カンマ区切り）"
        string meetingLink "会議リンク"
        string templateId FK "使用テンプレートID"
        string content "議事録本文"
        string status "draft/completed/archived"
        string docUrl "Googleドキュメント URL"
        datetime createdAt "作成日時"
        datetime updatedAt "更新日時"
        boolean deleted "論理削除フラグ"
    }

    TEMPLATES {
        string id PK "UUID"
        string name "テンプレート名"
        string body "テンプレート本文（フォールバック用）"
        string docId "GoogleドキュメントID"
        string docUrl "GoogleドキュメントURL"
        boolean isDefault "デフォルトフラグ"
        datetime createdAt "作成日時"
        datetime updatedAt "更新日時"
    }

    PROJECTS {
        string id PK "UUID"
        string name "案件名"
        string folderId "Google DriveフォルダID"
        string folderUrl "フォルダURL"
        string description "案件説明"
        string memberIds "メンバーIDリスト（JSON配列）"
        string status "active/archived"
        datetime createdAt "作成日時"
        datetime updatedAt "更新日時"
    }

    MEMBERS {
        string id PK "UUID"
        string name "表示名"
        string email "メールアドレス"
        string chatWebhookUrl "Google Chat Webhook URL"
        datetime createdAt "作成日時"
        datetime updatedAt "更新日時"
    }

    SETTINGS {
        string key PK "設定キー"
        string value "設定値"
    }

    PROJECTS ||--o{ MEMOS : "案件に紐づく議事録"
    TEMPLATES ||--o{ MEMOS : "テンプレートで生成"
    PROJECTS }o--o{ MEMBERS : "案件にメンバー参加（memberIds JSON）"
```

## シート定義詳細

### 議事録シート（変更点）
| カラム | 新規/変更 | 説明 |
|--------|-----------|------|
| projectId | **新規追加** | 案件IDとの紐付け |
| docUrl | **新規追加** | 自動生成されたGoogleドキュメントのURL |

### テンプレートシート（変更点）
| カラム | 新規/変更 | 説明 |
|--------|-----------|------|
| docId | **新規追加** | GoogleドキュメントのファイルID |
| docUrl | **新規追加** | GoogleドキュメントのURL |
| body | 既存維持 | GDoc未登録時のフォールバック |

### 案件シート（新規）
| カラム | 型 | 説明 |
|--------|-----|------|
| id | string | UUID |
| name | string | 案件名 |
| folderId | string | Google DriveフォルダID |
| folderUrl | string | フォルダURL（表示用） |
| description | string | 案件説明 |
| memberIds | string | メンバーIDリスト（JSON配列） |
| status | string | active / archived |
| createdAt | datetime | 作成日時 |
| updatedAt | datetime | 更新日時 |

### メンバーシート（新規）
| カラム | 型 | 説明 |
|--------|-----|------|
| id | string | UUID |
| name | string | 表示名 |
| email | string | メールアドレス |
| chatWebhookUrl | string | Google Chat Webhook URL |
| createdAt | datetime | 作成日時 |
| updatedAt | datetime | 更新日時 |

### 設定シート（追加キー）
| キー | 説明 |
|------|------|
| triggerHour | トリガー実行時刻（既存） |
| targetCalendarIds | 対象カレンダーID（既存） |
| defaultTemplateId | デフォルトテンプレートID（既存） |
| baseFolderId | **新規**: データ格納先フォルダID |
| baseFolderUrl | **新規**: データ格納先フォルダURL |
