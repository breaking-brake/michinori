import { Hono } from "hono";
import { GoogleGenAI, Type, FunctionCallingConfigMode } from "@google/genai";
import { ChatRequest } from "@michinori/shared";
import type { DagProposalType } from "@michinori/shared";
import { buildChatSystemPrompt } from "../prompts/chatPrompt.js";
import { logger } from "../utils/logger.js";

const MODEL = "gemini-2.5-flash";

const proposeDagChangesTool = {
  functionDeclarations: [{
    name: "propose_dag_changes",
    description: "Propose specific changes to the project DAG. Call this when the user's intent is clear enough to make concrete modifications. Do NOT call this for general questions or discussions.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        reasoning: {
          type: Type.STRING,
          description: "Why these changes are proposed (in Japanese)",
        },
        proposal_json: {
          type: Type.STRING,
          description: `A JSON string with the structure: { "additions": [{ "id": "kebab-id", "label": "タスク名", "description": "説明", "estimateMd": 1.0, "category": "実装", "status": "未着手", "dependencies": [] }], "removals": ["node-id-to-remove"], "modifications": [{ "nodeId": "existing-id", "changes": { "label": "新名", "estimateMd": 2.0 } }] }. All arrays are optional, include only what changes.`,
        },
      },
      required: ["reasoning", "proposal_json"],
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

    logger.info("chat:raw_response", {
      finishReason: candidate?.finishReason,
      partsCount: parts.length,
      partTypes: parts.map((p) => {
        if (p.functionCall) return `functionCall:${p.functionCall.name}`;
        if (p.text) return `text(${p.text.length}chars)`;
        return "other";
      }),
    });

    const functionCallPart = parts.find((p) => p.functionCall);
    const textParts = parts.filter((p) => p.text).map((p) => p.text).join("");

    let proposal: DagProposalType | null = null;
    let responseMessage = textParts;

    if (functionCallPart?.functionCall?.name === "propose_dag_changes") {
      const args = functionCallPart.functionCall.args as Record<string, unknown>;
      const reasoning = (args.reasoning as string) ?? "";
      const proposalJsonStr = (args.proposal_json as string) ?? "{}";

      logger.info("chat:function_call", { reasoning, proposalJson: proposalJsonStr.slice(0, 500) });

      try {
        const parsed = JSON.parse(proposalJsonStr) as {
          additions?: DagProposalType["additions"];
          removals?: string[];
          modifications?: DagProposalType["modifications"];
        };
        proposal = {
          reasoning,
          additions: parsed.additions ?? [],
          removals: parsed.removals ?? [],
          modifications: parsed.modifications ?? [],
        };
      } catch (parseErr) {
        logger.error("chat:proposal_parse_error", { error: String(parseErr), raw: proposalJsonStr.slice(0, 300) });
        proposal = { reasoning, additions: [], removals: [], modifications: [] };
      }

      if (!responseMessage) {
        responseMessage = reasoning || "以下の変更を提案します。";
      }
    }

    if (!responseMessage) {
      logger.warn("chat:empty_response", {
        candidateExists: !!candidate,
        contentExists: !!candidate?.content,
        partsRaw: JSON.stringify(parts).slice(0, 500),
      });
      responseMessage = "すみません、応答を生成できませんでした。もう一度お試しください。";
    }

    logger.info("chat:done", { hasProposal: !!proposal, messageLength: responseMessage.length });

    return c.json({ message: responseMessage, proposal });
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : String(err);
    logger.error("chat:error", { error: errMessage });
    return c.json({ error: errMessage, code: "GEMINI_ERROR" }, 500);
  }
});

export { chat };
