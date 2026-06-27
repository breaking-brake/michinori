import { Hono } from "hono";
import { GoogleGenAI, Type, FunctionCallingConfigMode } from "@google/genai";
import { ChatRequest, CATEGORY_DEFINITIONS, STATUS_DEFINITIONS } from "@michinori/shared";
import type { DagProposalType } from "@michinori/shared";
import { buildChatSystemPrompt } from "../prompts/chatPrompt.js";
import { logger } from "../utils/logger.js";

const MODEL = "gemini-2.5-flash";

const categoryValues = CATEGORY_DEFINITIONS.map((c) => c.value);
const statusValues = STATUS_DEFINITIONS.map((s) => s.value);

const proposeDagChangesTool = {
  functionDeclarations: [{
    name: "propose_dag_changes",
    description: "Propose specific changes to the project DAG. Call this when the user's intent is clear enough to make concrete modifications. Do NOT call this for general questions or discussions.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        reasoning: { type: Type.STRING, description: "Why these changes are proposed (in Japanese)" },
        additions: {
          type: Type.ARRAY,
          description: "New nodes to add",
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              label: { type: Type.STRING },
              description: { type: Type.STRING },
              estimateMd: { type: Type.NUMBER },
              category: { type: Type.STRING, enum: categoryValues },
              status: { type: Type.STRING, enum: statusValues },
              dependencies: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["id", "label", "description", "estimateMd", "category", "status", "dependencies"],
          },
        },
        removals: {
          type: Type.ARRAY,
          description: "IDs of nodes to remove",
          items: { type: Type.STRING },
        },
        modifications: {
          type: Type.ARRAY,
          description: "Changes to existing nodes",
          items: {
            type: Type.OBJECT,
            properties: {
              nodeId: { type: Type.STRING },
              changes: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  description: { type: Type.STRING },
                  estimateMd: { type: Type.NUMBER },
                  category: { type: Type.STRING, enum: categoryValues },
                  status: { type: Type.STRING, enum: statusValues },
                },
              },
            },
            required: ["nodeId", "changes"],
          },
        },
      },
      required: ["reasoning"],
    },
  }],
};

const chat = new Hono();

chat.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = ChatRequest.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: JSON.stringify(parsed.error.flatten().fieldErrors), code: "VALIDATION_ERROR" },
      400,
    );
  }

  const { message, conversationHistory, currentDag } = parsed.data;
  logger.info("chat:start", { messageLength: message.length, historyLength: conversationHistory.length });

  try {
    const { env } = await import("../config/env.js");
    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

    const systemInstruction = buildChatSystemPrompt(currentDag);

    const contents = [
      ...conversationHistory.map((msg) => ({
        role: msg.role as "user" | "model",
        parts: [{ text: msg.content }],
      })),
      { role: "user" as const, parts: [{ text: message }] },
    ];

    const response = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction,
        tools: [proposeDagChangesTool],
        toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO } },
        temperature: 0.7,
      },
    });

    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];

    const functionCallPart = parts.find((p) => p.functionCall);
    const textParts = parts.filter((p) => p.text).map((p) => p.text).join("");

    let proposal: DagProposalType | null = null;
    let responseMessage = textParts;

    if (functionCallPart?.functionCall?.name === "propose_dag_changes") {
      const args = functionCallPart.functionCall.args as Record<string, unknown>;
      proposal = {
        reasoning: (args.reasoning as string) ?? "",
        additions: (args.additions as DagProposalType["additions"]) ?? [],
        removals: (args.removals as string[]) ?? [],
        modifications: (args.modifications as DagProposalType["modifications"]) ?? [],
      };

      if (!responseMessage) {
        responseMessage = proposal.reasoning || "以下の変更を提案します。";
      }
    }

    if (!responseMessage) {
      responseMessage = "すみません、応答を生成できませんでした。もう一度お試しください。";
    }

    logger.info("chat:done", { hasProposal: !!proposal });

    return c.json({ message: responseMessage, proposal });
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err);
    logger.error("chat:error", { error: errMessage });
    return c.json({ error: errMessage, code: "GEMINI_ERROR" }, 500);
  }
});

export { chat };
