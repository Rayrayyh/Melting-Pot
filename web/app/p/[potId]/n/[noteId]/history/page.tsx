import { notFound } from "next/navigation";
import { HistoryView } from "@/components/pot/history-view";
import { PotShell } from "@/components/shell/pot-shell";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { getNoteHistory } from "@/lib/data/history";

export default async function HistoryPage({
  params,
}: PageProps<"/p/[potId]/n/[noteId]/history">) {
  const { potId, noteId } = await params;
  const history = await getNoteHistory(potId, noteId);
  if (!history || history.versions.length === 0) notFound();

  return (
    <PotShell potId={potId}>
      {(pot) => (
        <div className="mx-auto w-full max-w-5xl px-6 py-8 space-y-6">
          <Breadcrumb
            crumbs={[
              { label: pot.title, href: `/p/${pot.id}` },
              { label: history.noteTitle, href: `/p/${pot.id}/n/${history.noteId}` },
              { label: "History" },
            ]}
          />
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Version history</h1>
            <p className="text-sm text-ink-muted">
              Who changed what, when, and who reviewed it.
            </p>
          </header>
          <HistoryView history={history} />
        </div>
      )}
    </PotShell>
  );
}
