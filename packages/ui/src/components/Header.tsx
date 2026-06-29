import { useState } from "react";
import type { QuotaInfo } from "../types";

function SprintInputs({ velocity, sprintDays, onVelocityChange, onSprintDaysChange }: {
  velocity: number; sprintDays: number;
  onVelocityChange: (v: number) => void; onSprintDaysChange: (d: number) => void;
}) {
  const [vStr, setVStr] = useState(String(velocity));
  const [dStr, setDStr] = useState(String(sprintDays));
  const smallInput = {
    width: 48, padding: "2px 4px", fontSize: 12, textAlign: "center" as const,
    background: "var(--vscode-input-background, #3c3c3c)",
    color: "var(--vscode-input-foreground, #ccc)",
    border: "1px solid var(--vscode-input-border, #555)",
    borderRadius: 3,
  };
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, opacity: 0.7 }}>
      Velocity
      <input type="number" min="1" step="1" value={vStr}
        onChange={(e) => setVStr(e.target.value)}
        onBlur={() => { const v = parseInt(vStr) || 1; setVStr(String(v)); onVelocityChange(v); }}
        style={smallInput} />
      SP /
      <input type="number" min="1" step="1" value={dStr}
        onChange={(e) => setDStr(e.target.value)}
        onBlur={() => { const d = parseInt(dStr) || 1; setDStr(String(d)); onSprintDaysChange(d); }}
        style={smallInput} />
      日
    </span>
  );
}

const headerBtnStyle = {
  padding: "4px 12px",
  background: "transparent",
  color: "var(--vscode-foreground, #ccc)",
  border: "1px solid var(--vscode-panel-border, #444)",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 12,
  opacity: 0.7,
} as const;

interface HeaderProps {
  completionDate: string | null;
  remaining: number;
  repoUrl?: string;
  summary?: string;
  showCriticalPath?: boolean;
  onToggleCriticalPath?: () => void;
  onReset?: () => void;
  onSave?: () => void;
  onLoad?: () => void;
  onCalendar?: () => void;
  onChat?: () => void;
  quota?: QuotaInfo | null;
  estimateUnit?: string;
  estimateMode?: string;
  velocity?: number;
  sprintDays?: number;
  onVelocityChange?: (v: number) => void;
  onSprintDaysChange?: (d: number) => void;
}

export function Header({ completionDate, remaining, repoUrl, summary, showCriticalPath, onToggleCriticalPath, onReset, onSave, onLoad, onCalendar, onChat, quota, estimateUnit = "MD", estimateMode, velocity = 20, sprintDays = 10, onVelocityChange, onSprintDaysChange }: HeaderProps) {
  return (
    <div
      style={{
        borderBottom: "1px solid var(--vscode-panel-border, #444)",
        background: "var(--vscode-sideBar-background, #252526)",
        color: "var(--vscode-foreground, #ccc)",
      }}
    >
    <div
      style={{
        padding: "8px 16px",
        display: "flex",
        alignItems: "center",
        gap: 16,
        fontSize: 13,
      }}
    >
      <span style={{ fontWeight: 700, fontSize: 15 }}>
        Michinori{quota && !quota.isAdmin && <span style={{ fontWeight: 400, opacity: 0.5 }}>: Demo</span>}
      </span>
      {completionDate ? (
        <>
          <span>
            完了予定: <strong>{completionDate}</strong>
          </span>
          <span style={{ opacity: 0.6 }}>残り {remaining}{estimateUnit}</span>
          {estimateMode === "sp" && onVelocityChange && onSprintDaysChange && (
            <SprintInputs
              velocity={velocity}
              sprintDays={sprintDays}
              onVelocityChange={onVelocityChange}
              onSprintDaysChange={onSprintDaysChange}
            />
          )}
          {onCalendar && (
            <button onClick={onCalendar} style={headerBtnStyle}>稼働日設定</button>
          )}
          {onToggleCriticalPath && (
            <button
              onClick={onToggleCriticalPath}
              style={{
                ...headerBtnStyle,
                opacity: 1,
                background: showCriticalPath ? "rgba(239, 68, 68, 0.2)" : "transparent",
                borderColor: showCriticalPath ? "#ef4444" : "var(--vscode-panel-border, #444)",
                color: showCriticalPath ? "#ef4444" : "var(--vscode-foreground, #ccc)",
              }}
            >
              クリティカルパス {showCriticalPath ? "ON" : "OFF"}
            </button>
          )}
        </>
      ) : (
        <span style={{ opacity: 0.6 }}>DAGを生成してください</span>
      )}
      <span style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
        {quota && (
          quota.isAdmin ? (
            <span style={{ fontSize: 11, marginRight: 4, padding: "2px 8px", borderRadius: 4, background: "rgba(16, 185, 129, 0.2)", color: "#10b981" }}>
              管理者モード
            </span>
          ) : quota.limit > 0 ? (
            <span style={{ fontSize: 11, opacity: 0.6, marginRight: 4 }}>
              リクエスト制限 残り {quota.remaining}/{quota.limit} 回
            </span>
          ) : null
        )}
        {onChat && (
          <button onClick={onChat} style={{ ...headerBtnStyle, background: "var(--vscode-button-background, #0e639c)", color: "#fff", opacity: 1 }}>AI相談</button>
        )}
        {onLoad && (
          <button onClick={onLoad} style={headerBtnStyle}>読込</button>
        )}
        {completionDate && onSave && (
          <button onClick={onSave} style={headerBtnStyle}>保存</button>
        )}
        {completionDate && onReset && (
          <button onClick={onReset} style={headerBtnStyle}>リセット</button>
        )}
      </span>
    </div>
    {completionDate && repoUrl && (
      <div
        style={{
          padding: "4px 16px 6px",
          fontSize: 11,
          opacity: 0.6,
          display: "flex",
          gap: 16,
          overflow: "hidden",
        }}
      >
        <span style={{ flexShrink: 0 }}>{repoUrl}</span>
        {summary && (
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {summary}
          </span>
        )}
      </div>
    )}
    </div>
  );
}
