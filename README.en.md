[日本語](README.md)

# Michinori（道のり）

With the rise of AI Coding, developers can now tackle larger units of work.
However, the wider the scope, the harder it becomes to predict when things will be done.

Michinori lets AI read the codebase directly to break work into right-sized tasks, automatically visualizing dependencies and estimated completion dates.
Grasp the full picture of progress at a glance, share it with your team, and keep building.

**Web (Demo)** — Try it instantly in the browser. No installation required.

**VSCode Extension (In Development)** — Integrated into your development environment for day-to-day project planning.

## Features

Just enter a GitHub repository URL and describe what you want to accomplish. AI reads the code and generates a task DAG automatically.

- **See the full picture** — AI analyzes the codebase and structures what to do and in what order
- **Know when it's done** — Completion date auto-calculated from the critical path on business days, updated instantly on status change
- **Refine with AI** — Chat to propose DAG changes → preview → approve, a safe workflow. AI can investigate your repository's source code to autonomously determine task completion status
- **Edit freely by hand** — Add/remove nodes, change connections, edit estimates, categories, and statuses
- **Customize working days** — Holiday-aware calendar with weekday/weekend work presets
- **Save and share** — Export/import as `.michinori.json` files

## How to Use

1. Enter a repository URL and describe what you want to achieve
2. AI analyzes the code and generates a task DAG
3. Click nodes to edit properties and update statuses
4. Use "AI Chat" to interactively refine the DAG
5. Completion date recalculates in real time

## Setup

### Prerequisites

- Node.js 22+
- pnpm 11+

### Try the Web Version

```bash
pnpm install

# Create server .env
cp packages/server/.env.example packages/server/.env
# Set GEMINI_API_KEY

# Start server (localhost:8080)
pnpm --filter @michinori/server dev

# Start web app (localhost:3000)
pnpm --filter @michinori/web dev
```

### Use as VSCode Extension

```bash
pnpm --filter michinori-webview build
# Press F5 to launch Extension Development Host
```

## Future Vision

- Local workspace support in the VSCode extension
- Auto-update statuses from commit and PR activity
- Export tasks to JIRA
- Seamless planning-to-implementation experience through [CC Workflow Studio](https://github.com/breaking-brake/cc-wf-studio) integration
- etc.

## License

AGPL-3.0-only
