interface HeaderProps {
  completionDate: string | null;
  remainingHours: number;
}

export function Header({ completionDate, remainingHours }: HeaderProps) {
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
          <span style={{ opacity: 0.6 }}>残り {remainingHours}h</span>
        </>
      ) : (
        <span style={{ opacity: 0.6 }}>DAGを生成してください</span>
      )}
    </div>
  );
}
