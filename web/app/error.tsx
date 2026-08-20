"use client";

import { Warning } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 gap-5 text-center">
      <Warning className="size-10 text-warning" aria-hidden />
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="text-sm text-ink-muted max-w-sm">
          Nothing was lost. Reload to pick up where you left off.
        </p>
      </div>
      <div className="flex gap-2.5">
        <Button variant="secondary" href="/home">
          Go home
        </Button>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
