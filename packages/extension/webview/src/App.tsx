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
import { useVSCodeApi } from "./hooks/useVSCodeApi";

const nodeTypes = { dag: DagNode };

interface DagNodeData {
  id: string;
  label: string;
  estimateHours: number;
  status: string;
  description: string;
  dependencies: string[];
  position?: { x: number; y: number };
}

interface DerivedData {
  criticalPath: string[];
  estimatedCompletionDate: string;
  totalEstimateHours: number;
  remainingHours: number;
}

function autoLayout(nodes: DagNodeData[]): Map<string, { x: number; y: number }> {
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

export default function App() {
  const vscode = useVSCodeApi();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [completionDate, setCompletionDate] = useState<string | null>(null);
  const [remainingHours, setRemainingHours] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showInput, setShowInput] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      switch (msg.type) {
        case "dagUpdate": {
          const dagNodes = msg.nodes as DagNodeData[];
          const derived = msg.derived as DerivedData;
          const criticalSet = new Set(derived.criticalPath);

          const positions = autoLayout(dagNodes);

          const flowNodes: Node[] = dagNodes.map((n) => ({
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
          }));

          const flowEdges: Edge[] = dagNodes.flatMap((n) =>
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
          );

          setNodes(flowNodes);
          setEdges(flowEdges);
          setCompletionDate(derived.estimatedCompletionDate);
          setRemainingHours(derived.remainingHours);
          setShowInput(dagNodes.length === 0);
          setError(null);
          break;
        }
        case "loading":
          setLoading(msg.loading);
          break;
        case "error":
          setError(msg.message);
          break;
      }
    };

    window.addEventListener("message", handler);
    vscode?.postMessage({ type: "ready" });
    return () => window.removeEventListener("message", handler);
  }, [vscode]);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );

  const onNodeDragStop = useCallback(
    (_event: MouseEvent | TouchEvent, node: Node) => {
      vscode?.postMessage({
        type: "positionChange",
        nodeId: node.id,
        x: node.position.x,
        y: node.position.y,
      });
    },
    [vscode],
  );

  const handleGenerate = useCallback(
    (repoUrl: string, prompt: string) => {
      vscode?.postMessage({ type: "generate", repoUrl, prompt });
    },
    [vscode],
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const statusCycle = ["未着手", "進行中", "PR Open", "完了"];
      const currentStatus = (node.data as { status: string }).status;
      const idx = statusCycle.indexOf(currentStatus);
      const nextStatus = statusCycle[(idx + 1) % statusCycle.length];
      vscode?.postMessage({ type: "statusChange", nodeId: node.id, status: nextStatus });
    },
    [vscode],
  );

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column" }}>
      <Header completionDate={completionDate} remainingHours={remainingHours} />
      {error && (
        <div style={{ padding: "8px 16px", background: "#7f1d1d", color: "#fca5a5", fontSize: 13 }}>
          {error}
        </div>
      )}
      {showInput && <InputPanel onSubmit={handleGenerate} loading={loading} />}
      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
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
      </div>
    </div>
  );
}
