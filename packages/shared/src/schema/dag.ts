import { z } from "zod";

export const NodeStatus = z.enum(["未着手", "進行中", "PR Open", "完了"]);
export type NodeStatus = z.infer<typeof NodeStatus>;

export const NodeCategory = z.enum(["実装", "調査", "設計", "その他"]);
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
});
export type MichinoriFile = z.infer<typeof MichinoriFile>;
