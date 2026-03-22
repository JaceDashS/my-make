# マイメイク（マメ）

メイクアップ学園のための統合運営システムです。
本リポジトリは、**【第11期】日本ITチャレンジプロジェクトの開発課題**として進めているプロジェクトです。

## 概要

マイメイク（マメ）は、生徒ごとに異なる肌状態や希望する方向性に応じて発生する講師側の準備・判断業務をシステム化し、業務負担を軽減することを目的としたシステムです。
会員管理、受講回数管理、予約管理、メイクアッププリセット管理、講師とのチャット、権限管理、精算管理、監査ログ管理を一元的に扱います。

## 主な機能

* 生徒・講師の基本情報管理
* 受講回数の追加、残回数管理、使用回数差し引き
* 生徒の肌情報および希望方向性の管理
* 肌情報に基づく化粧品適用範囲データ管理
* 講師用メイクアッププリセットの作成・修正・再利用
* レッスン予約および予約時の適合性確認
* 予約コメント入力
* 講師による予約後確認および組み合わせ調整
* 生徒と講師のチャット
* IAM類似のJSONベース権限管理
* 授業実績ベースの精算
* 改ざん不可の監査ログ管理

## 技術スタック

* Client: React Native + TypeScript
* Server: Go
* Database: Oracle
* Demo Environment: Render

## 開発時のポート

* Client: React Native Metro Bundler は `8081` を使用
* Server: Go API サーバーは `8080` を使用
* クライアントからサーバーへ接続する場合は `http://localhost:8080` を基準とする
* サーバーポートは `PORT` 環境変数で変更可能
* Docker ではサーバーコンテナの内部ポートとホスト公開ポートの両方に `8080` を使用

## 開発コマンド

* `npm run dev` は Metro と Go サーバーを起動し、現在ホストで実行可能なクライアントターゲット状況を表示する
* `npm run dev:android` は Android 開発起動を試行する
* `npm run dev:ios` は iOS 実行可否を確認する。Windows ホストでは iPhone シミュレーターは実行できない
* `npm run dev:windows:check` は Windows ターゲット設定有無を確認する
* `npm run dev:windows` は Metro、Go サーバー、Windows クライアント起動を試行する
* `npm run dev:macos` は macOS ターゲット設定有無を確認する。現在このリポジトリでは未設定

## Docker

* サーバー用 Docker ファイルは `server` ディレクトリ内で管理する
* サーバーコンテナは `8080:8080` で公開し、`/health` をヘルスチェックに使用する
* Oracle 接続には `DB_USER` `DB_PASSWORD` `DB_CONNECTION_STRING` が必要
* 直接実行する場合は `docker build -t my-make-server ./server` と `docker run --rm --name my-make-server --env-file server/.env.development -p 8080:8080 my-make-server`
* ルートからは `npm run server:docker:build` `npm run server:docker:up` `npm run server:docker:down` を使用できる

## アーキテクチャ

* 単一サーバーのモノリシック構成
* 現段階ではスケーリングは考慮しない
* 機能ごとに内部責務を分離した構造
* Renderデモ環境では10分単位の外部ヘルスチェックを前提に運用

## ドキュメント

詳細な機能定義、運用ルール、アーキテクチャ、システム仕様については、設計文書および関連ドキュメントを参照してください.
