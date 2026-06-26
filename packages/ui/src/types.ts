import type { DagNodeType, DagDerivedType } from "@michinori/shared";

export interface DagAdapter {
  generate(repoUrl: string, prompt: string): void;
  modify(prompt: string): void;
  changeStatus(nodeId: string, status: string): void;
  changePosition(nodeId: string, x: number, y: number): void;
  updateNode(nodeId: string, fields: { label?: string; status?: string; description?: string }): void;
  onReady(): void;
  reset(): void;
}

export interface DagUpdate {
  nodes: DagNodeType[];
  derived: DagDerivedType;
}

export type DagMessage =
  | { type: "dagUpdate"; nodes: DagNodeType[]; derived: DagDerivedType }
  | { type: "loading"; loading: boolean }
  | { type: "error"; message: string };
