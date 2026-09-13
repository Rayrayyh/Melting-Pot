import { NextResponse } from "next/server";
import { courseworkBody, courseworkUrl } from "@/lib/google/oauth";
import { getGoogleAccessToken } from "@/lib/google/token";
import { supabaseServer } from "@/lib/supabase/server";

export const maxDuration = 26;

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

/**
 * Pushes one saved set to one Classroom class as coursework carrying a link
 * back into the app. The link is the whole assignment: the material stays
 * here, where the answer keys already are, and where answering is marked on
 * the server. No due date travels with it, because nothing in this product
 * has one.
 */
export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null) as {
    potId?: string;
    courseId?: string;
    studySetId?: string;
  } | null;
  const potId = typeof body?.potId === "string" ? body.potId : "";
  const courseId = typeof body?.courseId === "string" ? body.courseId : "";
  const studySetId = typeof body?.studySetId === "string" ? body.studySetId : "";
  if (!potId || !courseId || !studySetId) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  // Pushing is a maintainer's act, like hosting a room.
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("pot_id", potId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership || (membership.role !== "maintainer" && membership.role !== "owner")) {
    return NextResponse.json({ error: "not_pot_maintainer" }, { status: 403 });
  }

  const { error: meterError } = await supabase.rpc("meter_classroom_push");
  if (meterError) {
    const limited = meterError.message.includes("rate_limited");
    return NextResponse.json(
      { error: limited ? "rate_limited" : "push_unavailable" },
      { status: limited ? 429 : 503, headers: NO_STORE },
    );
  }

  const { data: set } = await supabase
    .from("study_sets")
    .select("kind, payload, removed_at")
    .eq("id", studySetId)
    .eq("pot_id", potId)
    .is("removed_at", null)
    .maybeSingle();
  if (!set || (set.kind !== "practice" && set.kind !== "flashcards")) {
    return NextResponse.json({ error: "invalid_set" }, { status: 400 });
  }
  const payload = set.payload as { title?: unknown } | null;
  const setTitle =
    typeof payload?.title === "string" && payload.title.trim()
      ? payload.title.trim()
      : set.kind === "practice"
        ? "Practice test"
        : "Flashcards";

  const { data: pot } = await supabase
    .from("pots")
    .select("title")
    .eq("id", potId)
    .maybeSingle();
  const potTitle = pot?.title?.trim() || "this Pot";

  const credentials = await getGoogleAccessToken();
  if (!credentials) return NextResponse.json({ error: "not_connected" }, { status: 403, headers: NO_STORE });

  const origin = new URL(request.url).origin;
  const link = `${origin}/p/${potId}/study/set/${studySetId}`;
  const response = await fetch(courseworkUrl(courseId), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credentials.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      courseworkBody({
        title: setTitle,
        description: `${setTitle}, from ${potTitle}. Open the link, work through it there, and the marking happens inside.`,
        url: link,
      }),
    ),
  });
  if (!response.ok) {
    return NextResponse.json({ error: "classroom_unavailable" }, { status: 502, headers: NO_STORE });
  }
  const created = (await response.json().catch(() => null)) as { id?: string; alternateLink?: string } | null;
  return NextResponse.json(
    { courseworkId: created?.id ?? null, alternateLink: created?.alternateLink ?? null },
    { headers: NO_STORE },
  );
}
