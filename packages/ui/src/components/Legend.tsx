import { STATUS_DEFINITIONS, CATEGORY_DEFINITIONS } from "@michinori/shared";

const sectionStyle = {
  marginBottom: 8,
} as const;

const titleStyle = {
  fontSize: 10,
  fontWeight: 700,
  opacity: 0.5,
  marginBottom: 4,
  textTransform: "uppercase" as const,
  letterSpacing: 1,
};

const itemStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 11,
  marginBottom: 2,
} as const;

function ColorDot({ color }: { color: string }) {
  return (
    <span
      style={{
        width: 10,
        height: 10,
        borderRadius: 3,
        background: color,
        flexShrink: 0,
      }}
    />
  );
}

function LineIndicator({ color, dashed }: { color: string; dashed?: boolean }) {
  return (
    <span
      style={{
        width: 18,
        height: 0,
        borderTop: `${dashed ? "2px dashed" : "3px solid"} ${color}`,
        flexShrink: 0,
      }}
    />
  );
}

export function Legend() {
  return (
    <div
      style={{
        padding: "10px 14px",
        background: "rgba(30, 30, 30, 0.9)",
        border: "1px solid var(--vscode-panel-border, #444)",
        borderRadius: 6,
        color: "var(--vscode-foreground, #ccc)",
        backdropFilter: "blur(4px)",
        maxWidth: 180,
      }}
    >
      <div style={sectionStyle}>
        <div style={titleStyle}>エッジ</div>
        <div style={itemStyle}>
          <LineIndicator color="#ef4444" />
          <span>クリティカルパス</span>
        </div>
        <div style={itemStyle}>
          <LineIndicator color="#666" dashed />
          <span>依存関係</span>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={titleStyle}>ステータス</div>
        {STATUS_DEFINITIONS.map((s) => (
          <div key={s.value} style={itemStyle}>
            <ColorDot color={s.color} />
            <span>{s.value}</span>
          </div>
        ))}
      </div>

      <div>
        <div style={titleStyle}>カテゴリ</div>
        {CATEGORY_DEFINITIONS.map((c) => (
          <div key={c.value} style={itemStyle}>
            <ColorDot color={c.color} />
            <span>{c.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
