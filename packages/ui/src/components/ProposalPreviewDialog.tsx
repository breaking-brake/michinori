import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  type Node,
  type Edge,
  ReactFlowProvider,
} from "@xyflow/react";
import { DagNode } from "./DagNode";
import { applyProposalToNodes } from "../applyProposal";
import type { DagNodeType, DagProposalType } from "@michinori/shared";
import { computeCriticalPath } from "@michinori/shared";

const nodeTypes = { dag: DagNode };

interface ProposalPreviewDialogProps {
  currentNodes: DagNodeType[];
  proposal: DagProposalType;
  calendarConfig?: Parameters<typeof computeCriticalPath>[1];
  onConfirm: () => void;
  onCancel: () => void;
}

function autoLayout(nodes: DagNodeType[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const n of nodes) {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
  }
  for (const n of nodes) {
    for (const dep of n.dependencies) {
      adj.get(dep)?.push(n.id);
      inDegree.set(n.id, (inDegree.get(n.id) ?? 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const layers: string[][] = [];
  while (queue.length > 0) {
    const layer = [...queue];
    layers.push(layer);
    queue.length = 0;
    for (const id of layer) {
      for (const next of adj.get(id) ?? []) {
        const newDeg = (inDegree.get(next) ?? 1) - 1;
        inDegree.set(next, newDeg);
        if (newDeg === 0) queue.push(next);
      }
    }
  }

  for (let row = 0; row < layers.length; row++) {
    const layer = layers[row];
    const totalWidth = layer.length * 220;
    const startX = -totalWidth / 2;
    for (let col = 0; col < layer.length; col++) {
      positions.set(layer[col], { x: startX + col * 220, y: row * 150 });
    }
  }
  return positions;
}

function PreviewCanvas({ currentNodes, proposal, calendarConfig }: Pick<ProposalPreviewDialogProps, "currentNodes" | "proposal" | "calendarConfig">) {
  const { flowNodes, flowEdges, summary } = useMemo(() => {
    const previewNodes = applyProposalToNodes(currentNodes, proposal);
    const derived = computeCriticalPath(previewNodes, calendarConfig);
    const criticalSet = new Set(derived.criticalPath);
    const positions = autoLayout(previewNodes);

    const addedIds = new Set(proposal.additions.map((a) => a.id));
    const modifiedIds = new Set(proposal.modifications.map((m) => m.nodeId));

    const nodes: Node[] = previewNodes.map((n) => ({
      id: n.id,
      type: "dag",
      position: n.position ?? positions.get(n.id) ?? { x: 0, y: 0 },
      data: {
        label: n.label,
        estimateMd: n.estimateMd,
        category: n.category,
        status: n.status,
        description: n.description,
        onCriticalPath: criticalSet.has(n.id),
      },
      style: addedIds.has(n.id)
        ? { outline: "2px dashed #4ade80", outlineOffset: 2 }
        : modifiedIds.has(n.id)
        ? { outline: "2px dashed #fbbf24", outlineOffset: 2 }
        : undefined,
    }));

    const edges: Edge[] = previewNodes.flatMap((n) =>
      n.dependencies.map((dep) => ({
        id: `${dep}-${n.id}`,
        source: dep,
        target: n.id,
        style: {
          stroke: criticalSet.has(dep) && criticalSet.has(n.id) ? "#ef4444" : "#666",
          strokeWidth: criticalSet.has(dep) && criticalSet.has(n.id) ? 3 : 1,
        },
      })),
    );

    return {
      flowNodes: nodes,
      flowEdges: edges,
      summary: {
        added: proposal.additions.length,
        removed: proposal.removals.length,
        modified: proposal.modifications.length,
      },
    };
  }, [currentNodes, proposal, calendarConfig]);

  return (
    <>
      <div style={{ padding: "8px 16px", fontSize: 12, opacity: 0.7, borderBottom: "1px solid #444", display: "flex", gap: 12 }}>
        {summary.added > 0 && <span style={{ color: "#4ade80" }}>追加: {summary.added}件</span>}
        {summary.removed > 0 && <span style={{ color: "#f87171" }}>削除: {summary.removed}件</span>}
        {summary.modified > 0 && <span style={{ color: "#fbbf24" }}>変更: {summary.modified}件</span>}
        <span style={{ marginLeft: 8 }}>
          <span style={{ display: "inline-block", width: 10, height: 10, border: "2px dashed #4ade80", marginRight: 4, verticalAlign: "middle" }} /> 追加
          <span style={{ display: "inline-block", width: 10, height: 10, border: "2px dashed #fbbf24", marginLeft: 12, marginRight: 4, verticalAlign: "middle" }} /> 変更
        </span>
      </div>
      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          fitView
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag
          zoomOnScroll
        >
          <Background />
        </ReactFlow>
      </div>
    </>
  );
}

export function ProposalPreviewDialog({ currentNodes, proposal, calendarConfig, onConfirm, onCancel }: ProposalPreviewDialogProps) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        style={{
          width: "85vw",
          height: "75vh",
          background: "var(--vscode-editor-background, #1e1e1e)",
          border: "1px solid var(--vscode-panel-border, #444)",
          borderRadius: 8,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--vscode-panel-border, #444)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <span>変更プレビュー</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onCancel}
              style={{
                padding: "6px 16px",
                background: "transparent",
                color: "var(--vscode-foreground, #ccc)",
                border: "1px solid var(--vscode-panel-border, #444)",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              キャンセル
            </button>
            <button
              onClick={onConfirm}
              style={{
                padding: "6px 16px",
                background: "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              DAGに反映
            </button>
          </div>
        </div>

        <ReactFlowProvider>
          <PreviewCanvas currentNodes={currentNodes} proposal={proposal} calendarConfig={calendarConfig} />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
