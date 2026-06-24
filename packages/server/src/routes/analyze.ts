import { Hono } from "hono";
import { AnalyzeRequest } from "@michinori/shared";
import { logger } from "../utils/logger.js";

const analyze = new Hono();

analyze.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = AnalyzeRequest.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: parsed.error.flatten().fieldErrors, code: "VALIDATION_ERROR" as const },
      400,
    );
  }

  const { repoUrl, prompt, apiKey, currentDag } = parsed.data;
  logger.info("analyze:start", { repoUrl, hasCurrentDag: !!currentDag });

  // TODO: Phase 1で実装
  // 1. git clone
  // 2. ファイルツリー解析
  // 3. プロンプト組み立て
  // 4. Gemini呼び出し

  return c.json({ error: "Not implemented yet", code: "INTERNAL_ERROR" as const }, 501);
});

export { analyze };
