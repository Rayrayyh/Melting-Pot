"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Wordmark } from "@/components/shell/wordmark";
import { Button } from "@/components/ui/button";
import { Card, CardSection } from "@/components/ui/card";
import { CLASS_CODE_LENGTH, ClassCodeInput } from "@/components/ui/class-code-input";

export default function LandingPage() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== CLASS_CODE_LENGTH) return;
    router.push(`/join/${code}`);
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 gap-8">
      <Wordmark size="lg" />
      <div className="text-center space-y-2 max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight">
          Your class, one shared vault
        </h1>
        <p className="text-sm text-ink-muted">
          Join a Pot. Write anything. MeltingPot organizes it. You approve what
          gets shared.
        </p>
      </div>
      <Card className="w-full max-w-md">
        <CardSection className="space-y-4 p-6">
          <form onSubmit={submit} className="space-y-4">
            <ClassCodeInput
              value={code}
              onValueChange={setCode}
              label="Enter class code"
            />
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={code.length !== CLASS_CODE_LENGTH}
            >
              Join Pot
            </Button>
          </form>
          <p className="text-center text-[13px] text-ink-muted">
            Enter the 6-character code your class shared.
          </p>
        </CardSection>
      </Card>
      <div className="flex items-center gap-4 text-[13px] text-ink-muted">
        <a href="/login" className="hover:text-ink transition-colors">
          Sign in
        </a>
        <span aria-hidden className="text-ink-faint">&middot;</span>
        <a href="/pots/new" className="hover:text-ink transition-colors">
          Create a Pot
        </a>
      </div>
    </div>
  );
}
