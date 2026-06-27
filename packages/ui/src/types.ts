import type { DagNodeType, DagDerivedType, DagProposalType } from "@michinori/shared";

export interface DagAdapter {
  generate(repoUrl: string, prompt: string): void;
  modify(prompt: string): void;
  sendChat(message: string): void;
  applyProposal(proposal: DagProposalType): void;
  changeStatus(nodeId: string, status: string): void;
  changePosition(nodeId: string, x: number, y: number): void;
  updateNode(nodeId: string, fields: { label?: string; status?: string; category?: string; description?: string; estimateMd?: number }): void;
  addNode(position: { x: number; y: number }): void;
  deleteNode(nodeId: string): void;
  addEdge(sourceId: string, targetId: string): void;
  removeEdge(sourceId: string, targetId: string): void;
  onReady(): void;
  reset(): void;
  updateCalendar(calendar: { preset?: string; customDayOff?: string[]; customDayOn?: string[] }): void;
  save(): void;
  load(): void;
}

export interface DagUpdate {
  nodes: DagNodeType[];
  derived: DagDerivedType;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  proposal?: DagProposalType;
  dismissed?: boolean;
}

export type DagMessage =
  | { type: "dagUpdate"; nodes: DagNodeType[]; derived: DagDerivedType; calendar?: { preset: string; customDayOff: string[]; customDayOn: string[] } }
  | { type: "loading"; loading: boolean }
  | { type: "error"; message: string }
  | { type: "chatResponse"; message: string; proposal?: DagProposalType }
  | { type: "chatLoading"; loading: boolean };
