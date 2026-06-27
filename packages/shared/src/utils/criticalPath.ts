import holiday_jp from "@holiday-jp/holiday_jp";
import type { DagNode as DagNodeType, DagDerived as DagDerivedType, NodeStatus as NodeStatusType } from "../schema/dag.js";

function getRemainingMd(node: DagNodeType): number {
  switch (node.status as NodeStatusType) {
    case "完了":
      return 0;
    case "進行中":
      return node.estimateMd * 0.5;
    case "PR Open":
      return 0;
    case "未着手":
    default:
      return node.estimateMd;
  }
}

export function computeCriticalPath(nodes: DagNodeType[]): DagDerivedType {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();

  // Topological sort (Kahn's algorithm)
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

  // Longest path DP
  for (const id of sorted) {
    const node = nodeMap.get(id)!;
    const remaining = getRemainingMd(node);

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

  // Find leaf with longest distance
  let maxDist = 0;
  let maxId: string | null = null;
  for (const [id, d] of dist) {
    if (d >= maxDist) {
      maxDist = d;
      maxId = id;
    }
  }

  // Trace back critical path
  const criticalPath: string[] = [];
  let current = maxId;
  while (current) {
    criticalPath.unshift(current);
    current = prev.get(current) ?? null;
  }

  const totalEstimateMd = nodes.reduce((sum, n) => sum + n.estimateMd, 0);
  const remainingMd = maxDist;

  return {
    criticalPath,
    estimatedCompletionDate: computeCompletionDate(remainingMd),
    totalEstimateMd,
    remainingMd,
  };
}

function getJpHolidayDates(year: number): Set<string> {
  const holidays = holiday_jp.between(new Date(`${year}-01-01`), new Date(`${year}-12-31`));
  return new Set(holidays.map((h: { date: Date }) => h.date.toISOString().split("T")[0]));
}

function isWorkingDay(date: Date, holidayCache: Map<number, Set<string>>): boolean {
  const day = date.getDay();
  if (day === 0 || day === 6) return false;

  const year = date.getFullYear();
  if (!holidayCache.has(year)) {
    holidayCache.set(year, getJpHolidayDates(year));
  }
  const dateStr = date.toISOString().split("T")[0];
  return !holidayCache.get(year)!.has(dateStr);
}

function computeCompletionDate(remainingMd: number): string {
  if (remainingMd <= 0) return new Date().toISOString().split("T")[0];

  let daysNeeded = Math.ceil(remainingMd);
  const date = new Date();
  const holidayCache = new Map<number, Set<string>>();

  while (daysNeeded > 0) {
    date.setDate(date.getDate() + 1);
    if (isWorkingDay(date, holidayCache)) {
      daysNeeded--;
    }
  }

  return date.toISOString().split("T")[0];
}
