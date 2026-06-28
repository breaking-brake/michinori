import { Hono } from "hono";
import { GoogleGenAI, Type, FunctionCallingConfigMode, type FunctionDeclaration, type Content } from "@google/genai";
import { ChatRequest } from "@michinori/shared";
import type { DagProposalType } from "@michinori/shared";
import { buildChatSystemPrompt } from "../prompts/chatPrompt.js";
import { getRepoFiles } from "../services/repoCache.js";
import type { FileEntry } from "../services/fileTree.js";
import { logger } from "../utils/logger.js";

const MODEL = "gemini-2.5-flash";
const MAX_TOOL_ROUNDS = 5;

const proposeDagChangesTool: FunctionDeclaration = {
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
        description: `A JSON string with the structure: { "additions": [{ "id": "kebab-id", "label": "タスク名", "description": "説明", "estimateMd": 1.0, "category": "実装", "status": "未着手", "dependencies": [], "position": { "x": 0, "y": 0 } }], "removals": ["node-id-to-remove"], "modifications": [{ "nodeId": "existing-id", "changes": { "label": "新名", "estimateMd": 2.0, "position": { "x": 100, "y": 200 } } }] }. All arrays are optional, include only what changes. position is optional — include it only when the user explicitly asks to adjust layout.`,
      },
    },
    required: ["reasoning", "proposal_json"],
  },
};

function buildRepoToolDeclarations(): FunctionDeclaration[] {
  return [
    {
      name: "list_files",
      description: "List file paths in the repository. Use to understand the project structure.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          directory: { type: Type.STRING, description: "Directory prefix to filter (e.g. 'src/', 'packages/server'). Empty string for all files." },
        },
        required: ["directory"],
      },
    },
    {
      name: "read_file",
      description: "Read the content of a specific file in the repository.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          path: { type: Type.STRING, description: "File path relative to repo root (e.g. 'src/index.ts', 'README.md')" },
        },
        required: ["path"],
      },
    },
    {
      name: "search_code",
      description: "Search for a keyword or pattern across all repository files. Returns matching file paths and line snippets.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: { type: Type.STRING, description: "Search keyword or pattern (case-insensitive substring match)" },
        },
        required: ["query"],
      },
    },
  ];
}

function handleRepoTool(name: string, args: Record<string, unknown>, files: FileEntry[]): string {
  switch (name) {
    case "list_files": {
      const dir = (args.directory as string) ?? "";
      const matched = files
        .filter((f) => !dir || f.path.startsWith(dir))
        .map((f) => f.path);
      return matched.length > 0
        ? matched.join("\n")
        : `No files found under "${dir}"`;
    }
    case "read_file": {
      const path = (args.path as string) ?? "";
      const file = files.find((f) => f.path === path);
      return file ? file.content : `File not found: ${path}`;
    }
    case "search_code": {
      const query = ((args.query as string) ?? "").toLowerCase();
      const results: string[] = [];
      for (const file of files) {
        const lines = file.content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(query)) {
            results.push(`${file.path}:${i + 1}: ${lines[i].trimStart()}`);
            if (results.length >= 30) break;
          }
        }
        if (results.length >= 30) break;
      }
      return results.length > 0
        ? results.join("\n")
        : `No matches found for "${query}"`;
    }
    default:
      return `Unknown tool: ${name}`;
  }
}

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

  const { message, repoUrl, conversationHistory, currentDag } = parsed.data;
  logger.info("chat:start", { messageLength: message.length, historyLength: conversationHistory.length, hasRepoUrl: !!repoUrl });

  try {
    const { env } = await import("../config/env.js");
    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

    let repoFiles: FileEntry[] | null = null;
    if (repoUrl) {
      try {
        repoFiles = await getRepoFiles(repoUrl);
        logger.info("chat:repoLoaded", { repoUrl, fileCount: repoFiles.length });
      } catch (err) {
        logger.warn("chat:repoLoadFailed", { repoUrl, error: String(err) });
      }
    }

    const systemInstruction = buildChatSystemPrompt(currentDag, !!repoFiles);

    const tools = [{
      functionDeclarations: [
        proposeDagChangesTool,
        ...(repoFiles ? buildRepoToolDeclarations() : []),
      ],
    }];

    const contents: Content[] = [
      ...conversationHistory.map((msg) => ({
        role: msg.role as "user" | "model",
        parts: [{ text: msg.content }],
      })),
      { role: "user" as const, parts: [{ text: message }] },
    ];

    let proposal: DagProposalType | null = null;
    let responseMessage = "";

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents,
        config: {
          systemInstruction,
          tools,
          toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO } },
          temperature: 0.7,
        },
      });

      const candidate = response.candidates?.[0];
      const parts = candidate?.content?.parts ?? [];

      logger.info("chat:round", {
        round,
        partsCount: parts.length,
        partTypes: parts.map((p) => {
          if (p.functionCall) return `functionCall:${p.functionCall.name}`;
          if (p.text) return `text(${p.text.length}chars)`;
          return "other";
        }),
      });

      const textParts = parts.filter((p) => p.text).map((p) => p.text).join("");
      const functionCalls = parts.filter((p) => p.functionCall);

      if (functionCalls.length === 0) {
        responseMessage = textParts;
        break;
      }

      const dagProposalCall = functionCalls.find((p) => p.functionCall!.name === "propose_dag_changes");
      if (dagProposalCall) {
        const fnArgs = (dagProposalCall.functionCall!.args ?? {}) as Record<string, unknown>;
        const reasoning = (fnArgs.reasoning as string) ?? "";
        const proposalJsonStr = (fnArgs.proposal_json as string) ?? "{}";
        logger.info("chat:function_call", { reasoning, proposalJson: proposalJsonStr.slice(0, 500) });

        try {
          const p = JSON.parse(proposalJsonStr) as {
            additions?: DagProposalType["additions"];
            removals?: string[];
            modifications?: DagProposalType["modifications"];
          };
          proposal = {
            reasoning,
            additions: p.additions ?? [],
            removals: p.removals ?? [],
            modifications: p.modifications ?? [],
          };
        } catch (parseErr) {
          logger.error("chat:proposal_parse_error", { error: String(parseErr), raw: proposalJsonStr.slice(0, 300) });
          proposal = { reasoning, additions: [], removals: [], modifications: [] };
        }

        responseMessage = textParts || reasoning || "以下の変更を提案します。";
        break;
      }

      const repoToolCalls = functionCalls.filter(
        (p) => repoFiles && ["list_files", "read_file", "search_code"].includes(p.functionCall!.name!),
      );

      if (repoToolCalls.length > 0 && repoFiles) {
        const functionResponses = repoToolCalls.map((p) => {
          const fnName = p.functionCall!.name!;
          const fnArgs = (p.functionCall!.args ?? {}) as Record<string, unknown>;
          const toolResult = handleRepoTool(fnName, fnArgs, repoFiles);
          logger.info("chat:repoTool", { tool: fnName, resultLength: toolResult.length });
          return { functionResponse: { name: fnName, response: { result: toolResult } } };
        });

        contents.push(
          { role: "model" as const, parts },
          { role: "user" as const, parts: functionResponses },
        );
        continue;
      }

      responseMessage = textParts || "すみません、応答を生成できませんでした。";
      break;
    }

    if (!responseMessage) {
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
