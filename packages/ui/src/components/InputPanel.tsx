import { useState } from "react";

interface InputPanelProps {
  onSubmit: (repoUrl: string, prompt: string) => void;
  loading: boolean;
}

export function InputPanel({ onSubmit, loading }: InputPanelProps) {
  const [repoUrl, setRepoUrl] = useState("");
  const [prompt, setPrompt] = useState("");

  const handleSubmit = () => {
    if (!repoUrl || !prompt) return;
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
        style={{
          padding: "6px 10px",
          background: "var(--vscode-input-background, #3c3c3c)",
          color: "var(--vscode-input-foreground, #ccc)",
          border: "1px solid var(--vscode-input-border, #555)",
          borderRadius: 4,
          fontSize: 13,
        }}
      />
      <textarea
        placeholder="実現したいことを記述してください"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={3}
        style={{
          padding: "6px 10px",
          background: "var(--vscode-input-background, #3c3c3c)",
          color: "var(--vscode-input-foreground, #ccc)",
          border: "1px solid var(--vscode-input-border, #555)",
          borderRadius: 4,
          fontSize: 13,
          resize: "vertical",
        }}
      />
      <button
        onClick={handleSubmit}
        disabled={loading || !repoUrl || !prompt}
        style={{
          padding: "6px 16px",
          background: "var(--vscode-button-background, #0e639c)",
          color: "var(--vscode-button-foreground, #fff)",
          border: "none",
          borderRadius: 4,
          cursor: loading ? "wait" : "pointer",
          fontSize: 13,
          opacity: loading || !repoUrl || !prompt ? 0.5 : 1,
        }}
      >
        {loading ? "生成中..." : "DAGを生成"}
      </button>
    </div>
  );
}
