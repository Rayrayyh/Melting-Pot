"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/**
 * Modal confirmation for destructive or irreversible actions. Uses the native
 * dialog element for focus containment and escape handling.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "default",
  busy = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  /** Naming the way out matters when leaving costs the user something. */
  cancelLabel?: string;
  tone?: "default" | "danger";
  /** An action is in flight. Stops a second one; never stops leaving. */
  busy?: boolean;
  /**
   * The action is not ready yet, usually because the dialog asks for
   * something first. Separate from busy on purpose: overloading busy with
   * "the form is incomplete" is what took the way out away.
   */
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onCancel();
      }}
      className={cn(
        "m-auto w-full max-w-md bg-surface text-ink border border-edge rounded-(--radius-card) shadow-(--shadow-raised) p-0",
        "backdrop:bg-black/40",
      )}
    >
      <div className="p-6 space-y-4">
        <div className="space-y-1.5">
          <h2 className="text-base font-semibold">{title}</h2>
          {children ? <div className="text-sm text-ink-muted">{children}</div> : null}
        </div>
        <div className="flex justify-end gap-2.5">
          {/* Never disabled. Closing a dialog is not destructive: whatever is
              in flight finishes or fails on its own either way. Disabling it
              only ever traps someone, and it did: a dialog that asks for a
              reason had the way out switched off until one was typed, and a
              request that hung switched it off for good. */}
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={busy || confirmDisabled}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
