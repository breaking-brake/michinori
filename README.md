# Michinori（道のり）

コードベースの現実から、タスクの全体像・依存関係・完了見込みを一気に可視化するプロジェクト計画ツール。

## できること

GitHubリポジトリのURLと「やりたいこと」を入力するだけで、AIがコードを読み取ってタスクDAGを自動生成します。

- **タスクの全体像を把握** — AIがコードを解析し、何をどの順でやるべきか構造化
- **完了予定日がわかる** — クリティカルパスから営業日ベースで自動算出、ステータス変更で即時更新
- **AIと相談しながら調整** — チャットでDAGの修正を提案→プレビュー→承認の安全なフロー
- **手動でも自由に編集** — ノードの追加/削除、接続の変更、工数・カテゴリ・ステータスの編集
- **稼働日をカスタマイズ** — 祝日対応カレンダー、平日稼働/休日稼働プリセット
- **保存と共有** — `.michinori.json` ファイルとしてエクスポート/インポート

## 使い方

1. リポジトリURLと実現したいことを入力
2. AIがコードを解析してタスクDAGを生成
3. ノードをクリックしてプロパティを編集、ステータスを更新
4. 「AI相談」で対話的にDAGを修正
5. 完了予定日はリアルタイムに再計算

## セットアップ

### 前提条件

- Node.js 22+
- pnpm 11+

### Web版で試す

```bash
pnpm install

# サーバー用 .env を作成
cp packages/server/.env.example packages/server/.env
# GEMINI_API_KEY を設定

# サーバー起動 (localhost:8080)
pnpm --filter @michinori/server dev

# Web版 起動 (localhost:3000)
pnpm --filter @michinori/web dev
```

### VSCode拡張として使う

```bash
pnpm --filter michinori-webview build
# F5 で Extension Development Host 起動
```

## ライセンス

AGPL-3.0-only
