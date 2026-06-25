import type { DagAdapter, DagMessage } from "@michinori/ui";
import type { DagNodeType, MichinoriFileType } from "@michinori/shared";
import { computeCriticalPath } from "@michinori/shared";

const DAG_STORAGE = "michinori:dag";
const ENDPOINT_STORAGE = "michinori:endpoint";

function getEndpoint(): string {
  return localStorage.getItem(ENDPOINT_STORAGE) ?? "http://localhost:8080";
}

function getDag(): MichinoriFileType | null {
  const raw = localStorage.getItem(DAG_STORAGE);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveDag(dag: MichinoriFileType) {
  localStorage.setItem(DAG_STORAGE, JSON.stringify(dag));
}

export function createWebAdapter(dispatch: (msg: DagMessage) => void): DagAdapter {
  async function callAnalyze(
    repoUrl: string,
    prompt: string,
    currentDag: MichinoriFileType | null,
  ) {
    const endpoint = getEndpoint();
    dispatch({ type: "loading", loading: true });

    try {
      const res = await fetch(`${endpoint}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl, prompt, currentDag }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({ error: "Unknown error" }))) as { error: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const data = (await res.json()) as { nodes: DagNodeType[]; model: string };
      const derived = computeCriticalPath(data.nodes);
      const now = new Date().toISOString();

      const dag: MichinoriFileType = {
        version: 1,
        metadata: {
          repoUrl,
          prompt,
          generatedAt: currentDag?.metadata.generatedAt ?? now,
          updatedAt: now,
          model: data.model,
        },
        nodes: data.nodes,
        derived,
      };

      saveDag(dag);
      dispatch({ type: "dagUpdate", nodes: data.nodes, derived });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      dispatch({ type: "error", message });
    } finally {
      dispatch({ type: "loading", loading: false });
    }
  }

  return {
    generate: (repoUrl, prompt) => {
      callAnalyze(repoUrl, prompt, null);
    },
    modify: (prompt) => {
      const existing = getDag();
      if (!existing) {
        dispatch({ type: "error", message: "先にDAGを生成してください" });
        return;
      }
      callAnalyze(existing.metadata.repoUrl, prompt, existing);
    },
    changeStatus: (nodeId, status) => {
      const dag = getDag();
      if (!dag) return;
      const node = dag.nodes.find((n) => n.id === nodeId);
      if (node) {
        (node as { status: string }).status = status;
        dag.derived = computeCriticalPath(dag.nodes);
        dag.metadata.updatedAt = new Date().toISOString();
        saveDag(dag);
        dispatch({ type: "dagUpdate", nodes: dag.nodes, derived: dag.derived });
      }
    },
    changePosition: (nodeId, x, y) => {
      const dag = getDag();
      if (!dag) return;
      const node = dag.nodes.find((n) => n.id === nodeId);
      if (node) {
        node.position = { x, y };
        saveDag(dag);
      }
    },
    onReady: () => {
      const dag = getDag();
      if (dag) {
        dispatch({ type: "dagUpdate", nodes: dag.nodes, derived: dag.derived });
      }
    },
  };
}
