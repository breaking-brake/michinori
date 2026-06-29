import { CATEGORY_DEFINITIONS } from "@michinori/shared";
import type { MichinoriFileType, EstimateModeType } from "@michinori/shared";

const categoryPrompt = CATEGORY_DEFINITIONS
  .map((c) => `"${c.value}" (${c.description})`)
  .join(", ");

const BASE_RULES = `RULES:
- Each task is a self-contained unit of work (for "実装" tasks, this typically maps to one PR)
- Generate 5-20 tasks depending on project complexity
- Choose the appropriate category for each task based on its nature
- Every dependency ID must reference another node's ID in the same output
- Dependencies MUST form a DAG (no circular references)
- Consider the actual codebase structure — don't ignore existing code
- Root tasks (no dependencies) represent work that can start immediately
- Leaf tasks (nothing depends on them) represent final deliverables
- Use Japanese for labels and descriptions`;

function buildSystemPrompt(estimateMode: EstimateModeType): string {
  const estimateField = estimateMode === "sp"
    ? `- estimate: story points (relative sizing). Use Fibonacci values only: 1, 2, 3, 5, 8, 13`
    : `- estimate: realistic time estimate in man-days (1 MD = 8 hours). Use 0.1 MD increments (e.g. 0.5, 1.0, 2.5)`;

  const granularity = estimateMode === "sp"
    ? `- Tasks should be granular enough to be actionable (1-13 SP each)`
    : `- Tasks should be granular enough to be actionable (0.5-5 MD each)`;

  return `You are a project planning AI. Analyze the provided codebase and generate a project DAG (Directed Acyclic Graph) of implementation tasks.

OUTPUT FORMAT:
Return a JSON object with:
- summary: a short phrase (under 20 characters, Japanese) describing the project goal (e.g. "認証機能の実装", "ハッカソン入稿準備")
- nodes: an array of task nodes. Each node has:
- id: unique kebab-case identifier (e.g. "setup-auth", "create-user-api")
- label: short task name (Japanese is preferred)
- description: 1-2 sentence explanation of what the task involves
${estimateField}
- category: one of ${categoryPrompt}
- status: always "未着手" for new tasks
- dependencies: array of prerequisite task IDs (MUST form a DAG — no cycles)

${BASE_RULES}
${granularity}`;
}

export function buildPrompt(
  userPrompt: string,
  fileTree: string,
  codeContext: string,
  currentDag: MichinoriFileType | null,
): string {
  const parts: string[] = [];

  parts.push(`## User Request\n${userPrompt}`);
  parts.push(`## File Tree\n\`\`\`\n${fileTree}\n\`\`\``);
  parts.push(`## Code Context\n${codeContext}`);

  if (currentDag) {
    parts.push(`## Current DAG (modify this)\n\`\`\`json\n${JSON.stringify(currentDag.nodes, null, 2)}\n\`\`\`\n\nThe user wants to modify the existing DAG above. Preserve IDs of unchanged tasks. Only add, remove, or modify tasks as instructed.`);
  }

  return parts.join("\n\n");
}

export { buildSystemPrompt };
