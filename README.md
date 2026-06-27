# Michinori（道のり）

コードベースの現実から、タスクの全体像・依存関係・完了見込みを一気に可視化するプロジェクト計画ツール。

GitHubパブリックリポジトリのURLを入力するだけで、AIがコードベースを解析しDAG（有向非巡回グラフ）を自動生成。クリティカルパスと完了予定日を常時表示し、AIチャットで対話的に修正できます。

## システム構成

```
┌─────────────────────────────────────────────────┐
│           Client (Web App / VSCode Extension)    │
│  ┌──────────────┐  ┌───────────┐  ┌──────────┐ │
│  │ React Flow   │  │ AI相談    │  │ 稼働日   │ │
│  │ DAG Canvas   │  │ ChatPanel │  │ Calendar │ │
│  └──────┬───────┘  └─────┬─────┘  └──────────┘ │
│         │    HTTP POST    │                      │
└─────────┼────────────────┼──────────────────────┘
          │                │
          ▼                ▼
┌─────────────────────────────────────────────────┐
│           Cloud Run (Node.js / Hono)             │
│                                                   │
│  POST /analyze ── 初回DAG生成                     │
│    git clone → ファイル解析 → Gemini (構造化出力)  │
│                                                   │
│  POST /chat ── AIアシスタント (tool-use)           │
│    会話 + DAG → Gemini → 提案 → ユーザー承認      │
│                                                   │
│  Middleware: Rate Limit / Geo Block               │
└───────────────────────────────────────────────────┘
```

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| UI | React Flow, Vite, TypeScript |
| Web App | スタンドアロンSPA (`packages/web`) |
| VSCode Extension | VSCode Extension API (`packages/extension`) |
| 共有UIコンポーネント | `packages/ui` (DagApp + Adapter パターン) |
| Server | Hono (Node.js), Cloud Run |
| AI | Gemini 2.5 Flash (構造化出力 + Function Calling) |
| Infra | Terraform, Artifact Registry |
| Monorepo | pnpm workspace |

## 機能

### DAG生成・修正
- **DAG自動生成:** リポジトリURLとプロンプトからタスクDAGを生成
- **AI相談 (チャット):** 自然言語でDAGの修正を相談、プレビュー→承認で反映
- **クリティカルパス:** 最長経路を赤くハイライト、完了予定日を常時表示

### キャンバス操作
- **ノード追加/削除:** ボタンでノード追加、❌ボタンで削除
- **エッジ追加/削除:** ハンドルからドラッグ接続、❌ボタンで削除
- **プロパティパネル:** ノードクリックで右パネル（タイトル・ステータス・カテゴリ・説明・工数を編集）
- **ドラッグ&ドロップ:** ノード位置を自由に配置・永続化

### タスク属性
- **ステータス:** 未着手 / 進行中 / PR Open / 完了
- **カテゴリ:** 実装 / 調査 / 設計 / テスト / その他
- **工数:** MD単位（0.1MD刻み、1MD = 8時間）

### スケジュール
- **完了予定日:** クリティカルパスの残りMD × 営業日で自動計算
- **稼働日カレンダー:** 祝日対応（@holiday-jp）、プリセット（平日稼働/休日稼働）

### ファイル管理
- **保存:** DAGを `.michinori.json` としてダウンロード
- **読込:** `.michinori.json` ファイルをアップロードして復元

### セキュリティ
- **レートリミット:** IP単位5回/分、グローバル30回/分
- **Geoブロック:** 日本国外からのアクセスを制限

## セットアップ

### 前提条件

- Node.js 22+
- pnpm 11+
- Gemini APIキー（サーバー側 `.env` に設定）

### ローカル開発

```bash
# 依存関係インストール
pnpm install

# サーバー用 .env を作成
cp packages/server/.env.example packages/server/.env
# GEMINI_API_KEY を設定

# サーバー起動 (localhost:8080)
pnpm --filter @michinori/server dev

# Web版 起動 (localhost:3000)
pnpm --filter @michinori/web dev
```

### VSCode拡張の開発

```bash
# Webviewビルド
pnpm --filter michinori-webview build

# F5 で Extension Development Host 起動
```

### Cloud Runデプロイ

```bash
# 1. Terraformでインフラ構築
cd infra
cp terraform.tfvars.example terraform.tfvars
# terraform.tfvars を編集
terraform init
terraform apply

# 2. Dockerイメージビルド & デプロイ
cd ..
gcloud builds submit --tag $(terraform -chdir=infra output -raw artifact_registry)/server:latest
gcloud run deploy michinori-api \
  --image $(terraform -chdir=infra output -raw artifact_registry)/server:latest \
  --region asia-northeast1 \
  --allow-unauthenticated
```

## パッケージ構成

```
packages/
  shared/      Zodスキーマ + クリティカルパス計算 + 型定義
  ui/          共有Reactコンポーネント (DagApp + Adapterパターン)
  server/      Cloud Run API (Hono)
  extension/   VSCode拡張 (薄いアダプタ層)
  web/         スタンドアロンWebアプリ (直接fetch)
```

## ライセンス

AGPL-3.0-only
