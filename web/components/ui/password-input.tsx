"use client";

import { useState, type ComponentProps } from "react";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";

/**
 * A password field with a show/hide switch at its right edge. Hidden by
 * default; one tap reveals the text, another hides it again. The two icons
 * live stacked in the same spot and crossfade, so the switch reads as one
 * glyph turning into the other rather than a swap. The type change keeps the
 * same underlying element, so focus and the caret survive the toggle, and
 * the button gives up the mousedown so the field never loses focus to it.
 */
export function PasswordInput({
  className,
  ...rest
}: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...rest} type={visible ? "text" : "password"} className={cn("pr-11", className)} />
      <button
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-(--radius-control) text-ink-faint transition-colors hover:text-ink focus-visible:text-ink focus-visible:outline-none"
      >
        <span className="relative block size-[18px]" aria-hidden>
          <EyeSlash
            className={cn(
              "absolute inset-0 size-[18px] motion-safe:transition-[opacity,transform] motion-safe:duration-200",
              visible ? "scale-75 opacity-0" : "scale-100 opacity-100",
            )}
          />
          <Eye
            className={cn(
              "absolute inset-0 size-[18px] motion-safe:transition-[opacity,transform] motion-safe:duration-200",
              visible ? "scale-100 opacity-100" : "scale-75 opacity-0",
            )}
          />
        </span>
      </button>
    </div>
  );
}
