import { redirect } from "next/navigation";
import { CheckCircle, Users, Notebook, Clock } from "@phosphor-icons/react/dist/ssr";
import { joinPotAction } from "@/app/join/[code]/actions";
import { PendingJoinSetter } from "@/components/landing/pending-join-setter";
import { Wordmark } from "@/components/shell/wordmark";
import { Button } from "@/components/ui/button";
import { Card, CardSection } from "@/components/ui/card";
import { normalizeClassCode } from "@/lib/class-code";
import { supabaseServer } from "@/lib/supabase/server";
import { relativeTime } from "@/lib/time";

type Lookup = {
  title: string;
  description: string | null;
  owner_name: string | null;
  member_count: number;
  note_count: number;
  last_shared_at: string | null;
  is_member: boolean;
};

export default async function JoinConfirmPage({ params }: PageProps<"/join/[code]">) {
  const { code: rawCode } = await params;
  const code = normalizeClassCode(decodeURIComponent(rawCode));
  if (code.length !== 6) redirect("/");

  const supabase = await supabaseServer();
  const { data } = await supabase.rpc("lookup_pot_by_code", { p_code: code });
  if (!data) redirect(`/?code=${encodeURIComponent(code)}&error=notfound`);
  const pot = data as unknown as Lookup;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const joinWithCode = joinPotAction.bind(null, code);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 gap-8">
      <Wordmark size="lg" />
      <Card className="w-full max-w-md">
        <CardSection className="p-6 space-y-5">
          <div className="flex flex-col items-center text-center gap-3">
            <span className="inline-flex size-14 items-center justify-center rounded-full bg-success-soft">
              <CheckCircle weight="fill" className="size-7 text-success" />
            </span>
            <div className="space-y-1">
              <p className="text-[13px] text-ink-muted">
                {pot.is_member ? "Welcome back to" : "You joined"}
              </p>
              <h1 className="text-xl font-semibold tracking-tight">{pot.title}</h1>
              {pot.description ? (
                <p className="text-sm text-ink-muted pt-1">{pot.description}</p>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-center gap-5 text-[13px] text-ink-muted border-y border-edge py-3">
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-4" aria-hidden />
              {pot.member_count} {pot.member_count === 1 ? "member" : "members"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Notebook className="size-4" aria-hidden />
              {pot.note_count} {pot.note_count === 1 ? "note" : "notes"}
            </span>
            {pot.last_shared_at ? (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-4" aria-hidden />
                active {relativeTime(pot.last_shared_at)}
              </span>
            ) : null}
          </div>

          {pot.owner_name ? (
            <p className="text-center text-[13px] text-ink-muted">
              Run by {pot.owner_name}
            </p>
          ) : null}

          {user ? (
            pot.is_member ? (
              <div className="space-y-2">
                <p className="text-center text-sm text-ink-muted">
                  This Pot is already in your vault, so nothing gets duplicated.
                </p>
                <form action={joinWithCode}>
                  <Button type="submit" size="lg" className="w-full">
                    Open Pot
                  </Button>
                </form>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-center text-sm text-ink-muted">
                  Membership is saved instantly. No extra setup required.
                </p>
                <form action={joinWithCode}>
                  <Button type="submit" size="lg" className="w-full">
                    Open Pot
                  </Button>
                </form>
              </div>
            )
          ) : (
            <div className="space-y-3">
              <PendingJoinSetter code={code} />
              <p className="text-center text-sm text-ink-muted">
                Next, save your spot with an account.
              </p>
              <Button
                size="lg"
                className="w-full"
                href={`/signup?code=${encodeURIComponent(code)}`}
              >
                Create account
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="w-full"
                href={`/login?code=${encodeURIComponent(code)}`}
              >
                I already have an account
              </Button>
            </div>
          )}
        </CardSection>
      </Card>
      <p className="text-[13px] text-ink-faint">Class code {code}</p>
    </div>
  );
}
