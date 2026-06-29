import { z } from "zod";
import { DagNode, EstimateMode, MichinoriFile } from "./dag.js";

export const AnalyzeRequest = z.object({
  repoUrl: z.string().url().startsWith("https://github.com/"),
  prompt: z.string().min(1).max(2000),
  estimateMode: EstimateMode.default("md"),
  currentDag: MichinoriFile.nullable().default(null),
});
export type AnalyzeRequest = z.infer<typeof AnalyzeRequest>;

export const AnalyzeResponse = z.object({
  summary: z.string(),
  nodes: z.array(DagNode),
  model: z.string(),
});
export type AnalyzeResponse = z.infer<typeof AnalyzeResponse>;

// --- Chat API ---

const ChatMessageRole = z.enum(["user", "model"]);

export const DagProposal = z.object({
  reasoning: z.string(),
  additions: z.array(DagNode).default([]),
  removals: z.array(z.string()).default([]),
  modifications: z.array(z.object({
    nodeId: z.string(),
    changes: z.object({
      label: z.string().optional(),
      description: z.string().optional(),
      estimate: z.number().optional(),
      category: z.string().optional(),
      status: z.string().optional(),
      position: z.object({ x: z.number(), y: z.number() }).optional(),
    }),
  })).default([]),
});
export type DagProposal = z.infer<typeof DagProposal>;

export const ChatRequest = z.object({
  message: z.string().min(1).max(2000),
  repoUrl: z.string().url().startsWith("https://github.com/").optional(),
  conversationHistory: z.array(z.object({
    role: ChatMessageRole,
    content: z.string(),
  })).default([]),
  currentDag: MichinoriFile,
});
export type ChatRequest = z.infer<typeof ChatRequest>;

export const ChatResponse = z.object({
  message: z.string(),
  proposal: DagProposal.nullable().default(null),
});
export type ChatResponse = z.infer<typeof ChatResponse>;

// --- Error ---

export const ErrorResponse = z.object({
  error: z.string(),
  code: z.enum([
    "VALIDATION_ERROR",
    "CLONE_FAILED",
    "GEMINI_ERROR",
    "INVALID_REPO",
    "REPO_TOO_LARGE",
    "INTERNAL_ERROR",
    "DAILY_QUOTA_EXCEEDED",
  ]),
});
export type ErrorResponse = z.infer<typeof ErrorResponse>;
