"use client";

import { useSyncExternalStore } from "react";
import { Desktop, Moon, Sun } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

const THEME_EVENT = "mp-theme-change";
const STORAGE_KEY = "mp-theme";

type Choice = "system" | "light" | "dark";

const OPTIONS: { value: Choice; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "System", icon: Desktop },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

function readChoice(): Choice {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Private browsing can refuse storage; the system default still applies.
  }
  return "system";
}

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * Theme picker for the settings page. Three explicit states so following the
 * system is a choice you can see and come back to, not just the absence of one.
 */
export function ThemeChoice() {
  const choice = useSyncExternalStore(subscribe, readChoice, () => "system" as const);

  function pick(next: Choice) {
    const root = document.documentElement;
    if (next === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", next);
    }
    try {
      if (next === "system") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Persistence is best-effort; the attribute still applies for the session.
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  }

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
            onClick={() => pick(option.value)}
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
