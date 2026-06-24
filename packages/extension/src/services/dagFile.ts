import * as vscode from "vscode";
import type { MichinoriFileType, DagNodeType, DagDerivedType } from "@michinori/shared";

const FILE_NAME = ".michinori.json";

function getFilePath(): vscode.Uri | undefined {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) return undefined;
  return vscode.Uri.joinPath(folders[0].uri, FILE_NAME);
}

export async function readDagFile(): Promise<MichinoriFileType | null> {
  const uri = getFilePath();
  if (!uri) return null;

  try {
    const data = await vscode.workspace.fs.readFile(uri);
    return JSON.parse(Buffer.from(data).toString("utf-8")) as MichinoriFileType;
  } catch {
    return null;
  }
}

export async function writeDagFile(dag: MichinoriFileType): Promise<void> {
  const uri = getFilePath();
  if (!uri) throw new Error("No workspace folder open");

  const content = JSON.stringify(dag, null, 2) + "\n";
  await vscode.workspace.fs.writeFile(uri, Buffer.from(content, "utf-8"));
}

export function buildMichinoriFile(
  nodes: DagNodeType[],
  derived: DagDerivedType,
  metadata: { repoUrl: string; prompt: string; model: string },
  existing: MichinoriFileType | null,
): MichinoriFileType {
  const now = new Date().toISOString();
  return {
    version: 1 as const,
    metadata: {
      repoUrl: metadata.repoUrl,
      prompt: metadata.prompt,
      generatedAt: existing?.metadata.generatedAt ?? now,
      updatedAt: now,
      model: metadata.model,
    },
    nodes,
    derived,
  };
}
