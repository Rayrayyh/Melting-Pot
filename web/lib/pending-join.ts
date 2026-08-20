"use client";

// The validated class code survives the trip through login or signup so the
// membership can be finalized immediately after authentication.

const KEY = "mp-pending-join";

export function setPendingJoin(code: string) {
  try {
    sessionStorage.setItem(KEY, code);
  } catch {
    // The URL param is the fallback carrier.
  }
}

export function takePendingJoin(): string | null {
  try {
    const code = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return code;
  } catch {
    return null;
  }
}

export function clearPendingJoin() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
