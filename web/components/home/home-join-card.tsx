"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { CLASS_CODE_LENGTH, normalizeClassCode } from "@/components/ui/class-code-input";
import { supabaseBrowser } from "@/lib/supabase/client";
import { INVALID_CODE_MESSAGE } from "@/components/landing/join-card";

/** Compact inline join field for the dashboard. */
export function HomeJoinCard({
  initialCode = "",
  initialError = null,
}: {
  initialCode?: string;
  initialError?: string | null;
}) {
  const router = useRouter();
  const [code, setCode] = useState(normalizeClassCode(initialCode));
  const [error, setError] = useState<string | null>(initialError);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== CLASS_CODE_LENGTH || busy) return;
    setBusy(true);
    setError(null);
    const supabase = supabaseBrowser();
    const { data, error: rpcError } = await supabase.rpc("lookup_pot_by_code", {
      p_code: code,
    });
    if (rpcError || !data) {
      setError(
        rpcError?.message.includes("rate_limited")
          ? "Too many tries from this network. Wait a few minutes and try again."
          : rpcError
            ? "Something went wrong. Try again."
            : INVALID_CODE_MESSAGE,
      );
      setBusy(false);
      return;
    }
    const { data: potId } = await supabase.rpc("join_pot_with_code", { p_code: code });
    if (potId) {
      router.push(`/p/${potId}`);
      router.refresh();
    } else {
      setError(INVALID_CODE_MESSAGE);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-1.5">
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => {
            setCode(normalizeClassCode(e.target.value));
            if (error) setError(null);
          }}
          placeholder="Class code"
          aria-label="Class code"
          autoComplete="off"
          spellCheck={false}
          maxLength={CLASS_CODE_LENGTH}
          className="flex-1 h-10 px-3 bg-surface border border-edge-strong rounded-(--radius-control) font-mono font-semibold tracking-[0.2em] text-sm text-ink placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-ink-faint focus:border-primary focus:outline-none transition-colors uppercase"
        />
        <button
          type="submit"
          disabled={code.length !== CLASS_CODE_LENGTH || busy}
          aria-label="Join Pot"
          className="inline-flex size-10 items-center justify-center rounded-(--radius-control) bg-primary text-on-primary hover:bg-primary-hover disabled:opacity-50 transition-colors"
        >
          <ArrowRight className="size-4" />
        </button>
      </div>
      {error ? <p className="text-[13px] text-danger">{error}</p> : null}
    </form>
  );
}
