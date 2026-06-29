import { useState } from "react";

const fieldStyle = {
  padding: "4px 6px",
  fontSize: 13,
  background: "var(--vscode-input-background, #3c3c3c)",
  color: "var(--vscode-input-foreground, #ccc)",
  border: "1px solid var(--vscode-input-border, #555)",
  borderRadius: 3,
  height: 28,
  boxSizing: "border-box" as const,
};

interface SprintSettingsPanelProps {
  velocity: number;
  sprintDays: number;
  onVelocityChange: (v: number) => void;
  onSprintDaysChange: (d: number) => void;
}

export function SprintSettingsPanel({ velocity, sprintDays, onVelocityChange, onSprintDaysChange }: SprintSettingsPanelProps) {
  const [vStr, setVStr] = useState(String(velocity));

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
      <div style={{ fontWeight: 600, fontSize: 13, opacity: 0.8 }}>Sprint 設定</div>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 12, opacity: 0.7 }}>Velocity (SP/Sprint)</span>
          <input
            type="number" min="1" step="1" value={vStr}
            onChange={(e) => setVStr(e.target.value)}
            onBlur={() => { const v = parseInt(vStr) || 1; setVStr(String(v)); onVelocityChange(v); }}
            style={{ ...fieldStyle, width: 80, textAlign: "center" as const }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 12, opacity: 0.7 }}>Sprint期間</span>
          <select
            value={sprintDays}
            onChange={(e) => onSprintDaysChange(parseInt(e.target.value))}
            style={{ ...fieldStyle, width: "auto", cursor: "pointer" }}
          >
            <option value="5">1週間 (5日)</option>
            <option value="10">2週間 (10日)</option>
            <option value="15">3週間 (15日)</option>
            <option value="20">4週間 (20日)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
