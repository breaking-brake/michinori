# Michinori（道のり）

コードベースの現実から、タスクの全体像・依存関係・完了見込みを一気に可視化するVSCode拡張。

GitHubパブリックリポジトリのURLを入力するだけで、AIがコードベースを解析しDAG（有向非巡回グラフ）を自動生成。クリティカルパスと完了予定日を常時表示し、対話的に修正できます。

## システム構成

```
┌─────────────────────────────────┐
│  VSCode Extension (ローカル)     │
│  ┌────────────┐ ┌─────────────┐ │
│  │ React Flow │ │ SecretStore │ │
│  │ DAG Canvas │ │ (API Key)   │ │
│  └─────┬──────┘ └──────┬──────┘ │
│        │   HTTP POST   │        │
└────────┼───────────────┼────────┘
         │               │
         ▼               ▼
┌─────────────────────────────────┐
│  Cloud Run (Node.js / Hono)     │
│  ┌──────────┐ ┌──────────────┐  │
│  │git clone │ │ Gemini 2.5   │  │
│  │→ 解析    │→│ Flash        │  │
│  │→ チャンク │ │ (構造化出力) │  │
│  └──────────┘ └──────┬───────┘  │
└──────────────────────┼──────────┘
                       │
                       ▼
              .michinori.json
           (DAG: ノード・依存関係)
                       │
                       ▼
            ┌──────────────────┐
            │ クリティカルパス  │
            │ 完了予定日計算    │
            │ (クライアント側)  │
            └──────────────────┘
```

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| Extension | VSCode Extension API, TypeScript |
| Webview | React Flow (DAG描画), Vite |
| Server | Hono (Node.js), Cloud Run |
| AI | Gemini 2.5 Flash (構造化JSON出力) |
| Infra | Terraform, Artifact Registry |
| Monorepo | pnpm workspace |

## 機能

- **DAG自動生成**: リポジトリURLとプロンプトからタスクDAGを生成
- **クリティカルパス表示**: 最長経路を赤くハイライト
- **完了予定日**: 営業日ベースでリアルタイム計算
- **ステータス管理**: ノードクリックで 未着手 → 進行中 → PR Open → 完了 を切り替え
- **対話的修正**: 既存DAGに対して自然言語で修正指示
- **ノードドラッグ**: レイアウト位置を永続化

## セットアップ

### 前提条件

- Node.js 22+
- pnpm 11+
- [Google AI Studio](https://aistudio.google.com/) の APIキー

### ローカル開発

```bash
# 依存関係インストール
pnpm install

# サーバー起動 (localhost:8080)
pnpm --filter @michinori/server dev

# Webviewビルド
pnpm --filter michinori-webview build

# 拡張機能コンパイル
pnpm --filter michinori compile
```

VSCodeで `F5` を押してExtension Development Hostを起動し、コマンドパレットから `Michinori: DAGを生成` を実行。

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

## 使い方

1. コマンドパレットで `Michinori: APIキーを設定` → Google AI StudioのAPIキーを入力
2. `Michinori: DAGを生成` → リポジトリURLと実現したいことを入力
3. AIがコードを解析し、DAGを自動生成
4. ノードをクリックしてステータスを更新 → 完了予定日がリアルタイム更新
5. 「DAGを修正」ボタンで対話的に修正

## ライセンス

AGPL-3.0-only
