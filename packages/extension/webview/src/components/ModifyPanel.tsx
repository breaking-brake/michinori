import { useState } from "react";

interface ModifyPanelProps {
  onSubmit: (prompt: string) => void;
  loading: boolean;
}

export function ModifyPanel({ onSubmit, loading }: ModifyPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [expanded, setExpanded] = useState(false);

  const handleSubmit = () => {
    if (!prompt) return;
    onSubmit(prompt);
    setPrompt("");
    setExpanded(false);
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        style={{
          position: "absolute",
          bottom: 16,
          right: 16,
          zIndex: 10,
          padding: "8px 16px",
          background: "var(--vscode-button-background, #0e639c)",
          color: "var(--vscode-button-foreground, #fff)",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
          fontSize: 13,
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        }}
      >
        DAGを修正
      </button>
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        bottom: 16,
        right: 16,
        zIndex: 10,
        width: 320,
        background: "var(--vscode-sideBar-background, #252526)",
        border: "1px solid var(--vscode-panel-border, #444)",
        borderRadius: 8,
        padding: 12,
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <textarea
        placeholder="修正指示を入力してください"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={3}
        autoFocus
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
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={handleSubmit}
          disabled={loading || !prompt}
          style={{
            flex: 1,
            padding: "6px 12px",
            background: "var(--vscode-button-background, #0e639c)",
            color: "var(--vscode-button-foreground, #fff)",
            border: "none",
            borderRadius: 4,
            cursor: loading ? "wait" : "pointer",
            fontSize: 13,
            opacity: loading || !prompt ? 0.5 : 1,
          }}
        >
          {loading ? "修正中..." : "送信"}
        </button>
        <button
          onClick={() => setExpanded(false)}
          style={{
            padding: "6px 12px",
            background: "transparent",
            color: "var(--vscode-foreground, #ccc)",
            border: "1px solid var(--vscode-panel-border, #444)",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
