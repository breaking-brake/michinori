import { z } from "zod";
import { DagNode, MichinoriFile } from "./dag.js";

export const AnalyzeRequest = z.object({
  repoUrl: z.string().url().startsWith("https://github.com/"),
  prompt: z.string().min(1).max(2000),
  currentDag: MichinoriFile.nullable().default(null),
});
export type AnalyzeRequest = z.infer<typeof AnalyzeRequest>;

export const AnalyzeResponse = z.object({
  nodes: z.array(DagNode),
  model: z.string(),
});
export type AnalyzeResponse = z.infer<typeof AnalyzeResponse>;

export const ErrorResponse = z.object({
  error: z.string(),
  code: z.enum([
    "VALIDATION_ERROR",
    "CLONE_FAILED",
    "GEMINI_ERROR",
    "INVALID_REPO",
    "REPO_TOO_LARGE",
    "INTERNAL_ERROR",
  ]),
});
export type ErrorResponse = z.infer<typeof ErrorResponse>;
