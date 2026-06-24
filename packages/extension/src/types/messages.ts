import type { DagNodeType, DagDerivedType } from "@michinori/shared";

export type ExtensionToWebview =
  | { type: "dagUpdate"; nodes: DagNodeType[]; derived: DagDerivedType }
  | { type: "loading"; loading: boolean }
  | { type: "error"; message: string };

export type WebviewToExtension =
  | { type: "generate"; repoUrl: string; prompt: string }
  | { type: "modify"; prompt: string }
  | { type: "statusChange"; nodeId: string; status: string }
  | { type: "positionChange"; nodeId: string; x: number; y: number }
  | { type: "ready" };
