import { UserShell } from "@/components/shell/user-shell";
import { JoinCard } from "@/components/landing/join-card";

export const metadata = { title: "Join a Pot" };

export default function JoinPage() {
  return (
    <UserShell>
      <div className="mx-auto w-full max-w-xl px-6 py-10 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Join a Pot</h1>
          <p className="text-sm text-ink-muted">
            Enter the class code your classmate or teacher shared.
          </p>
        </div>
        <JoinCard />
      </div>
    </UserShell>
  );
}
