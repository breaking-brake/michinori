import { useState } from "react";
import type { QuotaInfo } from "../types";

const inputStyle = {
  padding: "6px 10px",
  background: "var(--vscode-input-background, #3c3c3c)",
  color: "var(--vscode-input-foreground, #ccc)",
  border: "1px solid var(--vscode-input-border, #555)",
  borderRadius: 4,
  fontSize: 13,
} as const;

const radioLabelStyle = {
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 4,
  fontSize: 13,
  color: "var(--vscode-foreground, #ccc)",
} as const;

interface InputPanelProps {
  onSubmit: (repoUrl: string, prompt: string) => void;
  loading: boolean;
  defaultRepoUrl?: string;
  defaultPrompt?: string;
  quota?: QuotaInfo | null;
  estimateMode?: string;
  onEstimateModeChange?: (mode: string) => void;
  velocity?: number;
  sprintDays?: number;
  onVelocityChange?: (v: number) => void;
  onSprintDaysChange?: (d: number) => void;
}

export function InputPanel({
  onSubmit,
  loading,
  defaultRepoUrl = "",
  defaultPrompt = "",
  quota,
  estimateMode = "md",
  onEstimateModeChange,
  velocity = 20,
  sprintDays = 10,
  onVelocityChange,
  onSprintDaysChange,
}: InputPanelProps) {
  const [repoUrl, setRepoUrl] = useState(defaultRepoUrl);
  const [prompt, setPrompt] = useState(defaultPrompt);

  const canSubmit = repoUrl && prompt && !loading;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(repoUrl, prompt);
  };

  return (
    <div
      style={{
        padding: 16,
        borderBottom: "1px solid var(--vscode-panel-border, #444)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        background: "var(--vscode-sideBar-background, #252526)",
      }}
    >
      <input
        type="text"
        placeholder="https://github.com/owner/repo"
        value={repoUrl}
        onChange={(e) => setRepoUrl(e.target.value)}
        style={inputStyle}
      />
      <textarea
        placeholder="実現したいことを記述してください"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={3}
        style={{ ...inputStyle, resize: "vertical" as const }}
      />

      {onEstimateModeChange && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 11, opacity: 0.6 }}>見積もり単位</div>
          <div style={{ display: "flex", gap: 16 }}>
            <label style={radioLabelStyle}>
              <input
                type="radio"
                name="estimateMode"
                value="md"
                checked={estimateMode === "md"}
                onChange={() => onEstimateModeChange("md")}
              />
              人日 (MD)
            </label>
            <label style={radioLabelStyle}>
              <input
                type="radio"
                name="estimateMode"
                value="sp"
                checked={estimateMode === "sp"}
                onChange={() => onEstimateModeChange("sp")}
              />
              ストーリーポイント (SP)
            </label>
          </div>

          {estimateMode === "sp" && onVelocityChange && onSprintDaysChange && (
            <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 2 }}>ベロシティ (SP/スプリント)</div>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={velocity}
                  onChange={(e) => onVelocityChange(parseInt(e.target.value) || 1)}
                  style={{ ...inputStyle, width: "100%" }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 2 }}>スプリント期間 (稼働日)</div>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={sprintDays}
                  onChange={(e) => onSprintDaysChange(parseInt(e.target.value) || 1)}
                  style={{ ...inputStyle, width: "100%" }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        style={{
          padding: "6px 16px",
          background: "var(--vscode-button-background, #0e639c)",
          color: "var(--vscode-button-foreground, #fff)",
          border: "none",
          borderRadius: 4,
          cursor: loading ? "wait" : "pointer",
          fontSize: 13,
          opacity: canSubmit ? 1 : 0.5,
        }}
      >
        {loading ? "生成中..." : "DAGを生成"}
      </button>
      {quota && !quota.isAdmin && quota.limit > 0 && (
        <div style={{ fontSize: 11, opacity: 0.5, textAlign: "center" }}>
          サービス全体で1日あたり{quota.limit}回まで利用可能
        </div>
      )}
    </div>
  );
}
