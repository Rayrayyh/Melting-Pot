import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { Wordmark } from "@/components/shell/wordmark";
import { normalizeClassCode } from "@/lib/class-code";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const rawCode = typeof params.code === "string" ? params.code : "";
  const code = rawCode ? normalizeClassCode(rawCode) : "";
  const next = typeof params.next === "string" ? params.next : undefined;

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(code ? `/join/${code}` : "/home");

  let potTitle: string | undefined;
  if (code.length === 6) {
    const { data } = await supabase.rpc("lookup_pot_by_code", { p_code: code });
    potTitle = (data as { title?: string } | null)?.title;
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 gap-8">
      <Wordmark size="lg" />
      <AuthForm mode="login" code={code || undefined} next={next} potTitle={potTitle} />
    </div>
  );
}
