"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Copy } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardSection, Eyebrow } from "@/components/ui/card";
import { Field, Input, TextArea } from "@/components/ui/input";
import { supabaseBrowser } from "@/lib/supabase/client";

type Created = { id: string; class_code: string };

export function CreatePotFlow() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<Created | null>(null);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !title.trim()) return;
    setBusy(true);
    setError(null);
    const supabase = supabaseBrowser();
    const { data, error: rpcError } = await supabase.rpc("create_pot", {
      p_title: title.trim(),
      p_description: description.trim() || undefined,
    });
    if (rpcError || !data) {
      setError("We couldn't create the Pot. Try again.");
      setBusy(false);
      return;
    }
    setCreated(data as unknown as Created);
    router.refresh();
  }

  async function copy(text: string, which: "code" | "link") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      // Clipboard can be unavailable; the code stays visible either way.
    }
  }

  if (created) {
    const inviteLink = `${window.location.origin}/join/${created.class_code}`;
    return (
      <Card>
        <CardSection className="p-6 space-y-6">
          <div className="space-y-1 text-center">
            <h1 className="text-xl font-semibold tracking-tight">Your Pot is ready</h1>
            <p className="text-sm text-ink-muted">
              Share this code with your class so they can join.
            </p>
          </div>
          <div className="space-y-2">
            <Eyebrow className="text-center">Class code</Eyebrow>
            <div className="flex items-center justify-center h-16 rounded-(--radius-card) border border-edge-strong bg-sunken font-mono text-2xl font-semibold tracking-[0.35em] text-ink">
              {created.class_code}
            </div>
            <div className="flex justify-center gap-2 pt-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => copy(created.class_code, "code")}
              >
                {copied === "code" ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied === "code" ? "Copied" : "Copy code"}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => copy(inviteLink, "link")}
              >
                {copied === "link" ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied === "link" ? "Copied" : "Copy invite link"}
              </Button>
            </div>
          </div>
          <p className="text-center text-[13px] text-ink-muted">
            Anyone with the code can join this Pot. You can regenerate it any
            time in settings.
          </p>
          <Button size="lg" className="w-full" href={`/p/${created.id}`}>
            Open your Pot
          </Button>
        </CardSection>
      </Card>
    );
  }

  return (
    <Card>
      <CardSection className="p-6 space-y-5">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Create a Pot</h1>
          <p className="text-sm text-ink-muted">
            A Pot is your class&apos;s shared vault. Name it and go; everything
            else can wait.
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <Field
            label="Pot name"
            hint="Names can repeat across classes. The class code is what stays unique."
          >
            {(props) => (
              <Input
                {...props}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Biology 101"
                required
                maxLength={120}
              />
            )}
          </Field>
          <Field label="What is this Pot for? (optional)">
            {(props) => (
              <TextArea
                {...props}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="A line or two so classmates know they're in the right place."
              />
            )}
          </Field>
          {error ? (
            <p role="alert" className="text-[13px] text-danger">
              {error}
            </p>
          ) : null}
          <Button type="submit" size="lg" className="w-full" disabled={busy || !title.trim()}>
            {busy ? "Creating" : "Create Pot"}
          </Button>
        </form>
      </CardSection>
    </Card>
  );
}
