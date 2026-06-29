import { useState, useEffect } from "react";
import { STATUS_DEFINITIONS, CATEGORY_DEFINITIONS } from "@michinori/shared";

const STATUSES = STATUS_DEFINITIONS.map((s) => s.value);
const CATEGORIES = CATEGORY_DEFINITIONS.map((c) => c.value);

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
  category: string;
  estimate: number;
  onUpdate: (fields: { label?: string; status?: string; category?: string; description?: string; estimate?: number }) => void;
  onClose: () => void;
  readOnly?: boolean;
  estimateUnit?: string;
}

export function NodeDetailPanel({ nodeId, label, status, category, description, estimate, onUpdate, onClose, readOnly = false, estimateUnit = "MD" }: NodeDetailPanelProps) {
  const [editLabel, setEditLabel] = useState(label);
  const [editStatus, setEditStatus] = useState(status);
  const [editCategory, setEditCategory] = useState(category);
  const [editDescription, setEditDescription] = useState(description);
  const [editEstimateStr, setEditEstimateStr] = useState(String(estimate));

  useEffect(() => {
    setEditLabel(label);
    setEditStatus(status);
    setEditCategory(category);
    setEditDescription(description);
    setEditEstimateStr(String(estimate));
  }, [nodeId, label, status, category, description, estimate]);

  const handleSave = () => {
    const finalVal = estimateUnit === "SP"
      ? (parseInt(editEstimateStr) || 1)
      : (Math.round(parseFloat(editEstimateStr || "0") * 10) / 10 || 0.1);
    const fields: { label?: string; status?: string; category?: string; description?: string; estimate?: number } = {};
    if (editLabel !== label) fields.label = editLabel;
    if (editStatus !== status) fields.status = editStatus;
    if (editCategory !== category) fields.category = editCategory;
    if (editDescription !== description) fields.description = editDescription;
    if (finalVal !== estimate) fields.estimate = finalVal;
    setEditEstimateStr(String(finalVal));
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
            disabled={readOnly}
            style={inputStyle}
          />
        </div>

        <div>
          <div style={labelStyle}>ステータス</div>
          <select
            value={editStatus}
            onChange={(e) => setEditStatus(e.target.value)}
            disabled={readOnly}
            style={{ ...inputStyle, cursor: readOnly ? "default" : "pointer" }}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <div style={labelStyle}>カテゴリ</div>
          <select
            value={editCategory}
            onChange={(e) => setEditCategory(e.target.value)}
            disabled={readOnly}
            style={{ ...inputStyle, cursor: readOnly ? "default" : "pointer" }}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <div style={labelStyle}>説明</div>
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            disabled={readOnly}
            rows={5}
            style={{ ...inputStyle, resize: "vertical" as const }}
          />
        </div>

        <div>
          <div style={labelStyle}>{estimateUnit === "SP" ? "ストーリーポイント" : "工数 (MD)"}</div>
          {estimateUnit === "SP" ? (
            <select
              value={editEstimateStr}
              onChange={(e) => setEditEstimateStr(e.target.value)}
              disabled={readOnly}
              style={{ ...inputStyle, cursor: readOnly ? "default" : "pointer" }}
            >
              {[1, 2, 3, 5, 8, 13].map((sp) => (
                <option key={sp} value={String(sp)}>{sp}</option>
              ))}
            </select>
          ) : (
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={editEstimateStr}
              onChange={(e) => setEditEstimateStr(e.target.value)}
              onBlur={() => {
                const parsed = Math.round(parseFloat(editEstimateStr || "0") * 10) / 10;
                setEditEstimateStr(String(parsed > 0 ? parsed : 0.1));
              }}
              disabled={readOnly}
              style={inputStyle}
            />
          )}
        </div>

        {!readOnly && (
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
        )}
      </div>
    </div>
  );
}
