import type { DagNodeType, DagProposalType } from "@michinori/shared";

export function applyProposalToNodes(
  currentNodes: DagNodeType[],
  proposal: DagProposalType,
): DagNodeType[] {
  let nodes = currentNodes.map((n) => ({ ...n, dependencies: [...n.dependencies] }));

  for (const removal of proposal.removals) {
    nodes = nodes.filter((n) => n.id !== removal);
    for (const node of nodes) {
      node.dependencies = node.dependencies.filter((d) => d !== removal);
    }
  }

  for (const mod of proposal.modifications) {
    const node = nodes.find((n) => n.id === mod.nodeId);
    if (node) {
      if (mod.changes.label !== undefined) node.label = mod.changes.label;
      if (mod.changes.description !== undefined) node.description = mod.changes.description;
      if (mod.changes.estimateMd !== undefined) node.estimateMd = mod.changes.estimateMd;
      if (mod.changes.category !== undefined) node.category = mod.changes.category as DagNodeType["category"];
      if (mod.changes.status !== undefined) node.status = mod.changes.status as DagNodeType["status"];
      if (mod.changes.position !== undefined) node.position = mod.changes.position;
    }
  }

  for (const addition of proposal.additions) {
    nodes.push({ ...addition });
  }

  return nodes;
}
