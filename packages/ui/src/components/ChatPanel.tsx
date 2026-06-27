import { useState, useRef, useEffect } from "react";
import type { ChatMessage } from "../types";
import type { DagProposalType } from "@michinori/shared";

interface ChatPanelProps {
  messages: ChatMessage[];
  loading: boolean;
  onSendMessage: (message: string) => void;
  onApplyProposal: (proposal: DagProposalType) => void;
  onClose: () => void;
}

function ProposalBlock({ proposal, onApply }: { proposal: DagProposalType; onApply: () => void }) {
  return (
    <div
      style={{
        margin: "8px 0",
        padding: 10,
        borderRadius: 6,
        border: "1px solid #3b82f6",
        background: "rgba(59,130,246,0.1)",
        fontSize: 12,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6, color: "#93c5fd" }}>DAG変更提案</div>
      <div style={{ opacity: 0.8, marginBottom: 8 }}>{proposal.reasoning}</div>
      {proposal.additions.length > 0 && (
        <div style={{ marginBottom: 4 }}>
          <span style={{ color: "#4ade80" }}>追加:</span>{" "}
          {proposal.additions.map((n) => n.label).join(", ")}
        </div>
      )}
      {proposal.removals.length > 0 && (
        <div style={{ marginBottom: 4 }}>
          <span style={{ color: "#f87171" }}>削除:</span>{" "}
          {proposal.removals.join(", ")}
        </div>
      )}
      {proposal.modifications.length > 0 && (
        <div style={{ marginBottom: 4 }}>
          <span style={{ color: "#fbbf24" }}>変更:</span>{" "}
          {proposal.modifications.map((m) => m.nodeId).join(", ")}
        </div>
      )}
      <button
        onClick={onApply}
        style={{
          marginTop: 6,
          padding: "6px 16px",
          background: "#3b82f6",
          color: "#fff",
          border: "none",
          borderRadius: 4,
          cursor: "pointer",
          fontSize: 12,
          width: "100%",
        }}
      >
        DAGに反映
      </button>
    </div>
  );
}

export function ChatPanel({ messages, loading, onSendMessage, onApplyProposal, onClose }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    onSendMessage(trimmed);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        width: 360,
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
        <span>AIアシスタント</span>
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
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {messages.length === 0 && (
          <div style={{ opacity: 0.5, fontSize: 12, textAlign: "center", marginTop: 20 }}>
            DAGについて質問や変更の相談ができます
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i}>
            <div
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                fontSize: 13,
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
                ...(msg.role === "user"
                  ? {
                      background: "var(--vscode-button-background, #0e639c)",
                      color: "#fff",
                      marginLeft: 40,
                      borderBottomRightRadius: 2,
                    }
                  : {
                      background: "var(--vscode-editor-background, #1e1e1e)",
                      color: "var(--vscode-foreground, #ccc)",
                      marginRight: 40,
                      borderBottomLeftRadius: 2,
                    }),
              }}
            >
              {msg.content}
            </div>
            {msg.proposal && (
              <ProposalBlock
                proposal={msg.proposal}
                onApply={() => onApplyProposal(msg.proposal!)}
              />
            )}
          </div>
        ))}
        {loading && (
          <div style={{ opacity: 0.5, fontSize: 12 }}>考え中...</div>
        )}
      </div>

      <div
        style={{
          padding: "8px 12px",
          borderTop: "1px solid var(--vscode-panel-border, #444)",
          display: "flex",
          gap: 8,
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="メッセージを入力..."
          rows={2}
          disabled={loading}
          style={{
            flex: 1,
            padding: "6px 10px",
            background: "var(--vscode-input-background, #3c3c3c)",
            color: "var(--vscode-input-foreground, #ccc)",
            border: "1px solid var(--vscode-input-border, #555)",
            borderRadius: 4,
            fontSize: 13,
            resize: "none",
          }}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{
            padding: "6px 12px",
            background: "var(--vscode-button-background, #0e639c)",
            color: "var(--vscode-button-foreground, #fff)",
            border: "none",
            borderRadius: 4,
            cursor: loading ? "wait" : "pointer",
            fontSize: 13,
            opacity: loading || !input.trim() ? 0.5 : 1,
            alignSelf: "flex-end",
          }}
        >
          送信
        </button>
      </div>
    </div>
  );
}
