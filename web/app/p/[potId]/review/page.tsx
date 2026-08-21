import { redirect } from "next/navigation";

/**
 * The review queue moved into the Pot's admin page, which carries it alongside
 * the record it was always missing: what has been written, every version that
 * replaced a version, and everything taken out. The decision surface itself is
 * still /review/[proposalId], so links a maintainer has already sent still open
 * the correction they were sent for.
 */
export default async function ReviewQueueRedirect({ params }: PageProps<"/p/[potId]/review">) {
  const { potId } = await params;
  redirect(`/p/${potId}/admin`);
}
