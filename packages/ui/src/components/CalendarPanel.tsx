import { useState, useMemo } from "react";
import { getJpHolidays } from "@michinori/shared";

interface CalendarPanelProps {
  addedHolidays: string[];
  removedHolidays: string[];
  onUpdate: (addedHolidays: string[], removedHolidays: string[]) => void;
  onClose: () => void;
}

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function CalendarPanel({ addedHolidays, removedHolidays, onUpdate, onClose }: CalendarPanelProps) {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const added = useMemo(() => new Set(addedHolidays), [addedHolidays]);
  const removed = useMemo(() => new Set(removedHolidays), [removedHolidays]);

  const jpHolidays = useMemo(() => {
    const map = new Map<string, string>();
    getJpHolidays(viewYear).forEach((h) => map.set(h.date, h.name));
    return map;
  }, [viewYear]);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  function isDefaultHoliday(dateStr: string): boolean {
    const d = new Date(dateStr);
    const day = d.getDay();
    return day === 0 || day === 6 || jpHolidays.has(dateStr);
  }

  function isHoliday(dateStr: string): boolean {
    if (removed.has(dateStr)) return false;
    if (added.has(dateStr)) return true;
    return isDefaultHoliday(dateStr);
  }

  function toggleDay(dateStr: string) {
    const newAdded = new Set(added);
    const newRemoved = new Set(removed);
    const defaultOff = isDefaultHoliday(dateStr);

    if (isHoliday(dateStr)) {
      if (defaultOff) {
        newAdded.delete(dateStr);
        newRemoved.add(dateStr);
      } else {
        newAdded.delete(dateStr);
      }
    } else {
      if (defaultOff) {
        newRemoved.delete(dateStr);
      } else {
        newAdded.add(dateStr);
      }
    }

    onUpdate([...newAdded].sort(), [...newRemoved].sort());
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
        overflow: "hidden",
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
        <span>稼働日カレンダー</span>
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

      <div style={{ padding: "8px 16px" }}>
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
            const holiday = isHoliday(cell.dateStr);
            const isCustom = added.has(cell.dateStr) || removed.has(cell.dateStr);
            const holidayName = jpHolidays.get(cell.dateStr);
            const dayOfWeek = new Date(cell.dateStr).getDay();

            return (
              <div
                key={cell.dateStr}
                onClick={isPast ? undefined : () => toggleDay(cell.dateStr)}
                title={holidayName ?? (holiday ? "休日" : "稼働日")}
                style={{
                  padding: 4,
                  borderRadius: 4,
                  cursor: isPast ? "default" : "pointer",
                  opacity: isPast ? 0.3 : 1,
                  background: holiday ? "rgba(239, 68, 68, 0.2)" : "rgba(16, 185, 129, 0.15)",
                  color: holiday
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
          <div><span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 2, background: "rgba(16, 185, 129, 0.15)", verticalAlign: "middle", marginRight: 4 }} />稼働日</div>
          <div><span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 2, background: "rgba(239, 68, 68, 0.2)", verticalAlign: "middle", marginRight: 4 }} />休日</div>
          <div><span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 2, border: "1px solid #f59e0b", verticalAlign: "middle", marginRight: 4 }} />カスタム変更</div>
          <div style={{ marginTop: 4 }}>クリックで稼働日/休日を切り替え</div>
        </div>
      </div>
    </div>
  );
}

const navBtnStyle = {
  background: "none",
  border: "1px solid var(--vscode-panel-border, #444)",
  color: "var(--vscode-foreground, #ccc)",
  cursor: "pointer",
  borderRadius: 4,
  padding: "2px 8px",
  fontSize: 12,
} as const;
