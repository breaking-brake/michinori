# Michinori 機能仕様

## 概要

コードベースの現実から、タスクの全体像・依存関係・完了見込みを一気に可視化するプロジェクト管理ツール。

---

## DAG生成

GitHubパブリックリポジトリのURLとプロンプトを入力すると、AIがコードベースを解析しタスクDAGを自動生成する。

- **入力:** リポジトリURL + 自然言語プロンプト
- **処理:** git clone → ファイル解析（~80K文字予算） → Gemini 2.5 Flash（構造化JSON出力）
- **出力:** ノード（タスク名・工数MD・ステータス・説明）+ エッジ（依存関係）

## DAG修正

既存DAGに対して自然言語で修正指示を送り、Geminiが差分修正したDAGを返す。

## クリティカルパス

- トポロジカルソート（Kahn's Algorithm）+ 最長経路DPで計算
- クリティカルパス上のエッジを赤くハイライト
- 完了予定日: 残りMD → 営業日ベース（土日スキップ）で算出

## ノード操作

- **ステータス:** 未着手 / 進行中 / PR Open / 完了
- **プロパティパネル:** ノードクリックで右パネルを開き、タイトル・ステータス・説明・工数(MD)を編集
- **ドラッグ:** ノード位置を移動、位置は永続化

## 工数

- 単位: MD（man-day, 8h = 1MD）
- 最小単位: 0.1MD
- ステータスによる残工数計算:
  - 未着手: estimateMd × 1.0
  - 進行中: estimateMd × 0.5
  - PR Open: 0
  - 完了: 0

## ファイル保存・読込

- **保存:** 現在のDAGを `.michinori.json` としてダウンロード
- **読込:** `.michinori.json` ファイルをアップロードしてDAGを復元
- **リセット:** 確認ダイアログ後、DAGとキャンバスを初期化

## レートリミット

Gemini API呼び出しのコスト保護。ミドルウェアで `/analyze` ルートのみに適用し、Gemini呼び出し前に拒否する。

- **IP単位:** 5回/分（`RATE_LIMIT_PER_IP` で変更可）
- **グローバル:** 30回/分（`RATE_LIMIT_GLOBAL` で変更可）
- **方式:** インメモリ・スライディングウィンドウ
- **超過時:** HTTP 429 + `Retry-After` ヘッダー
- **制約:** Cloud Runスケールtoゼロ再起動でカウンターリセット（ハッカソン用途では許容）

---

## プラットフォーム

| プラットフォーム | 状態 |
|----------------|------|
| Web App | 実装済み（localhost:3000） |
| VSCode Extension | 実装済み |

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| 共有UI | React Flow, Vite（@michinori/ui） |
| Server | Hono (Node.js), Cloud Run |
| AI | Gemini 2.5 Flash（構造化JSON出力） |
| Infra | Terraform, Artifact Registry |
| Monorepo | pnpm workspace |
