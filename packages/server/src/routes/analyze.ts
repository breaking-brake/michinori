import { Hono } from "hono";
import { AnalyzeRequest } from "@michinori/shared";
import { logger } from "../utils/logger.js";
import { cloneRepo } from "../services/cloner.js";
import { collectFiles, buildFileTreeString, buildCodeContext } from "../services/fileTree.js";
import { cacheRepoFiles } from "../services/repoCache.js";
import { buildPrompt } from "../prompts/dagPrompt.js";
import { generateDag } from "../services/gemini.js";

const analyze = new Hono();

analyze.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = AnalyzeRequest.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: JSON.stringify(parsed.error.flatten().fieldErrors), code: "VALIDATION_ERROR" as const },
      400,
    );
  }

  const { repoUrl, prompt, estimateMode, currentDag } = parsed.data;
  logger.info("analyze:start", { repoUrl, estimateMode, hasCurrentDag: !!currentDag });

  let cloneResult;
  try {
    cloneResult = await cloneRepo(repoUrl);
  } catch {
    return c.json({ error: "Failed to clone repository", code: "CLONE_FAILED" as const }, 400);
  }

  try {
    const files = await collectFiles(cloneResult.dir);
    cacheRepoFiles(repoUrl, files);

    if (files.length === 0) {
      return c.json({ error: "Repository appears empty", code: "INVALID_REPO" as const }, 400);
    }

    const fileTree = buildFileTreeString(files);
    const codeContext = buildCodeContext(files);
    const fullPrompt = buildPrompt(prompt, fileTree, codeContext, currentDag);

    const result = await generateDag(fullPrompt, estimateMode);

    logger.info("analyze:done", { repoUrl, nodeCount: result.nodes.length });

    return c.json({ summary: result.summary, nodes: result.nodes, model: result.model });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("analyze:error", { repoUrl, error: message });
    return c.json({ error: message, code: "GEMINI_ERROR" as const }, 500);
  } finally {
    await cloneResult.cleanup();
  }
});

export { analyze };
