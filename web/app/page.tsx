import { redirect } from "next/navigation";
import { BrandLanding } from "@/components/landing/brand-landing";
import { INVALID_CODE_MESSAGE } from "@/components/landing/join-card";
import { supabaseServer } from "@/lib/supabase/server";

export default async function LandingPage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const code = typeof params.code === "string" ? params.code : "";
  const invalid = params.error === "notfound";

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    // A signed-in user who followed a dead invite link still needs to see
    // the failure; /home surfaces it next to its join field.
    redirect(
      invalid ? `/home?code=${encodeURIComponent(code)}&error=notfound` : "/home",
    );
  }

  return (
    <BrandLanding
      initialCode={code}
      initialError={invalid ? INVALID_CODE_MESSAGE : null}
    />
  );
}
