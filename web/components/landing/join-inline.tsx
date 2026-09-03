"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CLASS_CODE_LENGTH, ClassCodeInput } from "@/components/ui/class-code-input";
import { supabaseBrowser } from "@/lib/supabase/client";

/**
 * The compact code entry inside the "I have a class code" door. Same
 * validate-in-place behavior as JoinCard, with two deliberate differences:
 * the button is never disabled (a short code gets a plain sentence instead of
 * a control that ignores the click, and no request is fired for it), and the
 * label says what the click actually delivers: the Pot preview, before any
 * account exists.
 */
export function JoinInline({
  initialCode = "",
  initialError = null,
}: {
  /** Carried over from /join/CODE redirects so a bad code lands back here
   *  with the code still in the field and the reason under it. */
  initialCode?: string;
  initialError?: string | null;
}) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState<string | null>(initialError);
  const [checking, setChecking] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (checking) return;
    if (code.length !== CLASS_CODE_LENGTH) {
      setError("Codes are 6 characters.");
      return;
    }
    setChecking(true);
    setError(null);
    const supabase = supabaseBrowser();
    const { data, error: rpcError } = await supabase.rpc("lookup_pot_by_code", {
      p_code: code,
    });
    if (rpcError) {
      setError(
        rpcError.message.includes("rate_limited")
          ? "Too many tries from this network. Wait a few minutes and try again."
          : "Something went wrong checking that code. Try again.",
      );
      setChecking(false);
      return;
    }
    if (!data) {
      setError("We couldn't find that Pot. Check the code and try again.");
      setChecking(false);
      return;
    }
    router.push(`/join/${code}`);
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <ClassCodeInput
        value={code}
        onValueChange={(next) => {
          setCode(next);
          if (error) setError(null);
        }}
        label="Enter class code"
        error={error}
      />
      <Button type="submit" size="md" className="w-full" disabled={checking}>
        {checking ? "Checking" : "See the Pot"}
      </Button>
    </form>
  );
}
