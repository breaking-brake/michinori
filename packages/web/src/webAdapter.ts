import type { DagAdapter, DagMessage, ChatMessage, QuotaInfo } from "@michinori/ui";
import type { DagNodeType, DagProposalType, MichinoriFileType } from "@michinori/shared";
import { computeCriticalPath } from "@michinori/shared";

const DAG_STORAGE = "michinori:dag";

function parseQuotaHeaders(res: Response): QuotaInfo | null {
  const limit = res.headers.get("X-Quota-Limit");
  const remaining = res.headers.get("X-Quota-Remaining");
  if (!limit) return null;
  if (limit === "unlimited") return { limit: -1, used: 0, remaining: -1, isAdmin: true, resetsAt: null };
  const l = parseInt(limit, 10);
  const r = parseInt(remaining ?? "0", 10);
  return { limit: l, used: l - r, remaining: r, isAdmin: false, resetsAt: "00:00 JST" };
}

export async function fetchQuota(endpoint: string): Promise<QuotaInfo | null> {
  try {
    const res = await fetch(`${endpoint}/quota`);
    if (!res.ok) return null;
    return (await res.json()) as QuotaInfo;
  } catch {
    return null;
  }
}
const ENDPOINT_STORAGE = "michinori:endpoint";

export function getEndpoint(): string {
  return localStorage.getItem(ENDPOINT_STORAGE) ?? (import.meta.env.DEV ? "http://localhost:8080" : "");
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

export function createWebAdapter(
  dispatch: (msg: DagMessage) => void,
  addUserChatMessage: (content: string) => void,
  getChatMessages: () => ChatMessage[],
  onQuotaUpdate: (quota: QuotaInfo) => void,
): DagAdapter {
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

      const quota = parseQuotaHeaders(res);
      if (quota) onQuotaUpdate(quota);

      if (!res.ok) {
        const body = (await res.json().catch(() => ({ error: "Unknown error" }))) as { error: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const data = (await res.json()) as { summary: string; nodes: DagNodeType[]; model: string };
      const derived = computeCriticalPath(data.nodes, currentDag?.calendar);
      const now = new Date().toISOString();

      const dag: MichinoriFileType = {
        version: 1,
        metadata: {
          repoUrl,
          prompt,
          summary: data.summary,
          generatedAt: currentDag?.metadata.generatedAt ?? now,
          updatedAt: now,
          model: data.model,
        },
        nodes: data.nodes,
        derived,
        calendar: currentDag?.calendar ?? { preset: "weekday" as const, customDayOff: [], customDayOn: [] },
      };

      saveDag(dag);
      dispatch({ type: "dagUpdate", nodes: data.nodes, derived, repoUrl, prompt, summary: data.summary });
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
      dispatch({ type: "chatResponse", message: "DAGに反映しました。引き続き変更の相談ができます。" });
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
        dispatch({ type: "dagUpdate", nodes: dag.nodes, derived: dag.derived, repoUrl: dag.metadata.repoUrl, summary: dag.metadata.summary, calendar: dag.calendar });
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
    sendChat: async (message) => {
      const dag = getDag();
      if (!dag) {
        dispatch({ type: "error", message: "先にDAGを生成してください" });
        return;
      }
      addUserChatMessage(message);
      dispatch({ type: "chatLoading", loading: true });
      try {
        const chatHistory = getChatMessages().map((m) => ({
          role: m.role === "user" ? "user" as const : "model" as const,
          content: m.content,
        }));
        const endpoint = getEndpoint();
        const res = await fetch(`${endpoint}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, repoUrl: dag.metadata.repoUrl, conversationHistory: chatHistory, currentDag: dag }),
        });
        const chatQuota = parseQuotaHeaders(res);
        if (chatQuota) onQuotaUpdate(chatQuota);
        if (!res.ok) {
          const body = (await res.json().catch(() => ({ error: "Unknown error" }))) as { error: string };
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        const data = (await res.json()) as { message: string; proposal?: DagProposalType };
        dispatch({ type: "chatResponse", message: data.message, proposal: data.proposal ?? undefined });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        dispatch({ type: "chatResponse", message: `エラー: ${errMsg}` });
      }
    },
    applyProposal: (proposal) => {
      const dag = getDag();
      if (!dag) return;

      for (const removal of proposal.removals) {
        dag.nodes = dag.nodes.filter((n) => n.id !== removal);
        for (const node of dag.nodes) {
          node.dependencies = node.dependencies.filter((d) => d !== removal);
        }
      }

      for (const mod of proposal.modifications) {
        const node = dag.nodes.find((n) => n.id === mod.nodeId);
        if (node) {
          if (mod.changes.label !== undefined) (node as { label: string }).label = mod.changes.label;
          if (mod.changes.description !== undefined) (node as { description: string }).description = mod.changes.description;
          if (mod.changes.estimateMd !== undefined) (node as { estimateMd: number }).estimateMd = mod.changes.estimateMd;
          if (mod.changes.category !== undefined) (node as { category: string }).category = mod.changes.category;
          if (mod.changes.status !== undefined) (node as { status: string }).status = mod.changes.status;
          if (mod.changes.position !== undefined) node.position = mod.changes.position;
        }
      }

      for (const addition of proposal.additions) {
        dag.nodes.push(addition);
      }

      dag.derived = computeCriticalPath(dag.nodes, dag.calendar);
      dag.metadata.updatedAt = new Date().toISOString();
      saveDag(dag);
      dispatch({ type: "dagUpdate", nodes: dag.nodes, derived: dag.derived, calendar: dag.calendar });
    },
    reset: () => {
      localStorage.removeItem(DAG_STORAGE);
      dispatch({ type: "dagUpdate", nodes: [], derived: { criticalPath: [], estimatedCompletionDate: "", totalEstimateMd: 0, remainingMd: 0 } });
    },
  };
}
