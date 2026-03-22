# Server

`server` ディレクトリは独立した Go モジュールです。デプロイは単一の Go API サーバーを維持しつつ、内部コードはドメイン単位で分離するモノリシック構成を前提に管理します。

## 現在の構成

```text
server/
├─ cmd/
│  └─ api/
├─ internal/
│  ├─ bootstrap/
│  ├─ platform/
│  │  ├─ config/
│  │  ├─ httpx/
│  │  ├─ database/
│  │  │  └─ oracle/
│  │  ├─ auth/
│  │  ├─ logging/
│  │  └─ audit/
│  ├─ domain/
│  │  ├─ member/
│  │  ├─ skin/
│  │  ├─ preset/
│  │  ├─ scheduling/
│  │  ├─ reservation/
│  │  ├─ compatibility/
│  │  ├─ inventory/
│  │  ├─ chat/
│  │  ├─ iam/
│  │  ├─ payroll/
│  │  └─ health/
│  ├─ transport/
│  │  └─ http/
│  │     ├─ router/
│  │     ├─ middleware/
│  │     └─ handlers/
│  │        ├─ member/
│  │        ├─ skin/
│  │        ├─ preset/
│  │        ├─ reservation/
│  │        ├─ iam/
│  │        └─ health/
│  └─ testutil/
├─ migrations/
├─ deploy/
├─ docs/
├─ go.mod
└─ go.sum
```

## ディレクトリ方針

- `cmd/api`: サーバーのエントリーポイント
- `internal/bootstrap`: アプリ初期化、ルーター組み立て、依存性注入
- `internal/platform`: 環境変数、共通 HTTP 処理、DB 接続、認証、ロギング、監査ログなどの共通インフラ
- `internal/domain`: 機能別のビジネスルールとユースケース
- `internal/transport/http`: HTTP ルーティング、ミドルウェア、ハンドラー
- `internal/testutil`: テスト用スタブ、フィクスチャ、ヘルパー
- `migrations`: Oracle DDL とマイグレーション資産
- `deploy`: Docker、Render デプロイ関連ファイル
- `docs`: サーバー内部設計ドキュメント

## ドメイン構成

- `member`: 会員、受講生/講師プロフィール、受講状態、受講権
- `skin`: 肌情報、希望方向性、化粧品適用範囲データ
- `preset`: メイクアッププリセット作成、更新、参照
- `scheduling`: 講師の予約可能スロット
- `reservation`: 予約、予約コメント、キャンセル基準
- `compatibility`: 肌情報とプリセット/化粧品の適合性判定
- `inventory`: 化粧品在庫
- `chat`: 受講生と講師のチャット
- `iam`: 役割と JSON ベース権限ポリシー
- `payroll`: 授業実績ベース精算
- `health`: ヘルスチェック

## 現在のコード配置方針

現在ルートにあるファイルは、段階的に以下へ移動する前提です。

- `main.go`: `cmd/api` または `internal/bootstrap`
- `health.go`: `internal/domain/health`
- `oracle.go`: `internal/platform/database/oracle`
- `main_test.go`: `internal/domain/health`, `internal/transport/http/handlers/health`

この段階ではディレクトリ構造のみ作成しており、実際のコード移動はまだ行っていません。

## 実行

```bash
go run .
```

デフォルトポートは `8080` で、`PORT` 環境変数で変更できます。

サーバー起動時に `.env` ファイルも自動読み込みします。

- デフォルト: `.env.development`
- `APP_ENV=production` または `GO_ENV=production`: `.env.production`
- すでにプロセス環境変数として設定済みの値がある場合は、その値を優先

Oracle 接続のため、以下の環境変数が必要です。

```bash
DB_USER=...
DB_PASSWORD=...
DB_CONNECTION_STRING=...
```

`DB_CONNECTION_STRING` は `oracle://...` の完全 DSN、別スキームを含む完全 DSN、または `host:port/service_name` 形式を利用できます。

## Health Check

```bash
curl http://localhost:8080/health
```

レスポンス例:

```json
{"status":"ok","database":"connected","storedDate":"2026-03-21","today":"2026-03-21","currentTimestamp":"2026-03-21T09:00:00Z"}
```

ヘルスチェックは Oracle の `HEALTHCHECK_TEST` テーブルを確認します。テーブルがなければ作成して当日の日付を保存します。保存済みの日付が当日と異なる場合は、テーブルを削除して再作成し、当日の日付を再登録します。

## Test

```bash
go test ./...
```

## Docker

```bash
docker build -t my-make-server .
docker run --rm --name my-make-server --env-file .env.development -p 8080:8080 my-make-server
```

サーバーコンテナは `8080:8080` で公開し、ヘルスチェックは `/health` を使用します。
