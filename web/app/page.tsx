import { redirect } from "next/navigation";
import { JoinCard, INVALID_CODE_MESSAGE } from "@/components/landing/join-card";
import { Wordmark } from "@/components/shell/wordmark";
import { supabaseServer } from "@/lib/supabase/server";

export default async function LandingPage({ searchParams }: PageProps<"/">) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/home");

  const params = await searchParams;
  const code = typeof params.code === "string" ? params.code : "";
  const invalid = params.error === "notfound";

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
      <JoinCard
        initialCode={code}
        initialError={invalid ? INVALID_CODE_MESSAGE : null}
      />
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
