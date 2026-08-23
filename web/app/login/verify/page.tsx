import { redirect } from "next/navigation";
import { SecondFactorGate } from "@/components/auth/second-factor-gate";
import { Wordmark } from "@/components/shell/wordmark";
import {
  getAuthUser,
  getVerifiedSecondFactorId,
  secondFactorOutstanding,
} from "@/lib/auth/server";
import { safeNextPath } from "@/lib/auth/next-path";

export const metadata = { title: "One more step" };

/**
 * Where a half-finished sign in lands.
 *
 * This page must not call requireAuthUser: that is what sends sessions here,
 * and calling it would loop. It makes its own three checks instead, and every
 * one of them is a way out rather than a wall.
 */
export default async function VerifyPage({ searchParams }: PageProps<"/login/verify">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;

  const user = await getAuthUser();
  if (!user) redirect("/login");
  // Nothing outstanding means the session is whole, so this page has no job.
  if (!(await secondFactorOutstanding())) redirect(safeNextPath(next) ?? "/home");

  const factorId = await getVerifiedSecondFactorId();
  // Outstanding but no verified factor should be impossible. Falling through to
  // a form with no factor to check would strand the person, so send them back.
  if (!factorId) redirect("/login");

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 gap-8">
      <Wordmark size="lg" />
      <SecondFactorGate factorId={factorId} next={next} />
    </div>
  );
}
