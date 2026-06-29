import { GoogleGenAI, Type } from "@google/genai";
import { DagNode, CATEGORY_DEFINITIONS, STATUS_DEFINITIONS } from "@michinori/shared";
import type { EstimateModeType } from "@michinori/shared";
import { buildSystemPrompt } from "../prompts/dagPrompt.js";
import { logger } from "../utils/logger.js";

const MODEL = "gemini-2.5-flash";

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    nodes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          label: { type: Type.STRING },
          description: { type: Type.STRING },
          estimate: { type: Type.NUMBER },
          category: { type: Type.STRING, enum: CATEGORY_DEFINITIONS.map((c) => c.value) },
          status: { type: Type.STRING, enum: STATUS_DEFINITIONS.map((s) => s.value) },
          dependencies: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["id", "label", "description", "estimate", "category", "status", "dependencies"],
      },
    },
  },
  required: ["summary", "nodes"],
};

export interface GenerateDagResult {
  summary: string;
  nodes: Array<ReturnType<typeof DagNode.parse>>;
  model: string;
}

export async function generateDag(
  userPrompt: string,
  estimateMode: EstimateModeType = "md",
): Promise<GenerateDagResult> {
  const { env } = await import("../config/env.js");
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

  const systemInstruction = buildSystemPrompt(estimateMode);

  logger.info("gemini:call", { model: MODEL, estimateMode, promptLength: userPrompt.length });

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: userPrompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.7,
    },
  });

  const text = response.text ?? "";
  logger.info("gemini:response", { responseLength: text.length });

  const parsed = JSON.parse(text) as { summary: string; nodes: unknown[] };

  const nodes = parsed.nodes.map((n) => DagNode.parse(n));

  validateDag(nodes);

  return { summary: parsed.summary, nodes, model: MODEL };
}

function validateDag(nodes: Array<ReturnType<typeof DagNode.parse>>): void {
  const ids = new Set(nodes.map((n) => n.id));

  for (const node of nodes) {
    for (const dep of node.dependencies) {
      if (!ids.has(dep)) {
        throw new Error(`Node "${node.id}" depends on unknown node "${dep}"`);
      }
    }
  }

  const visited = new Set<string>();
  const stack = new Set<string>();
  const adj = new Map<string, string[]>();
  for (const node of nodes) {
    adj.set(node.id, node.dependencies);
  }

  function hasCycle(id: string): boolean {
    if (stack.has(id)) return true;
    if (visited.has(id)) return false;
    visited.add(id);
    stack.add(id);
    for (const dep of adj.get(id) ?? []) {
      if (hasCycle(dep)) return true;
    }
    stack.delete(id);
    return false;
  }

  for (const node of nodes) {
    if (hasCycle(node.id)) {
      throw new Error("DAG contains a cycle");
    }
  }
}
