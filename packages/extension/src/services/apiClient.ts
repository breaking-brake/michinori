import * as vscode from "vscode";
import type { AnalyzeResponseType, MichinoriFileType, DagNodeType } from "@michinori/shared";

export interface AnalyzeParams {
  repoUrl: string;
  prompt: string;
  currentDag: MichinoriFileType | null;
}

export async function callAnalyze(params: AnalyzeParams): Promise<{ nodes: DagNodeType[]; model: string }> {
  const config = vscode.workspace.getConfiguration("michinori");
  const endpoint = config.get<string>("apiEndpoint", "http://localhost:8080");

  const res = await fetch(`${endpoint}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Unknown error" })) as { error: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }

  return (await res.json()) as AnalyzeResponseType;
}
