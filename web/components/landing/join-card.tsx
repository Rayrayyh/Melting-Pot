"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardSection } from "@/components/ui/card";
import { CLASS_CODE_LENGTH, ClassCodeInput } from "@/components/ui/class-code-input";
import { supabaseBrowser } from "@/lib/supabase/client";

export const INVALID_CODE_MESSAGE =
  "We couldn't find that Pot. Check the code and try again.";

/**
 * The class-code hero. Validates the code in place: an invalid code never
 * navigates away and never clears the input.
 */
export function JoinCard({
  initialCode = "",
  initialError = null,
}: {
  initialCode?: string;
  initialError?: string | null;
}) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState<string | null>(initialError);
  const [checking, setChecking] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== CLASS_CODE_LENGTH || checking) return;
    setChecking(true);
    setError(null);
    const supabase = supabaseBrowser();
    const { data, error: rpcError } = await supabase.rpc("lookup_pot_by_code", {
      p_code: code,
    });
    if (rpcError) {
      setError("Something went wrong checking that code. Try again.");
      setChecking(false);
      return;
    }
    if (!data) {
      setError(INVALID_CODE_MESSAGE);
      setChecking(false);
      return;
    }
    router.push(`/join/${code}`);
  }

  return (
    <Card className="w-full max-w-md">
      <CardSection className="space-y-4 p-6">
        <form onSubmit={submit} className="space-y-4">
          <ClassCodeInput
            value={code}
            onValueChange={(next) => {
              setCode(next);
              if (error) setError(null);
            }}
            label="Enter class code"
            error={error}
          />
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={code.length !== CLASS_CODE_LENGTH || checking}
          >
            {checking ? "Checking" : "Join Pot"}
          </Button>
        </form>
        <p className="text-center text-[13px] text-ink-muted">
          Enter the 6-character code your class shared.
        </p>
      </CardSection>
    </Card>
  );
}
