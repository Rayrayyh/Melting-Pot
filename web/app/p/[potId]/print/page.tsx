import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintCards } from "@/components/study/print-cards";
import { Card, CardSection } from "@/components/ui/card";
import { getPotContext } from "@/lib/data/pot";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata = { title: "Print cards" };

/**
 * Printed cards, deliberately outside the app shell: what the printer receives
 * is the paper, not the page. Reaching this URL requires membership, like every
 * other surface in the Pot; the material printed is decks and hand-written
 * cards only, so no answer key can ever ride out of here.
 */
export default async function PrintPage({
  params,
  searchParams,
}: PageProps<"/p/[potId]/print">) {
  const { potId } = await params;
  const query = await searchParams;
  const pot = await getPotContext(potId);
  if (!pot) notFound();

  const setId = first(query.setId);
  const noteId = first(query.noteId);
  const supabase = await supabaseServer();

  let title = "cards";
  let cards: Array<{ front: string; back: string }> = [];

  if (setId) {
    const { data } = await supabase
      .from("study_sets")
      .select("payload")
      .eq("id", setId)
      .eq("pot_id", potId)
      .eq("kind", "flashcards")
      .is("removed_at", null)
      .maybeSingle();
    const payload = data?.payload as { title?: unknown; cards?: unknown } | null | undefined;
    const raw = Array.isArray(payload?.cards) ? payload.cards : [];
    cards = raw
      .map((card) => readFace(card))
      .filter((card): card is { front: string; back: string } => card !== null);
    if (typeof payload?.title === "string" && payload.title.trim()) {
      title = payload.title.trim();
    }
  } else if (noteId) {
    const { data } = await supabase
      .from("note_flashcards")
      .select("front, back")
      .eq("note_id", noteId)
      .eq("pot_id", potId)
      .is("removed_at", null)
      .order("created_at");
    cards = (data ?? []).map((card) => ({ front: card.front, back: card.back }));
    title = "Cards from this note";
  }

  if (cards.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <Link href={`/p/${potId}`} className="text-[13px] text-ink-muted hover:text-ink">
          Back to {pot.title}
        </Link>
        <Card className="mt-4">
          <CardSection className="py-10 text-center">
            <p className="text-sm text-ink-muted">There are no cards here to print.</p>
          </CardSection>
        </Card>
      </div>
    );
  }

  return <PrintCards title={title} cards={cards} backHref={`/p/${potId}`} />;
}

function first(value: string | string[] | undefined): string | null {
  const wanted = Array.isArray(value) ? value[0] : value;
  return typeof wanted === "string" && wanted.length > 0 ? wanted : null;
}

function readFace(card: unknown): { front: string; back: string } | null {
  if (!card || typeof card !== "object") return null;
  const record = card as Record<string, unknown>;
  if (typeof record.front !== "string" || typeof record.back !== "string") return null;
  return { front: record.front, back: record.back };
}
