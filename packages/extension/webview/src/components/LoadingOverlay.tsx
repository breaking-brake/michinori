export function LoadingOverlay() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        style={{
          padding: "16px 32px",
          background: "var(--vscode-sideBar-background, #252526)",
          borderRadius: 8,
          color: "var(--vscode-foreground, #ccc)",
          fontSize: 14,
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        }}
      >
        AIがコードを解析しています...
      </div>
    </div>
  );
}
