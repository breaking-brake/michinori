import { z } from "zod";

export const STATUS_DEFINITIONS = [
  { value: "未着手", description: "not started", color: "#6b7280" },
  { value: "進行中", description: "in progress", color: "#3b82f6" },
  { value: "PR Open", description: "pull request open, awaiting review", color: "#f59e0b" },
  { value: "完了", description: "done", color: "#10b981" },
] as const;

export const CATEGORY_DEFINITIONS = [
  { value: "実装", description: "code changes", color: "#8b5cf6" },
  { value: "調査", description: "research, PoC, library evaluation", color: "#06b6d4" },
  { value: "設計", description: "architecture, API design, schema design", color: "#f97316" },
  { value: "テスト", description: "test writing, QA, E2E testing, manual verification", color: "#ec4899" },
  { value: "その他", description: "CI setup, docs, env config, approvals", color: "#6b7280" },
] as const;

const statusValues = STATUS_DEFINITIONS.map((s) => s.value) as [string, ...string[]];
const categoryValues = CATEGORY_DEFINITIONS.map((c) => c.value) as [string, ...string[]];

export const NodeStatus = z.enum(statusValues);
export type NodeStatus = z.infer<typeof NodeStatus>;

export const NodeCategory = z.enum(categoryValues);
export type NodeCategory = z.infer<typeof NodeCategory>;

export const DagNode = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string(),
  estimateMd: z.number().positive(),
  category: NodeCategory.default("実装"),
  status: NodeStatus.default("未着手"),
  dependencies: z.array(z.string()).default([]),
  position: z
    .object({
      x: z.number(),
      y: z.number(),
    })
    .optional(),
});
export type DagNode = z.infer<typeof DagNode>;

export const DagDerived = z.object({
  criticalPath: z.array(z.string()),
  estimatedCompletionDate: z.string(),
  totalEstimateMd: z.number(),
  remainingMd: z.number(),
});
export type DagDerived = z.infer<typeof DagDerived>;

export const WorkdayPreset = z.enum(["weekday", "weekend"]);
export type WorkdayPreset = z.infer<typeof WorkdayPreset>;

export const CalendarConfig = z.object({
  preset: WorkdayPreset.default("weekday"),
  customDayOff: z.array(z.string()).default([]),
  customDayOn: z.array(z.string()).default([]),
});
export type CalendarConfig = z.infer<typeof CalendarConfig>;

export const MichinoriFile = z.object({
  version: z.literal(1),
  metadata: z.object({
    repoUrl: z.string().url(),
    prompt: z.string(),
    generatedAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    model: z.string().default("gemini-2.5-flash"),
  }),
  nodes: z.array(DagNode).min(1),
  derived: DagDerived,
  calendar: CalendarConfig.default({}),
});
export type MichinoriFile = z.infer<typeof MichinoriFile>;
