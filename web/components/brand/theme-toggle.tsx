"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import {
  applyThemeChoice,
  DEFAULT_THEME,
  readThemeChoice,
  resolveTheme,
  subscribeToTheme,
} from "@/lib/theme";

/**
 * One tap between light and dark, for the public pages that have no settings
 * screen to send someone to. It shows where a tap leads rather than where you
 * already are: a moon on a light page, a sun on a dark one. Choosing here
 * writes the same explicit choice the settings picker writes, so the two never
 * disagree, and "system" stays available in settings for anyone who wants it.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const choice = useSyncExternalStore(subscribeToTheme, readThemeChoice, () => DEFAULT_THEME);
  const painted = typeof window === "undefined" ? DEFAULT_THEME : resolveTheme(choice);
  const next = painted === "dark" ? "light" : "dark";
  const Icon = painted === "dark" ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={() => applyThemeChoice(next)}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-edge-strong text-ink-muted transition-colors hover:border-primary hover:text-primary",
        className,
      )}
    >
      <Icon className="size-[18px]" aria-hidden />
    </button>
  );
}
