"use client";

import { useSyncExternalStore } from "react";
import { Desktop, Moon, Sun } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import {
  applyThemeChoice,
  DEFAULT_THEME,
  readThemeChoice,
  subscribeToTheme,
  type ThemeChoice as Choice,
} from "@/lib/theme";

const OPTIONS: { value: Choice; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Desktop },
];

/**
 * Theme picker for the settings page. Light leads because it is the default,
 * and following the system stays a choice you can see and come back to rather
 * than just the absence of one.
 */
export function ThemeChoice() {
  const choice = useSyncExternalStore(subscribeToTheme, readThemeChoice, () => DEFAULT_THEME);

  return (
    <div role="radiogroup" aria-label="Theme" className="flex flex-wrap gap-2">
      {OPTIONS.map((option) => {
        const active = choice === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => applyThemeChoice(option.value)}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm transition-colors",
              active
                ? "border-primary bg-primary-soft font-medium text-primary"
                : "border-edge-strong text-ink-muted hover:bg-sunken hover:text-ink",
            )}
          >
            <option.icon className="size-[18px]" aria-hidden />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
