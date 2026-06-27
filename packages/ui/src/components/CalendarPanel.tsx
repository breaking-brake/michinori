import { useState, useMemo } from "react";
import { getJpHolidays } from "@michinori/shared";

interface CalendarPanelProps {
  preset: string;
  customDayOff: string[];
  customDayOn: string[];
  onUpdate: (calendar: { preset?: string; customDayOff?: string[]; customDayOn?: string[] }) => void;
  onClose: () => void;
}

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function CalendarPanel({ preset, customDayOff, customDayOn, onUpdate, onClose }: CalendarPanelProps) {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const dayOffSet = useMemo(() => new Set(customDayOff), [customDayOff]);
  const dayOnSet = useMemo(() => new Set(customDayOn), [customDayOn]);

  const jpHolidays = useMemo(() => {
    const map = new Map<string, string>();
    getJpHolidays(viewYear).forEach((h) => map.set(h.date, h.name));
    return map;
  }, [viewYear]);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  function isDefaultWorkday(dateStr: string): boolean {
    const d = new Date(dateStr);
    const day = d.getDay();
    const isWeekend = day === 0 || day === 6;
    const isJpHoliday = jpHolidays.has(dateStr);

    if (preset === "weekend") {
      return isWeekend || isJpHoliday;
    }
    return !isWeekend && !isJpHoliday;
  }

  function isWorkday(dateStr: string): boolean {
    if (dayOnSet.has(dateStr)) return true;
    if (dayOffSet.has(dateStr)) return false;
    return isDefaultWorkday(dateStr);
  }

  function toggleDay(dateStr: string) {
    const newDayOff = new Set(dayOffSet);
    const newDayOn = new Set(dayOnSet);
    const defaultWork = isDefaultWorkday(dateStr);

    if (isWorkday(dateStr)) {
      if (defaultWork) {
        newDayOn.delete(dateStr);
        newDayOff.add(dateStr);
      } else {
        newDayOn.delete(dateStr);
      }
    } else {
      if (!defaultWork) {
        newDayOff.delete(dateStr);
        newDayOn.add(dateStr);
      } else {
        newDayOff.delete(dateStr);
      }
    }

    onUpdate({ customDayOff: [...newDayOff].sort(), customDayOn: [...newDayOn].sort() });
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  const cells: Array<{ day: number; dateStr: string } | null> = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, dateStr: toDateStr(viewYear, viewMonth, d) });
  }

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        width: 320,
        zIndex: 10,
        background: "var(--vscode-sideBar-background, #252526)",
        borderLeft: "1px solid var(--vscode-panel-border, #444)",
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
        color: "var(--vscode-foreground, #ccc)",
        fontSize: 13,
      }}
    >
      <div
        style={{
          padding: "10px 16px",
          borderBottom: "1px solid var(--vscode-panel-border, #444)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontWeight: 600,
        }}
      >
        <span>稼働日設定</span>
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

      <div style={{ padding: "12px 16px" }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 6 }}>稼働日プリセット</div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => onUpdate({ preset: "weekday", customDayOff: [], customDayOn: [] })}
              style={{ ...presetBtnStyle, ...(preset === "weekday" ? presetActiveStyle : {}) }}
            >
              平日稼働
            </button>
            <button
              onClick={() => onUpdate({ preset: "weekend", customDayOff: [], customDayOn: [] })}
              style={{ ...presetBtnStyle, ...(preset === "weekend" ? presetActiveStyle : {}) }}
            >
              休日稼働
            </button>
          </div>
          <div style={{ fontSize: 10, opacity: 0.5, marginTop: 4 }}>
            {preset === "weekday" ? "平日が稼働日（土日祝が休日）" : "土日祝が稼働日（平日が休日）"}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <button onClick={prevMonth} style={navBtnStyle}>◀</button>
          <span style={{ fontWeight: 600 }}>{viewYear}年 {viewMonth + 1}月</span>
          <button onClick={nextMonth} style={navBtnStyle}>▶</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, textAlign: "center" }}>
          {WEEKDAY_LABELS.map((label, i) => (
            <div
              key={label}
              style={{
                fontSize: 11,
                padding: 4,
                opacity: 0.5,
                color: i === 0 ? "#ef4444" : i === 6 ? "#3b82f6" : undefined,
              }}
            >
              {label}
            </div>
          ))}

          {cells.map((cell, i) => {
            if (!cell) return <div key={`empty-${i}`} />;

            const isPast = cell.dateStr < todayStr;
            const workday = isWorkday(cell.dateStr);
            const isCustom = dayOffSet.has(cell.dateStr) || dayOnSet.has(cell.dateStr);
            const holidayName = jpHolidays.get(cell.dateStr);
            const dayOfWeek = new Date(cell.dateStr).getDay();

            return (
              <div
                key={cell.dateStr}
                onClick={isPast ? undefined : () => toggleDay(cell.dateStr)}
                title={holidayName ?? (workday ? "稼働日" : "休日")}
                style={{
                  padding: 4,
                  borderRadius: 4,
                  cursor: isPast ? "default" : "pointer",
                  opacity: isPast ? 0.3 : 1,
                  background: workday ? "rgba(16, 185, 129, 0.35)" : "rgba(239, 68, 68, 0.2)",
                  color: !workday
                    ? "#ef4444"
                    : dayOfWeek === 0
                      ? "#ef4444"
                      : dayOfWeek === 6
                        ? "#3b82f6"
                        : "var(--vscode-foreground, #ccc)",
                  border: isCustom ? "1px solid #f59e0b" : "1px solid transparent",
                  fontSize: 12,
                  lineHeight: "24px",
                }}
              >
                {cell.day}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 12, fontSize: 11, opacity: 0.6, lineHeight: 1.6 }}>
          <div><span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 2, background: "rgba(16, 185, 129, 0.35)", verticalAlign: "middle", marginRight: 4 }} />稼働日</div>
          <div><span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 2, background: "rgba(239, 68, 68, 0.2)", verticalAlign: "middle", marginRight: 4 }} />休日</div>
          <div><span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 2, border: "1px solid #f59e0b", verticalAlign: "middle", marginRight: 4 }} />個別変更</div>
          <div style={{ marginTop: 4 }}>日付クリックで個別に切り替え</div>
        </div>
      </div>
    </div>
  );
}

const presetBtnStyle = {
  flex: 1,
  padding: "6px 8px",
  background: "var(--vscode-button-secondaryBackground, #3a3d41)",
  color: "var(--vscode-button-secondaryForeground, #ccc)",
  border: "1px solid var(--vscode-panel-border, #444)",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 12,
} as const;

const presetActiveStyle = {
  background: "var(--vscode-button-background, #0e639c)",
  color: "var(--vscode-button-foreground, #fff)",
  borderColor: "var(--vscode-button-background, #0e639c)",
} as const;

const navBtnStyle = {
  background: "none",
  border: "1px solid var(--vscode-panel-border, #444)",
  color: "var(--vscode-foreground, #ccc)",
  cursor: "pointer",
  borderRadius: 4,
  padding: "2px 8px",
  fontSize: 12,
} as const;
