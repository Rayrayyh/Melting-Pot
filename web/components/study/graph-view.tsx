"use client";

import { useMemo, useState } from "react";
import { Card, CardSection } from "@/components/ui/card";
import { layoutGraph } from "@/lib/study/graph-layout";
import type { GraphResult } from "@/lib/mix/contracts";
import { cn } from "@/lib/cn";

const WIDTH = 1000;
const HEIGHT = 640;
const NODE_W = 170;
const NODE_H = 54;

/**
 * A drawn concept map. Hand-rolled SVG, no graph library: the layout is
 * deterministic, the nodes are boxes a reader can tap or focus, and picking
 * one lifts its edges and dims everything else. Nothing here animates beyond
 * a colour fade, and none of it prints.
 */
export function GraphView({ result }: { result: GraphResult }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const layout = useMemo(() => layoutGraph(result.nodes, result.edges), [result]);
  const active = result.nodes.find((node) => node.id === activeId) ?? null;

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight text-ink">{result.title}</h2>
        <p className="text-[12px] text-ink-faint">
          {result.nodes.length} {result.nodes.length === 1 ? "idea" : "ideas"}, {result.edges.length}{" "}
          {result.edges.length === 1 ? "connection" : "connections"}. Tap a box to follow its threads.
        </p>
      </div>

      <Card>
        <CardSection className="p-3">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-label={`Concept map: ${result.title}`}
            className="w-full rounded-(--radius-control) bg-sunken/60"
          >
            {/* Edges first, so the nodes sit on top of them. */}
            {layout.edges.map((edge, index) => {
              const lit =
                activeId !== null && (edge.fromId === activeId || edge.toId === activeId);
              const dimmed = activeId !== null && !lit;
              const mx = (edge.from.x + edge.to.x) / 2;
              const my = (edge.from.y + edge.to.y) / 2;
              const cx = mx * WIDTH + (edge.to.y - edge.from.y) * 40;
              const cy = my * HEIGHT - (edge.to.x - edge.from.x) * 40;
              return (
                <g key={index} opacity={dimmed ? 0.25 : 1} className="transition-opacity">
                  <path
                    d={`M ${edge.from.x * WIDTH} ${edge.from.y * HEIGHT} Q ${cx} ${cy} ${edge.to.x * WIDTH} ${edge.to.y * HEIGHT}`}
                    fill="none"
                    stroke={lit ? "var(--primary)" : "var(--edge-strong)"}
                    strokeWidth={lit ? 2.5 : 1.5}
                  />
                  {edge.label ? (
                    <text
                      x={mx * WIDTH}
                      y={my * HEIGHT - 6}
                      textAnchor="middle"
                      fontSize={13}
                      fill={lit ? "var(--primary)" : "var(--ink-faint)"}
                      className="pointer-events-none select-none"
                    >
                      {edge.label}
                    </text>
                  ) : null}
                </g>
              );
            })}

            {layout.nodes.map((node) => {
              const lit = activeId === node.id;
              const dimmed = activeId !== null && !lit;
              const connected =
                activeId !== null &&
                layout.edges.some(
                  (edge) =>
                    (edge.fromId === activeId && edge.toId === node.id) ||
                    (edge.toId === activeId && edge.fromId === node.id),
                );
              return (
                <g
                  key={node.id}
                  tabIndex={0}
                  role="button"
                  aria-label={node.label}
                  aria-pressed={lit}
                  onClick={() => setActiveId(lit ? null : node.id)}
                  onFocus={() => setActiveId(node.id)}
                  onBlur={() => setActiveId(null)}
                  opacity={dimmed && !connected ? 0.35 : 1}
                  className={cn(
                    "cursor-pointer transition-opacity focus-visible:outline-none",
                    lit && "[&_rect]:stroke-[var(--primary)] [&_rect]:stroke-[3px]",
                  )}
                >
                  <rect
                    x={clampX(node.x) - NODE_W / 2}
                    y={clampY(node.y) - NODE_H / 2}
                    width={NODE_W}
                    height={NODE_H}
                    rx={14}
                    fill={lit ? "var(--primary-soft)" : "var(--surface)"}
                    stroke="var(--edge-strong)"
                    strokeWidth={1.5}
                  />
                  <text
                    x={clampX(node.x)}
                    y={clampY(node.y) + 5}
                    textAnchor="middle"
                    fontSize={16}
                    fontWeight={600}
                    fill="var(--ink)"
                    className="pointer-events-none select-none"
                  >
                    {truncate(node.label, 24)}
                  </text>
                </g>
              );
            })}
          </svg>
        </CardSection>
      </Card>

      <div aria-live="polite" className="min-h-10">
        {active ? (
          <p className="text-[13px] leading-relaxed text-ink-muted">
            <span className="font-medium text-ink">{active.label}</span>
            {active.summary ? ` · ${active.summary}` : ""}
          </p>
        ) : null}
      </div>

      {result.stillToConfirm.length > 0 ? (
        <div className="rounded-(--radius-card) border border-edge bg-surface px-4 py-3">
          <p className="text-[12px] font-medium text-warning">Still to confirm</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {result.stillToConfirm.map((entry, index) => (
              <li key={index} className="text-[13px] text-ink-muted">
                {entry}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function clampX(x: number): number {
  return Math.min(WIDTH - NODE_W / 2 - 8, Math.max(NODE_W / 2 + 8, x * WIDTH));
}

function clampY(y: number): number {
  return Math.min(HEIGHT - NODE_H / 2 - 8, Math.max(NODE_H / 2 + 8, y * HEIGHT));
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
