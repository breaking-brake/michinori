import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

type Status = "未着手" | "進行中" | "PR Open" | "完了";

const STATUS_COLORS: Record<Status, string> = {
  "未着手": "#6b7280",
  "進行中": "#3b82f6",
  "PR Open": "#f59e0b",
  "完了": "#10b981",
};

interface DagNodeData {
  label: string;
  estimateHours: number;
  status: Status;
  description: string;
  onCriticalPath?: boolean;
  [key: string]: unknown;
}

export const DagNode = memo(({ data }: NodeProps) => {
  const d = data as DagNodeData;
  const color = STATUS_COLORS[d.status] ?? "#6b7280";
  const borderColor = d.onCriticalPath ? "#ef4444" : "var(--vscode-panel-border, #444)";

  return (
    <div
      style={{
        padding: "12px 16px",
        borderRadius: 8,
        border: `2px solid ${borderColor}`,
        background: "var(--vscode-editor-background, #1e1e1e)",
        color: "var(--vscode-editor-foreground, #ccc)",
        minWidth: 180,
        fontSize: 13,
      }}
    >
      <Handle type="target" position={Position.Top} />
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{d.label}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span
          style={{
            fontSize: 11,
            padding: "2px 8px",
            borderRadius: 4,
            background: color,
            color: "#fff",
          }}
        >
          {d.status}
        </span>
        <span style={{ fontSize: 11, opacity: 0.7 }}>{d.estimateHours}h</span>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});
