import { useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { DagNode } from "./components/DagNode";
import { Header } from "./components/Header";
import { InputPanel } from "./components/InputPanel";
import { ModifyPanel } from "./components/ModifyPanel";
import { LoadingOverlay } from "./components/LoadingOverlay";
import type { DagAdapter, DagMessage } from "./types";
import type { DagNodeType, DagDerivedType } from "@michinori/shared";

const nodeTypes = { dag: DagNode };

interface DagAppProps {
  adapter: DagAdapter;
  dispatch: (msg: DagMessage) => void;
  nodes: DagNodeType[];
  derived: DagDerivedType | null;
  loading: boolean;
  error: string | null;
  hasDag: boolean;
  defaultRepoUrl?: string;
  defaultPrompt?: string;
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

  const NODE_WIDTH = 220;
  const NODE_HEIGHT = 100;

  for (let row = 0; row < layers.length; row++) {
    const layer = layers[row];
    const totalWidth = layer.length * NODE_WIDTH;
    const startX = -totalWidth / 2;
    for (let col = 0; col < layer.length; col++) {
      positions.set(layer[col], {
        x: startX + col * NODE_WIDTH,
        y: row * NODE_HEIGHT * 1.5,
      });
    }
  }

  return positions;
}

export function DagApp({ adapter, dispatch, nodes: dagNodes, derived, loading, error, hasDag, defaultRepoUrl, defaultPrompt }: DagAppProps) {
  const [flowNodes, setFlowNodes] = useState<Node[]>([]);
  const [flowEdges, setFlowEdges] = useState<Edge[]>([]);

  useEffect(() => {
    if (!derived || dagNodes.length === 0) return;

    const criticalSet = new Set(derived.criticalPath);
    const positions = autoLayout(dagNodes);

    setFlowNodes(
      dagNodes.map((n) => ({
        id: n.id,
        type: "dag",
        position: n.position ?? positions.get(n.id) ?? { x: 0, y: 0 },
        data: {
          label: n.label,
          estimateHours: n.estimateHours,
          status: n.status,
          description: n.description,
          onCriticalPath: criticalSet.has(n.id),
        },
      })),
    );

    setFlowEdges(
      dagNodes.flatMap((n) =>
        n.dependencies.map((dep) => ({
          id: `${dep}-${n.id}`,
          source: dep,
          target: n.id,
          style: {
            stroke: criticalSet.has(dep) && criticalSet.has(n.id) ? "#ef4444" : "#666",
            strokeWidth: criticalSet.has(dep) && criticalSet.has(n.id) ? 3 : 1,
          },
          animated: criticalSet.has(dep) && criticalSet.has(n.id),
        })),
      ),
    );
  }, [dagNodes, derived]);

  useEffect(() => {
    adapter.onReady();
  }, [adapter]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setFlowNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setFlowEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );

  const onNodeDragStop = useCallback(
    (_event: MouseEvent | TouchEvent, node: Node) => {
      adapter.changePosition(node.id, node.position.x, node.position.y);
    },
    [adapter],
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const statusCycle = ["未着手", "進行中", "PR Open", "完了"];
      const currentStatus = (node.data as { status: string }).status;
      const idx = statusCycle.indexOf(currentStatus);
      const nextStatus = statusCycle[(idx + 1) % statusCycle.length];
      adapter.changeStatus(node.id, nextStatus);
    },
    [adapter],
  );

  const handleGenerate = useCallback(
    (repoUrl: string, prompt: string) => adapter.generate(repoUrl, prompt),
    [adapter],
  );

  const handleModify = useCallback(
    (prompt: string) => adapter.modify(prompt),
    [adapter],
  );

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column" }}>
      <Header
        completionDate={derived?.estimatedCompletionDate ?? null}
        remainingHours={derived?.remainingHours ?? 0}
      />
      {error && (
        <div style={{ padding: "8px 16px", background: "#7f1d1d", color: "#fca5a5", fontSize: 13 }}>
          {error}
        </div>
      )}
      {!hasDag && (
        <InputPanel
          onSubmit={handleGenerate}
          loading={loading}
          defaultRepoUrl={defaultRepoUrl}
          defaultPrompt={defaultPrompt}
        />
      )}
      <div style={{ flex: 1, position: "relative" }}>
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStop={onNodeDragStop}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
        {hasDag && <ModifyPanel onSubmit={handleModify} loading={loading} />}
        {loading && <LoadingOverlay />}
      </div>
    </div>
  );
}
