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

interface InputPanelProps {
  onSubmit: (repoUrl: string, prompt: string) => void;
  loading: boolean;
  defaultRepoUrl?: string;
  defaultPrompt?: string;
  quota?: QuotaInfo | null;
}

export function InputPanel({ onSubmit, loading, defaultRepoUrl = "", defaultPrompt = "", quota }: InputPanelProps) {
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
          Demo版: 1日あたり{quota.limit}回まで利用可能
        </div>
      )}
    </div>
  );
}
