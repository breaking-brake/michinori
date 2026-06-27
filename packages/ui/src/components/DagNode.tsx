import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { STATUS_DEFINITIONS, CATEGORY_DEFINITIONS } from "@michinori/shared";

const STATUS_COLORS = Object.fromEntries(STATUS_DEFINITIONS.map((s) => [s.value, s.color]));
const CATEGORY_COLORS = Object.fromEntries(CATEGORY_DEFINITIONS.map((c) => [c.value, c.color]));

interface DagNodeData {
  label: string;
  estimateMd: number;
  category: string;
  status: string;
  description: string;
  onCriticalPath?: boolean;
  onDelete?: (nodeId: string) => void;
  [key: string]: unknown;
}

export const DagNode = memo(({ id, data, selected }: NodeProps) => {
  const d = data as DagNodeData;
  const color = STATUS_COLORS[d.status] ?? "#6b7280";
  const borderColor = d.onCriticalPath ? "#ef4444" : "var(--vscode-panel-border, #444)";
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "12px 16px",
        borderRadius: 8,
        border: `2px solid ${borderColor}`,
        background: "var(--vscode-editor-background, #1e1e1e)",
        color: "var(--vscode-editor-foreground, #ccc)",
        minWidth: 180,
        maxWidth: 240,
        fontSize: 13,
        cursor: "pointer",
        transition: "box-shadow 0.15s",
        boxShadow: hovered ? "0 2px 12px rgba(0,0,0,0.4)" : "none",
        position: "relative",
      }}
    >
      {selected && d.onDelete && (
        <button
          className="nodrag nopan"
          onClick={(e) => {
            e.stopPropagation();
            d.onDelete!(id);
          }}
          style={{
            position: "absolute",
            top: -8,
            right: -8,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "#ef4444",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            lineHeight: 1,
            padding: 0,
            zIndex: 10,
          }}
        >
          ✕
        </button>
      )}
      <Handle type="target" position={Position.Top} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
        <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>{d.label}</span>
        <span
          style={{
            fontSize: 10,
            padding: "1px 6px",
            borderRadius: 3,
            background: CATEGORY_COLORS[d.category] ?? "#6b7280",
            color: "#fff",
            opacity: 0.9,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {d.category}
        </span>
      </div>
      {hovered && d.description && (
        <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 6, lineHeight: 1.4 }}>
          {d.description}
        </div>
      )}
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
        <span style={{ fontSize: 11, opacity: 0.7 }}>{d.estimateMd}MD</span>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});
