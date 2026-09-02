/**
 * The one place that knows whether the sidebar is collapsed.
 *
 * Stored per browser, stamped on the document as data-nav="collapsed" so the
 * shell, the nav rows and the notification card can all react from CSS
 * without threading state through server components. The inline script in
 * app/layout.tsx applies the stored value before first paint, so a collapsed
 * sidebar never flashes open on load.
 */

export const NAV_STORAGE_KEY = "mp:nav-collapsed";
const EVENT = "mp-nav-change";

export function readNavCollapsed(): boolean {
  try {
    return localStorage.getItem(NAV_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function applyNavCollapsed(next: boolean) {
  const root = document.documentElement;
  if (next) root.setAttribute("data-nav", "collapsed");
  else root.removeAttribute("data-nav");
  try {
    localStorage.setItem(NAV_STORAGE_KEY, next ? "1" : "0");
  } catch {
    // Best effort; the attribute still applies for the session.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeToNav(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
