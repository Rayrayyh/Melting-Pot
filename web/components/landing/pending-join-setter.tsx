"use client";

import { useEffect } from "react";
import { setPendingJoin } from "@/lib/pending-join";

/** Persists the validated code so auth pages can finalize the membership. */
export function PendingJoinSetter({ code }: { code: string }) {
  useEffect(() => {
    setPendingJoin(code);
  }, [code]);
  return null;
}
