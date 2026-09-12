"use client";

import { Fragment, useState } from "react";
import { ArrowLeft, Printer } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import {
  chunk,
  foldGuides,
  mirrorRows,
  PAPER_ASPECT,
  perSheet,
  SHEET_LAYOUTS,
  sheetLayout,
  type PaperSize,
  type SheetLayout,
} from "@/lib/study/print-layout";

export type PrintableCard = { front: string; back: string };

/**
 * A print sheet, drawn the way the paper will be: fronts on their pages, the
 * backs of the same cards on the page after, each row reversed so a printer
 * that flips on the long edge lands every back behind its front.
 */
export function PrintCards({
  title,
  cards,
  backHref,
}: {
  title: string;
  cards: PrintableCard[];
  backHref: string;
}) {
  const [layoutKey, setLayoutKey] = useState<string>("3x3");
  const [paper, setPaper] = useState<PaperSize>("letter");
  const layout = sheetLayout(layoutKey);
  const sheets = chunk(cards, perSheet(layout));

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button variant="quiet" size="sm" href={backHref}>
          <ArrowLeft className="size-4" /> Back
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          {SHEET_LAYOUTS.map((entry) => (
            <button
              key={entry.key}
              type="button"
              aria-pressed={layoutKey === entry.key}
              onClick={() => setLayoutKey(entry.key)}
              className={cn(
                "inline-flex h-8 items-center rounded-full border px-3.5 text-[12px] font-medium transition-colors",
                layoutKey === entry.key
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-edge-strong bg-surface text-ink-muted hover:bg-sunken",
              )}
            >
              {entry.cols * entry.rows} per sheet
            </button>
          ))}
          <span className="mx-1 h-5 w-px bg-edge" aria-hidden />
          {(["letter", "a4"] as const).map((size) => (
            <button
              key={size}
              type="button"
              aria-pressed={paper === size}
              onClick={() => setPaper(size)}
              className={cn(
                "inline-flex h-8 items-center rounded-full border px-3.5 text-[12px] font-medium uppercase transition-colors",
                paper === size
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-edge-strong bg-surface text-ink-muted hover:bg-sunken",
              )}
            >
              {size}
            </button>
          ))}
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="size-4" />
            Print
          </Button>
        </div>
      </div>

      <header className="mt-4 space-y-1 print:hidden">
        <h1 className="text-xl font-semibold tracking-tight">Print {title}</h1>
        <p className="text-[13px] text-ink-muted">
          {cards.length} {cards.length === 1 ? "card" : "cards"}, fronts first, then the
          backs. Print double sided, flip on the long edge, cut along the dashed
          lines. Each back lands behind its front.
        </p>
      </header>
      {/* The one line the paper itself carries, so the instruction survives
          the print dialog losing the page around it. */}
      <p className="mt-3 text-center text-[11px] text-ink-faint print:mt-0 print:text-[9px]">
        {title} · print double sided, flip on the long edge
      </p>

      <div className="mt-6 space-y-8 print:mt-2 print:space-y-0">
        {sheets.map((fronts, index) => (
          <Fragment key={index}>
            <Sheet
              items={fronts}
              face="front"
              layout={layout}
              paper={paper}
              startIndex={index * perSheet(layout)}
              label={`${title}, fronts ${index + 1}`}
            />
            <Sheet
              items={mirrorRows(fronts, layout.cols)}
              face="back"
              layout={layout}
              paper={paper}
              startIndex={index * perSheet(layout)}
              label={`${title}, backs ${index + 1}`}
            />
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function Sheet({
  items,
  face,
  layout,
  paper,
  startIndex,
  label,
}: {
  items: PrintableCard[];
  face: "front" | "back";
  layout: SheetLayout;
  paper: PaperSize;
  startIndex: number;
  label: string;
}) {
  const cells = Array.from({ length: perSheet(layout) }, (_, i) => items[i]);
  return (
    <div
      aria-label={label}
      className="relative mx-auto w-full max-w-[420px] break-after-page bg-white text-neutral-900 shadow-(--shadow-card) print:max-w-none print:shadow-none"
      style={{ aspectRatio: PAPER_ASPECT[paper] }}
    >
      {/* Corner crop marks, outside the cut grid. */}
      <span aria-hidden className="absolute -left-1 -top-1 size-2 border-l border-t border-neutral-400" />
      <span aria-hidden className="absolute -right-1 -top-1 size-2 border-r border-t border-neutral-400" />
      <span aria-hidden className="absolute -bottom-1 -left-1 size-2 border-b border-l border-neutral-400" />
      <span aria-hidden className="absolute -bottom-1 -right-1 size-2 border-b border-r border-neutral-400" />
      {/* Fold guides at the row centres: fold, then cut along the dashes. */}
      {foldGuides(layout.rows).map((top) => (
        <span
          key={`fold-${top}`}
          aria-hidden
          className="absolute inset-x-0 border-t border-dotted border-neutral-300"
          style={{ top: `${top}%` }}
        />
      ))}
      <div
        className="absolute inset-0"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
          gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
        }}
      >
        {cells.map((card, i) => (
          <div
            key={i}
            className="flex min-h-0 flex-col items-center justify-center overflow-hidden border border-dashed border-neutral-400 p-2 text-center [print-color-adjust:exact]"
          >
            {card ? (
              <>
                <p
                  className={cn(
                    "min-w-0 overflow-hidden",
                    face === "front" ? "text-[13px] font-medium leading-snug" : "text-[11px] leading-snug",
                  )}
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 8,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {face === "front" ? card.front : card.back}
                </p>
                <span className="mt-1 text-[8px] tabular-nums text-neutral-400">
                  {startIndex + i + 1}
                </span>
              </>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
