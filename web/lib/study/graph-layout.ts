/**
 * Where a drawn graph's nodes sit.
 *
 * Deterministic on purpose: the same map always draws the same way, so a
 * reader comparing two drawings is comparing content, not layout noise. The
 * algorithm is layers, not forces: breadth-first depth from the most
 * connected node, alphabetical tie-breaks at every step, nodes spread evenly
 * across their layer. A force simulation would look organic and never land
 * the same way twice.
 */

export type LayoutNode = {
  id: string;
  label: string;
  summary: string;
  /** Layer depth, 0 for the centre. */
  depth: number;
  /** Unit coordinates inside the canvas, x and y in [0, 1]. */
  x: number;
  y: number;
};

export type LayoutEdge = {
  fromId: string;
  toId: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  label: string;
};

const CANVAS_WIDTH = 1;
const CANVAS_HEIGHT = 1;
const MARGIN = 0.12;

/**
 * Lays a graph out as concentric layers around its best-connected node.
 * Tolerates dangling edges: they are ignored, since a normalizer usually
 * removed them already and a layout must never throw on what a model sent.
 */
export function layoutGraph(
  nodes: Array<{ id: string; label: string; summary: string }>,
  edges: Array<{ from: string; to: string; label?: string }>,
): { nodes: LayoutNode[]; edges: LayoutEdge[] } {
  if (nodes.length === 0) return { nodes: [], edges: [] };

  // Degree, counting only edges between known nodes.
  const ids = new Set(nodes.map((node) => node.id));
  const degree = new Map<string, number>();
  const clean: Array<{ from: string; to: string; label: string }> = [];
  for (const edge of edges) {
    if (!ids.has(edge.from) || !ids.has(edge.to) || edge.from === edge.to) continue;
    clean.push({ from: edge.from, to: edge.to, label: edge.label ?? "" });
    degree.set(edge.from, (degree.get(edge.from) ?? 0) + 1);
    degree.set(edge.to, (degree.get(edge.to) ?? 0) + 1);
  }

  // The centre is the most connected node; a tie goes to the alphabetically
  // first id, so the same graph always picks the same centre.
  const centre =
    [...nodes].sort(
      (a, b) =>
        (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0) || a.id.localeCompare(b.id),
    )[0].id;

  // Breadth-first depth from the centre.
  const depth = new Map<string, number>([[centre, 0]]);
  const adjacency = new Map<string, string[]>();
  for (const edge of clean) {
    adjacency.set(edge.from, [...(adjacency.get(edge.from) ?? []), edge.to]);
    adjacency.set(edge.to, [...(adjacency.get(edge.to) ?? []), edge.from]);
  }
  let frontier = [centre];
  let current = 1;
  while (frontier.length > 0) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const neighbour of adjacency.get(id) ?? []) {
        if (!depth.has(neighbour)) {
          depth.set(neighbour, current);
          next.push(neighbour);
        }
      }
    }
    frontier = next;
    current += 1;
  }

  // Anything unreachable sits in the outermost layer.
  const maxDepth = Math.max(0, ...[...depth.values()]);
  const layers = new Map<number, string[]>();
  for (const node of nodes) {
    const layer = depth.get(node.id) ?? maxDepth + 1;
    layers.set(layer, [...(layers.get(layer) ?? []), node.id]);
  }

  // Nodes spread evenly across their layer; each layer's list is sorted so
  // the spread does not depend on the order the model happened to send.
  const positioned = new Map<string, { x: number; y: number }>();
  for (const [layer, members] of [...layers].sort((a, b) => a[0] - b[0])) {
    const sorted = [...members].sort();
    const count = sorted.length;
    sorted.forEach((id, i) => {
      const angle = layer === 0 ? 0 : (i / count) * Math.PI * 2;
      const radius =
        layer === 0
          ? 0
          : MARGIN + ((layer / (maxDepth + 1)) * (1 - 2 * MARGIN)) / 2;
      positioned.set(id, {
        x: CANVAS_WIDTH / 2 + radius * CANVAS_WIDTH * Math.cos(angle),
        y: CANVAS_HEIGHT / 2 + radius * CANVAS_HEIGHT * Math.sin(angle),
      });
    });
  }

  return {
    nodes: nodes.map((node) => ({
      ...node,
      depth: depth.get(node.id) ?? maxDepth + 1,
      x: positioned.get(node.id)?.x ?? CANVAS_WIDTH / 2,
      y: positioned.get(node.id)?.y ?? CANVAS_HEIGHT / 2,
    })),
    edges: clean.map((edge) => ({
      fromId: edge.from,
      toId: edge.to,
      from: positioned.get(edge.from) ?? { x: 0, y: 0 },
      to: positioned.get(edge.to) ?? { x: 0, y: 0 },
      label: edge.label,
    })),
  };
}
