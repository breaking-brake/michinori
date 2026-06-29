import holiday_jp from "@holiday-jp/holiday_jp";
import type { DagNode as DagNodeType, DagDerived as DagDerivedType, NodeStatus as NodeStatusType, CalendarConfig as CalendarConfigType, SprintConfig as SprintConfigType, EstimateMode as EstimateModeType } from "../schema/dag.js";

function getRemaining(node: DagNodeType, estimateMode: EstimateModeType = "md"): number {
  if (node.status === "完了") return 0;
  if (estimateMode === "sp") return node.estimate;
  switch (node.status as NodeStatusType) {
    case "進行中":
      return node.estimate * 0.5;
    case "PR Open":
      return 0;
    case "未着手":
    default:
      return node.estimate;
  }
}

export interface CriticalPathOptions {
  estimateMode?: EstimateModeType;
  calendar?: CalendarConfigType;
  sprint?: SprintConfigType;
}

export function computeCriticalPath(nodes: DagNodeType[], options?: CriticalPathOptions): DagDerivedType {
  const calendar = options?.calendar;
  const estimateMode = options?.estimateMode ?? "md";
  const sprint = options?.sprint;

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();

  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adj.set(node.id, []);
  }
  for (const node of nodes) {
    for (const dep of node.dependencies) {
      adj.get(dep)?.push(node.id);
      inDegree.set(node.id, (inDegree.get(node.id) ?? 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    sorted.push(id);
    for (const next of adj.get(id) ?? []) {
      const newDeg = (inDegree.get(next) ?? 1) - 1;
      inDegree.set(next, newDeg);
      if (newDeg === 0) queue.push(next);
    }
  }

  for (const id of sorted) {
    const node = nodeMap.get(id)!;
    const remaining = getRemaining(node, estimateMode);

    let maxPredDist = 0;
    let maxPred: string | null = null;

    for (const dep of node.dependencies) {
      const d = dist.get(dep) ?? 0;
      if (d > maxPredDist) {
        maxPredDist = d;
        maxPred = dep;
      }
    }

    dist.set(id, maxPredDist + remaining);
    prev.set(id, maxPred);
  }

  let maxDist = 0;
  let maxId: string | null = null;
  for (const [id, d] of dist) {
    if (d >= maxDist) {
      maxDist = d;
      maxId = id;
    }
  }

  const criticalPath: string[] = [];
  let current = maxId;
  while (current) {
    criticalPath.unshift(current);
    current = prev.get(current) ?? null;
  }

  const totalEstimate = nodes.reduce((sum, n) => sum + n.estimate, 0);
  const remaining = maxDist;

  let estimatedCompletionDate: string;
  if (estimateMode === "sp" && sprint) {
    estimatedCompletionDate = computeCompletionDateSp(totalEstimate, remaining, sprint, calendar);
  } else {
    estimatedCompletionDate = computeCompletionDateMd(remaining, calendar);
  }

  return {
    criticalPath,
    estimatedCompletionDate,
    totalEstimate,
    remaining,
  };
}

function computeCompletionDateSp(
  totalSp: number,
  _remainingCritical: number,
  sprint: SprintConfigType,
  calendar?: CalendarConfigType,
): string {
  const remainingSp = totalSp;
  if (remainingSp <= 0 || sprint.velocity <= 0) return new Date().toISOString().split("T")[0];

  const sprintsNeeded = Math.ceil(remainingSp / sprint.velocity);
  const calendarDays = sprintsNeeded * sprint.sprintDays;

  const date = new Date();
  const holidayCache = new Map<number, Set<string>>();
  const preset = calendar?.preset ?? "weekday";
  const customDayOff = new Set(calendar?.customDayOff ?? []);
  const customDayOn = new Set(calendar?.customDayOn ?? []);

  let workingDaysCount = 0;
  while (workingDaysCount < calendarDays) {
    date.setDate(date.getDate() + 1);
    if (isWorkingDay(date, holidayCache, preset, customDayOff, customDayOn)) {
      workingDaysCount++;
    }
  }

  return date.toISOString().split("T")[0];
}

export function getJpHolidays(year: number): Array<{ date: string; name: string }> {
  const holidays = holiday_jp.between(new Date(`${year}-01-01`), new Date(`${year}-12-31`));
  return holidays.map((h: { date: Date; name: string }) => ({
    date: h.date.toISOString().split("T")[0],
    name: h.name,
  }));
}

function getJpHolidayDates(year: number): Set<string> {
  const holidays = holiday_jp.between(new Date(`${year}-01-01`), new Date(`${year}-12-31`));
  return new Set(holidays.map((h: { date: Date }) => h.date.toISOString().split("T")[0]));
}

function isWorkingDay(
  date: Date,
  holidayCache: Map<number, Set<string>>,
  preset: string,
  customDayOff: Set<string>,
  customDayOn: Set<string>,
): boolean {
  const dateStr = date.toISOString().split("T")[0];

  if (customDayOn.has(dateStr)) return true;
  if (customDayOff.has(dateStr)) return false;

  const day = date.getDay();
  const isWeekend = day === 0 || day === 6;
  const year = date.getFullYear();
  if (!holidayCache.has(year)) {
    holidayCache.set(year, getJpHolidayDates(year));
  }
  const isJpHoliday = holidayCache.get(year)!.has(dateStr);

  if (preset === "weekend") {
    return isWeekend || isJpHoliday;
  }
  return !isWeekend && !isJpHoliday;
}

function computeCompletionDateMd(remainingMd: number, calendar?: CalendarConfigType): string {
  if (remainingMd <= 0) return new Date().toISOString().split("T")[0];

  let daysNeeded = Math.ceil(remainingMd);
  const date = new Date();
  const holidayCache = new Map<number, Set<string>>();
  const preset = calendar?.preset ?? "weekday";
  const customDayOff = new Set(calendar?.customDayOff ?? []);
  const customDayOn = new Set(calendar?.customDayOn ?? []);

  while (daysNeeded > 0) {
    date.setDate(date.getDate() + 1);
    if (isWorkingDay(date, holidayCache, preset, customDayOff, customDayOn)) {
      daysNeeded--;
    }
  }

  return date.toISOString().split("T")[0];
}
