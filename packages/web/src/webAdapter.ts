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
      const derived = computeCriticalPath(data.nodes, currentDag?.calendar);
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
        calendar: currentDag?.calendar ?? { preset: "weekday" as const, customDayOff: [], customDayOn: [] },
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
        dag.derived = computeCriticalPath(dag.nodes, dag.calendar);
        dag.metadata.updatedAt = new Date().toISOString();
        saveDag(dag);
        dispatch({ type: "dagUpdate", nodes: dag.nodes, derived: dag.derived, calendar: dag.calendar });
      }
    },
    updateNode: (nodeId, fields) => {
      const dag = getDag();
      if (!dag) return;
      const node = dag.nodes.find((n) => n.id === nodeId);
      if (node) {
        if (fields.label !== undefined) (node as { label: string }).label = fields.label;
        if (fields.status !== undefined) (node as { status: string }).status = fields.status;
        if (fields.category !== undefined) (node as { category: string }).category = fields.category;
        if (fields.description !== undefined) (node as { description: string }).description = fields.description;
        if (fields.estimateMd !== undefined) (node as { estimateMd: number }).estimateMd = fields.estimateMd;
        dag.derived = computeCriticalPath(dag.nodes, dag.calendar);
        dag.metadata.updatedAt = new Date().toISOString();
        saveDag(dag);
        dispatch({ type: "dagUpdate", nodes: dag.nodes, derived: dag.derived, calendar: dag.calendar });
      }
    },
    addNode: (position) => {
      const dag = getDag();
      if (!dag) return;
      const id = `task-${Date.now()}`;
      const newNode: DagNodeType = {
        id,
        label: "新しいタスク",
        description: "",
        estimateMd: 1,
        category: "実装",
        status: "未着手",
        dependencies: [],
        position,
      };
      dag.nodes.push(newNode);
      dag.derived = computeCriticalPath(dag.nodes, dag.calendar);
      dag.metadata.updatedAt = new Date().toISOString();
      saveDag(dag);
      dispatch({ type: "dagUpdate", nodes: dag.nodes, derived: dag.derived, calendar: dag.calendar });
    },
    deleteNode: (nodeId) => {
      const dag = getDag();
      if (!dag) return;
      dag.nodes = dag.nodes.filter((n) => n.id !== nodeId);
      for (const node of dag.nodes) {
        node.dependencies = node.dependencies.filter((d) => d !== nodeId);
      }
      dag.derived = computeCriticalPath(dag.nodes, dag.calendar);
      dag.metadata.updatedAt = new Date().toISOString();
      saveDag(dag);
      dispatch({ type: "dagUpdate", nodes: dag.nodes, derived: dag.derived, calendar: dag.calendar });
    },
    addEdge: (sourceId, targetId) => {
      const dag = getDag();
      if (!dag) return;
      const target = dag.nodes.find((n) => n.id === targetId);
      if (!target || target.dependencies.includes(sourceId)) return;
      target.dependencies.push(sourceId);
      dag.derived = computeCriticalPath(dag.nodes, dag.calendar);
      dag.metadata.updatedAt = new Date().toISOString();
      saveDag(dag);
      dispatch({ type: "dagUpdate", nodes: dag.nodes, derived: dag.derived, calendar: dag.calendar });
    },
    removeEdge: (sourceId, targetId) => {
      const dag = getDag();
      if (!dag) return;
      const target = dag.nodes.find((n) => n.id === targetId);
      if (!target) return;
      target.dependencies = target.dependencies.filter((d) => d !== sourceId);
      dag.derived = computeCriticalPath(dag.nodes, dag.calendar);
      dag.metadata.updatedAt = new Date().toISOString();
      saveDag(dag);
      dispatch({ type: "dagUpdate", nodes: dag.nodes, derived: dag.derived, calendar: dag.calendar });
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
        dispatch({ type: "dagUpdate", nodes: dag.nodes, derived: dag.derived, calendar: dag.calendar });
      }
    },
    updateCalendar: (update) => {
      const dag = getDag();
      if (!dag) return;
      dag.calendar = {
        preset: (update.preset ?? dag.calendar?.preset ?? "weekday") as "weekday" | "weekend",
        customDayOff: update.customDayOff ?? dag.calendar?.customDayOff ?? [],
        customDayOn: update.customDayOn ?? dag.calendar?.customDayOn ?? [],
      };
      dag.derived = computeCriticalPath(dag.nodes, dag.calendar);
      dag.metadata.updatedAt = new Date().toISOString();
      saveDag(dag);
      dispatch({ type: "dagUpdate", nodes: dag.nodes, derived: dag.derived, calendar: dag.calendar });
    },
    save: () => {
      const dag = getDag();
      if (!dag) return;
      const blob = new Blob([JSON.stringify(dag, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = ".michinori.json";
      a.click();
      URL.revokeObjectURL(url);
    },
    load: () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        try {
          const text = await file.text();
          const dag = JSON.parse(text) as MichinoriFileType;
          if (!dag.version || !dag.nodes) throw new Error("Invalid format");
          saveDag(dag);
          dispatch({ type: "dagUpdate", nodes: dag.nodes, derived: dag.derived, calendar: dag.calendar });
        } catch {
          dispatch({ type: "error", message: "ファイルの読み込みに失敗しました" });
        }
      };
      input.click();
    },
    reset: () => {
      localStorage.removeItem(DAG_STORAGE);
      dispatch({ type: "dagUpdate", nodes: [], derived: { criticalPath: [], estimatedCompletionDate: "", totalEstimateMd: 0, remainingMd: 0 } });
    },
  };
}
