# Michinori

コードベースの現実から、タスクの全体像・依存関係・完了見込みを一気に可視化するプロジェクト計画ツール。

## Architecture

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
│    リポジトリ調査ツール (list_files/read_file/     │
│    search_code) で自律的にコードを確認             │
│                                                   │
│  Middleware: Rate Limit / Geo Block / Daily Quota  │
└───────────────────────────────────────────────────┘
```

## Package Structure

```
packages/
  shared/      Zodスキーマ + クリティカルパス計算 + 型定義
  ui/          共有Reactコンポーネント (DagApp + Adapterパターン)
  server/      Cloud Run API (Hono)
  extension/   VSCode拡張 (薄いアダプタ層)
  web/         スタンドアロンWebアプリ (直接fetch)
```

## Tech Stack

| Layer | Tech |
|-------|------|
| UI | React Flow, Vite, TypeScript |
| Web App | Standalone SPA (`packages/web`) |
| VSCode Extension | VSCode Extension API (`packages/extension`) |
| Shared UI | `packages/ui` — DagApp + DagAdapter pattern |
| Server | Hono (Node.js), Cloud Run |
| AI | Gemini 2.5 Flash (structured output + function calling) |
| Infra | Terraform, Artifact Registry |
| Monorepo | pnpm workspace |

## Commands

- `pnpm install` — install all deps
- `pnpm --filter @michinori/server dev` — start server (requires `.env` with `GEMINI_API_KEY`)
- `pnpm --filter @michinori/web dev` — start web app
- `pnpm --filter michinori-webview build` — build extension webview
- `pnpm --filter @michinori/server typecheck` — type check server
- `pnpm --filter michinori typecheck` — type check extension

## Conventions

- All packages use `"type": "module"` (ESM)
- Run TypeScript via tsx (no compile step for server)
- Extension webview is built with Vite (deterministic filenames, no hashes)
- `.michinori.json` is the single source of truth
- Status/Category definitions live in `packages/shared/src/schema/dag.ts` (single source — adding a new value there propagates to Zod, Gemini prompt, responseSchema, UI colors, and dropdowns)
- API key is server-side only (`GEMINI_API_KEY` in `.env`), never sent from clients
- Repo code context is cached in-memory (30min TTL) from `/analyze`, reused by `/chat` for repo investigation tools

## Tech Debt

- **Daily quota counter is Cloud Storage-based** — single JSON file in GCS bucket. Sufficient for max-instances=1 (hackathon). If scaling to multiple instances, migrate to Firestore or Redis for atomic increments.
