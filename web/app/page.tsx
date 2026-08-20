import { redirect } from "next/navigation";
import { BrandLanding } from "@/components/landing/brand-landing";
import { INVALID_CODE_MESSAGE } from "@/components/landing/join-card";
import { supabaseServer } from "@/lib/supabase/server";

const LANDING_ERRORS: Record<string, string> = {
  notfound: INVALID_CODE_MESSAGE,
  busy: "Too many tries from this network. Wait a few minutes and try again.",
  error: "We couldn't reach that Pot just now. Try again in a moment.",
};

export default async function LandingPage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const code = typeof params.code === "string" ? params.code : "";
  const errorKey = typeof params.error === "string" ? params.error : "";
  const message = LANDING_ERRORS[errorKey] ?? null;

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // A signed-in user who followed a dead or failed invite link still needs the
  // failure; /home surfaces it next to its join field. Otherwise the landing
  // stays open to them, with the dashboard one click away.
  if (user && message) {
    redirect(
      `/home?code=${encodeURIComponent(code)}&error=${encodeURIComponent(errorKey)}`,
    );
  }

  return (
    <BrandLanding initialCode={code} initialError={message} signedIn={Boolean(user)} />
  );
}
