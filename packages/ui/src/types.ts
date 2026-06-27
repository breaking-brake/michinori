import type { DagNodeType, DagDerivedType } from "@michinori/shared";

export interface DagAdapter {
  generate(repoUrl: string, prompt: string): void;
  modify(prompt: string): void;
  changeStatus(nodeId: string, status: string): void;
  changePosition(nodeId: string, x: number, y: number): void;
  updateNode(nodeId: string, fields: { label?: string; status?: string; category?: string; description?: string; estimateMd?: number }): void;
  onReady(): void;
  reset(): void;
  save(): void;
  load(): void;
}

export interface DagUpdate {
  nodes: DagNodeType[];
  derived: DagDerivedType;
}

export type DagMessage =
  | { type: "dagUpdate"; nodes: DagNodeType[]; derived: DagDerivedType }
  | { type: "loading"; loading: boolean }
  | { type: "error"; message: string };
