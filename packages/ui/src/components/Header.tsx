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
  remainingMd: number;
  onReset?: () => void;
  onSave?: () => void;
  onLoad?: () => void;
  onCalendar?: () => void;
  onChat?: () => void;
}

export function Header({ completionDate, remainingMd, onReset, onSave, onLoad, onCalendar, onChat }: HeaderProps) {
  return (
    <div
      style={{
        padding: "8px 16px",
        borderBottom: "1px solid var(--vscode-panel-border, #444)",
        display: "flex",
        alignItems: "center",
        gap: 16,
        background: "var(--vscode-sideBar-background, #252526)",
        color: "var(--vscode-foreground, #ccc)",
        fontSize: 13,
      }}
    >
      <span style={{ fontWeight: 700, fontSize: 15 }}>Michinori</span>
      {completionDate ? (
        <>
          <span>
            完了予定: <strong>{completionDate}</strong>
          </span>
          <span style={{ opacity: 0.6 }}>残り {remainingMd}MD</span>
          {onCalendar && (
            <button onClick={onCalendar} style={headerBtnStyle}>稼働日設定</button>
          )}
        </>
      ) : (
        <span style={{ opacity: 0.6 }}>DAGを生成してください</span>
      )}
      <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
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
  );
}
