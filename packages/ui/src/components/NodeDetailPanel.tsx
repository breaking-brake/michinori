import { useState, useEffect } from "react";

type Status = "未着手" | "進行中" | "PR Open" | "完了";
const STATUSES: Status[] = ["未着手", "進行中", "PR Open", "完了"];

const inputStyle = {
  padding: "6px 10px",
  background: "var(--vscode-input-background, #3c3c3c)",
  color: "var(--vscode-input-foreground, #ccc)",
  border: "1px solid var(--vscode-input-border, #555)",
  borderRadius: 4,
  fontSize: 13,
  width: "100%",
  boxSizing: "border-box" as const,
};

const labelStyle = {
  fontSize: 11,
  opacity: 0.6,
  marginBottom: 2,
};

interface NodeDetailPanelProps {
  nodeId: string;
  label: string;
  status: string;
  description: string;
  estimateHours: number;
  onUpdate: (fields: { label?: string; status?: string; description?: string }) => void;
  onClose: () => void;
}

export function NodeDetailPanel({ nodeId, label, status, description, estimateHours, onUpdate, onClose }: NodeDetailPanelProps) {
  const [editLabel, setEditLabel] = useState(label);
  const [editStatus, setEditStatus] = useState(status);
  const [editDescription, setEditDescription] = useState(description);

  useEffect(() => {
    setEditLabel(label);
    setEditStatus(status);
    setEditDescription(description);
  }, [nodeId, label, status, description]);

  const handleSave = () => {
    const fields: { label?: string; status?: string; description?: string } = {};
    if (editLabel !== label) fields.label = editLabel;
    if (editStatus !== status) fields.status = editStatus;
    if (editDescription !== description) fields.description = editDescription;
    if (Object.keys(fields).length > 0) {
      onUpdate(fields);
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        width: 300,
        zIndex: 10,
        background: "var(--vscode-sideBar-background, #252526)",
        borderLeft: "1px solid var(--vscode-panel-border, #444)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "10px 16px",
          borderBottom: "1px solid var(--vscode-panel-border, #444)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        <span>ノード詳細</span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "var(--vscode-foreground, #ccc)",
            cursor: "pointer",
            fontSize: 16,
            padding: "0 4px",
            opacity: 0.6,
          }}
        >
          ×
        </button>
      </div>

      <div
        style={{
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          flex: 1,
          overflowY: "auto",
          fontSize: 13,
          color: "var(--vscode-foreground, #ccc)",
        }}
      >
        <div>
          <div style={labelStyle}>タイトル</div>
          <input
            type="text"
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div>
          <div style={labelStyle}>ステータス</div>
          <select
            value={editStatus}
            onChange={(e) => setEditStatus(e.target.value)}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <div style={labelStyle}>説明</div>
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            rows={5}
            style={{ ...inputStyle, resize: "vertical" as const }}
          />
        </div>

        <div>
          <div style={labelStyle}>工数</div>
          <div style={{ fontSize: 13 }}>{estimateHours}h</div>
        </div>

        <button
          onClick={handleSave}
          style={{
            padding: "8px 16px",
            background: "var(--vscode-button-background, #0e639c)",
            color: "var(--vscode-button-foreground, #fff)",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 13,
            marginTop: 4,
          }}
        >
          保存
        </button>
      </div>
    </div>
  );
}
