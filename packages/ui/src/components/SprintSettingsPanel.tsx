import { useState } from "react";

const smallInput = {
  width: 48,
  padding: "2px 4px",
  fontSize: 12,
  textAlign: "center" as const,
  background: "var(--vscode-input-background, #3c3c3c)",
  color: "var(--vscode-input-foreground, #ccc)",
  border: "1px solid var(--vscode-input-border, #555)",
  borderRadius: 3,
};

interface SprintSettingsPanelProps {
  velocity: number;
  sprintDays: number;
  onVelocityChange: (v: number) => void;
  onSprintDaysChange: (d: number) => void;
}

export function SprintSettingsPanel({ velocity, sprintDays, onVelocityChange, onSprintDaysChange }: SprintSettingsPanelProps) {
  const [vStr, setVStr] = useState(String(velocity));
  const [dStr, setDStr] = useState(String(sprintDays));

  return (
    <div
      style={{
        background: "var(--vscode-sideBar-background, #252526)",
        border: "1px solid var(--vscode-panel-border, #444)",
        borderRadius: 6,
        padding: "8px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        fontSize: 12,
        color: "var(--vscode-foreground, #ccc)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 11, opacity: 0.7 }}>Sprint 設定</div>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 10, opacity: 0.5 }}>Velocity</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input
              type="number" min="1" step="1" value={vStr}
              onChange={(e) => setVStr(e.target.value)}
              onBlur={() => { const v = parseInt(vStr) || 1; setVStr(String(v)); onVelocityChange(v); }}
              style={smallInput}
            />
            <span style={{ opacity: 0.5 }}>SP/Sprint</span>
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 10, opacity: 0.5 }}>Sprint期間</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input
              type="number" min="1" step="1" value={dStr}
              onChange={(e) => setDStr(e.target.value)}
              onBlur={() => { const d = parseInt(dStr) || 1; setDStr(String(d)); onSprintDaysChange(d); }}
              style={smallInput}
            />
            <span style={{ opacity: 0.5 }}>稼働日</span>
          </span>
        </div>
      </div>
    </div>
  );
}
