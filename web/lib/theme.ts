/**
 * The one place that knows how a theme is stored and applied.
 *
 * Three states, and the difference between them matters. "light" and "dark"
 * are explicit choices. "system" is also an explicit choice: it says follow
 * the operating system, and it is stored so that it can be told apart from
 * never having chosen at all. Nothing stored means light, because a class
 * vault reads like paper and that is the surface this product was drawn on.
 */

export const THEME_STORAGE_KEY = "mp-theme";
export const THEME_EVENT = "mp-theme-change";

export type ThemeChoice = "system" | "light" | "dark";

/** What a viewer who has never chosen gets. */
export const DEFAULT_THEME: ThemeChoice = "light";

export function readThemeChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // Private browsing can refuse storage; the default still applies.
  }
  return DEFAULT_THEME;
}

/** The theme actually painted right now, with "system" resolved. */
export function resolveTheme(choice: ThemeChoice): "light" | "dark" {
  if (choice !== "system") return choice;
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

/** Applies a choice to the document and remembers it. */
export function applyThemeChoice(next: ThemeChoice) {
  const root = document.documentElement;
  if (next === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", next);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Persistence is best-effort; the attribute still applies for the session.
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}

/** Fires on this tab's own changes and on another tab's. */
export function subscribeToTheme(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onChange);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onChange);
    media.removeEventListener("change", onChange);
  };
}
