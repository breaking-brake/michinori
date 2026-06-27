import { CATEGORY_DEFINITIONS } from "@michinori/shared";
import type { MichinoriFileType } from "@michinori/shared";

const categoryPrompt = CATEGORY_DEFINITIONS
  .map((c) => `"${c.value}" (${c.description})`)
  .join(", ");

const SYSTEM_PROMPT = `You are a project planning AI. Analyze the provided codebase and generate a project DAG (Directed Acyclic Graph) of implementation tasks.

OUTPUT FORMAT:
Return a JSON object with a single "nodes" array. Each node has:
- id: unique kebab-case identifier (e.g. "setup-auth", "create-user-api")
- label: short task name (Japanese is preferred)
- description: 1-2 sentence explanation of what the task involves
- estimateMd: realistic time estimate in man-days (1 MD = 8 hours). Use 0.1 MD increments (e.g. 0.5, 1.0, 2.5)
- category: one of ${categoryPrompt}
- status: always "未着手" for new tasks
- dependencies: array of prerequisite task IDs (MUST form a DAG — no cycles)

RULES:
- Each task is a self-contained unit of work (for "実装" tasks, this typically maps to one PR)
- Generate 5-20 tasks depending on project complexity
- Tasks should be granular enough to be actionable (0.5-5 MD each)
- Choose the appropriate category for each task based on its nature
- Every dependency ID must reference another node's ID in the same output
- Dependencies MUST form a DAG (no circular references)
- Consider the actual codebase structure — don't ignore existing code
- Root tasks (no dependencies) represent work that can start immediately
- Leaf tasks (nothing depends on them) represent final deliverables
- Use Japanese for labels and descriptions`;

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

export { SYSTEM_PROMPT };
