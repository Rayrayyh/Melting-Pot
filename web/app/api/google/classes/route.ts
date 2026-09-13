import { NextResponse } from "next/server";
import { getGoogleAccessToken } from "@/lib/google/token";
import { supabaseServer } from "@/lib/supabase/server";

export const maxDuration = 26;

const NO_STORE = { "Cache-Control": "no-store, no-cache, must-revalidate" };

/** The classes the connected account teaches, for the picker on the card. */
export async function GET() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const credentials = await getGoogleAccessToken();
  if (!credentials) return NextResponse.json({ error: "not_connected" }, { status: 403, headers: NO_STORE });

  const response = await fetch(
    "https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE&pageSize=50",
    { headers: { Authorization: `Bearer ${credentials.accessToken}` } },
  );
  if (!response.ok) {
    return NextResponse.json({ error: "classroom_unavailable" }, { status: 502, headers: NO_STORE });
  }
  const body = (await response.json().catch(() => null)) as {
    courses?: Array<{ id?: string; name?: string; section?: string }>;
  } | null;
  const courses = (body?.courses ?? [])
    .filter((course): course is { id: string; name?: string; section?: string } => Boolean(course.id))
    .map((course) => ({
      id: course.id,
      name: course.name?.trim() || "Untitled class",
      section: course.section?.trim() || null,
    }));
  return NextResponse.json({ courses }, { headers: NO_STORE });
}
