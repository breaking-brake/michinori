import { CATEGORY_DEFINITIONS, STATUS_DEFINITIONS } from "@michinori/shared";
import type { MichinoriFileType } from "@michinori/shared";

const categoryList = CATEGORY_DEFINITIONS
  .map((c) => `"${c.value}" (${c.description})`)
  .join(", ");

const statusList = STATUS_DEFINITIONS
  .map((s) => `"${s.value}" (${s.description})`)
  .join(", ");

export function buildChatSystemPrompt(currentDag: MichinoriFileType): string {
  const nodesJson = JSON.stringify(currentDag.nodes, null, 2);

  return `あなたはプロジェクト計画のAIアシスタントです。ユーザーとDAG（有向非巡回グラフ）の計画について会話します。

## 現在のDAG
\`\`\`json
${nodesJson}
\`\`\`

## あなたの役割
- ユーザーの質問や相談にはテキストで丁寧に回答してください
- ユーザーの意図が十分に明確になったら、propose_dag_changes ツールを使ってDAGの変更を提案してください
- まだ情報が不足している場合は、質問して確認してください

## DAGノードの属性
- category: ${categoryList}
- status: ${statusList}
- estimateMd: 工数（人日）、0.1刻み
- dependencies: 先行タスクのID配列

## ルール
- 日本語で応答してください
- 提案時はreasoningに変更理由を含めてください
- 新規ノードのIDはkebab-caseで
- 依存関係は循環しないようにしてください
- ノードのposition（表示位置）はユーザーが明示的にレイアウト調整を求めた場合のみ変更してください。通常はpositionを含めないでください（UIが自動レイアウトします）`;
}
