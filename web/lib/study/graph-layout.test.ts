import { describe, expect, it } from "vitest";
import { layoutGraph } from "./graph-layout";

const NODES = [
  { id: "n1", label: "Osmosis", summary: "" },
  { id: "n2", label: "Tonicity", summary: "" },
  { id: "n3", label: "Membrane", summary: "" },
  { id: "n4", label: "Isolated", summary: "" },
];

describe("layoutGraph", () => {
  it("puts the best-connected node at the centre, every time", () => {
    const edges = [
      { from: "n1", to: "n2", label: "measured by" },
      { from: "n1", to: "n3", label: "crosses" },
      { from: "n2", to: "n3", label: "describes" },
    ];
    const first = layoutGraph(NODES, edges);
    const second = layoutGraph([...NODES].reverse(), edges);
    const centre = first.nodes.find((node) => node.id === "n1");
    const centreAgain = second.nodes.find((node) => node.id === "n1");
    expect(centre?.depth).toBe(0);
    expect(centre?.x).toBe(centreAgain?.x);
    expect(centre?.y).toBe(centreAgain?.y);
  });

  it("ignores edges that name nodes nobody sent", () => {
    const out = layoutGraph(NODES, [{ from: "n1", to: "ghost", label: "" }]);
    expect(out.edges).toHaveLength(0);
    expect(out.nodes).toHaveLength(NODES.length);
  });

  it("spreads same-layer nodes apart", () => {
    const out = layoutGraph(NODES, [{ from: "n1", to: "n2", label: "" }]);
    const outer = out.nodes.filter((node) => node.depth > 0);
    const spots = new Set(outer.map((node) => `${node.x},${node.y}`));
    expect(spots.size).toBe(outer.length);
  });
});
