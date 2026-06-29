import { useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Panel,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type Connection,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { DagNode } from "./components/DagNode";
import { DeletableEdge } from "./components/DeletableEdge";
import { Header } from "./components/Header";
import { Legend } from "./components/Legend";
import { InputPanel } from "./components/InputPanel";
import { ChatPanel } from "./components/ChatPanel";
import { LoadingOverlay } from "./components/LoadingOverlay";
import { NodeDetailPanel } from "./components/NodeDetailPanel";
import { CalendarPanel } from "./components/CalendarPanel";
import { ProposalPreviewDialog } from "./components/ProposalPreviewDialog";
import type { DagAdapter, DagMessage, ChatMessage, QuotaInfo } from "./types";
import type { DagProposalType } from "@michinori/shared";
import type { DagNodeType, DagDerivedType } from "@michinori/shared";

const nodeTypes = { dag: DagNode };
const edgeTypes = { deletable: DeletableEdge };

interface DagAppProps {
  adapter: DagAdapter;
  dispatch: (msg: DagMessage) => void;
  nodes: DagNodeType[];
  derived: DagDerivedType | null;
  loading: boolean;
  error: string | null;
  hasDag: boolean;
  repoUrl?: string;
  summary?: string;
  defaultRepoUrl?: string;
  defaultPrompt?: string;
  calendarPreset?: string;
  customDayOff?: string[];
  customDayOn?: string[];
  chatMessages?: ChatMessage[];
  chatLoading?: boolean;
  onDismissProposal?: () => void;
  onMarkProposalApplied?: () => void;
  quota?: QuotaInfo | null;
  estimateMode?: string;
  onEstimateModeChange?: (mode: string) => void;
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

function DagAppInner({ adapter, dispatch, nodes: dagNodes, derived, loading, error, hasDag, repoUrl, summary, defaultRepoUrl, defaultPrompt, calendarPreset = "weekday", customDayOff = [], customDayOn = [], chatMessages = [], chatLoading = false, onDismissProposal, onMarkProposalApplied, quota, estimateMode = "md", onEstimateModeChange }: DagAppProps) {
  const estimateUnit = estimateMode === "sp" ? "SP" : "MD";
  const [velocity, setVelocity] = useState(20);
  const [sprintDays, setSprintDays] = useState(10);
  const [flowNodes, setFlowNodes] = useState<Node[]>([]);
  const [flowEdges, setFlowEdges] = useState<Edge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [pendingProposal, setPendingProposal] = useState<DagProposalType | null>(null);
  const reactFlow = useReactFlow();

  const selectedDagNode = selectedNodeId ? dagNodes.find((n) => n.id === selectedNodeId) : null;

  useEffect(() => {
    if (!derived || dagNodes.length === 0) {
      setFlowNodes([]);
      setFlowEdges([]);
      return;
    }

    const criticalSet = showCriticalPath ? new Set(derived.criticalPath) : new Set<string>();
    const positions = autoLayout(dagNodes);

    setFlowNodes(
      dagNodes.map((n) => ({
        id: n.id,
        type: "dag",
        position: n.position ?? positions.get(n.id) ?? { x: 0, y: 0 },
        data: {
          label: n.label,
          estimate: n.estimate,
          category: n.category,
          status: n.status,
          description: n.description,
          onCriticalPath: criticalSet.has(n.id),
          estimateUnit,
          onDelete: (nodeId: string) => {
            if (window.confirm("このノードを削除しますか？")) {
              setSelectedNodeId(null);
              adapter.deleteNode(nodeId);
            }
          },
        },
      })),
    );

    setFlowEdges(
      dagNodes.flatMap((n) =>
        n.dependencies.map((dep) => ({
          id: `${dep}-${n.id}`,
          type: "deletable",
          source: dep,
          target: n.id,
          data: {
            onDelete: () => adapter.removeEdge(dep, n.id),
          },
          style: {
            stroke: criticalSet.has(dep) && criticalSet.has(n.id) ? "#ef4444" : "#666",
            strokeWidth: criticalSet.has(dep) && criticalSet.has(n.id) ? 3 : 1,
          },
          animated: criticalSet.has(dep) && criticalSet.has(n.id),
        })),
      ),
    );
  }, [dagNodes, derived, showCriticalPath]);

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
      setSelectedNodeId(node.id);
      setChatOpen(false);
      setCalendarOpen(false);
    },
    [],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        adapter.addEdge(connection.source, connection.target);
      }
    },
    [adapter],
  );

  const handleAddNode = useCallback(() => {
    const viewport = reactFlow.getViewport();
    const position = reactFlow.screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    adapter.addNode(position);
  }, [adapter, reactFlow]);

  const handleGenerate = useCallback(
    (repoUrl: string, prompt: string) => adapter.generate(repoUrl, prompt),
    [adapter],
  );

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column" }}>
      <Header
        completionDate={derived?.estimatedCompletionDate ?? null}
        remaining={derived?.remaining ?? 0}
        repoUrl={repoUrl}
        summary={summary}
        showCriticalPath={showCriticalPath}
        onToggleCriticalPath={hasDag ? () => setShowCriticalPath(!showCriticalPath) : undefined}
        onCalendar={() => { setCalendarOpen(!calendarOpen); setSelectedNodeId(null); setChatOpen(false); }}
        onChat={hasDag ? () => { setChatOpen(!chatOpen); setSelectedNodeId(null); setCalendarOpen(false); } : undefined}
        quota={quota}
        estimateUnit={estimateUnit}
        estimateMode={estimateMode}
        velocity={velocity}
        sprintDays={sprintDays}
        onVelocityChange={setVelocity}
        onSprintDaysChange={setSprintDays}
        onSave={() => adapter.save()}
        onLoad={() => adapter.load()}
        onReset={() => {
          if (window.confirm("DAGをリセットしますか？")) {
            setFlowNodes([]);
            setFlowEdges([]);
            adapter.reset();
          }
        }}
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
          quota={quota}
          estimateMode={estimateMode}
          onEstimateModeChange={onEstimateModeChange}
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
          onConnect={handleConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          colorMode="dark"
          fitView
        >
          <Background />
          <Controls />
          {hasDag && (
            <Panel position="bottom-left">
              <Legend showCriticalPath={showCriticalPath} />
            </Panel>
          )}
          {hasDag && (
            <Panel position="top-left">
              <button
                onClick={handleAddNode}
                style={{
                  padding: "6px 14px",
                  background: "var(--vscode-button-background, #0e639c)",
                  color: "var(--vscode-button-foreground, #fff)",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 13,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                }}
              >
                + ノード追加
              </button>
            </Panel>
          )}
        </ReactFlow>
        {chatOpen && (
          <ChatPanel
            messages={chatMessages}
            loading={chatLoading}
            onSendMessage={(msg) => adapter.sendChat(msg)}
            onApplyProposal={(proposal) => setPendingProposal(proposal)}
            onDismissProposal={() => onDismissProposal?.()}
            onClose={() => setChatOpen(false)}
          />
        )}
        {selectedDagNode && (
          <NodeDetailPanel
            nodeId={selectedDagNode.id}
            label={selectedDagNode.label}
            status={selectedDagNode.status}
            category={selectedDagNode.category}
            description={selectedDagNode.description}
            estimate={selectedDagNode.estimate}
            estimateUnit={estimateUnit}
            onUpdate={(fields) => {
              adapter.updateNode(selectedDagNode.id, fields);
              setSelectedNodeId(null);
            }}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
        {calendarOpen && (
          <CalendarPanel
            preset={calendarPreset}
            customDayOff={customDayOff}
            customDayOn={customDayOn}
            onUpdate={(cal) => adapter.updateCalendar(cal)}
            onClose={() => setCalendarOpen(false)}
          />
        )}
        {loading && <LoadingOverlay />}
      </div>
      {pendingProposal && (
        <ProposalPreviewDialog
          currentNodes={dagNodes}
          proposal={pendingProposal}
          calendarConfig={{ calendar: { preset: calendarPreset as "weekday" | "weekend", customDayOff, customDayOn }, estimateMode: estimateMode as "md" | "sp" }}
          onConfirm={() => {
            adapter.applyProposal(pendingProposal);
            onMarkProposalApplied?.();
            setPendingProposal(null);
          }}
          onCancel={() => setPendingProposal(null)}
        />
      )}
    </div>
  );
}

export function DagApp(props: DagAppProps) {
  return (
    <ReactFlowProvider>
      <DagAppInner {...props} />
    </ReactFlowProvider>
  );
}
