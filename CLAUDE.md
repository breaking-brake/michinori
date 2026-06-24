# Michinori

コードベースの現実から、タスクの全体像・依存関係・完了見込みを一気に可視化するVSCode拡張。

## Tech Stack

- **Monorepo:** pnpm workspace
- **Server:** Hono + Node.js on Cloud Run, Gemini 2.5 Flash via @google/genai
- **Extension:** VSCode Extension API + React Flow webview (Vite)
- **Shared:** Zod schemas for .michinori.json + API contracts
- **Infra:** Terraform (Cloud Run + Artifact Registry)
- **Language:** TypeScript (ES2022, NodeNext)

## Commands

- `pnpm install` — install all deps
- `pnpm --filter @michinori/server dev` — start server in dev mode
- `pnpm --filter @michinori/server typecheck` — type check server
- `pnpm --filter @michinori/extension typecheck` — type check extension

## Conventions

- All packages use `"type": "module"` (ESM)
- Run TypeScript via tsx (no compile step for server)
- Extension webview is built with Vite (deterministic filenames, no hashes)
- .michinori.json is the single source of truth between extension and server
