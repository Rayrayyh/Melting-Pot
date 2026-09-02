import { supabaseServer } from "@/lib/supabase/server";
import { localDate } from "@/lib/contributions/streak";
import {
  emptyCounts,
  firstWeekStart,
  type ActivityKind,
  type DayActivity,
  type Standing,
} from "@/lib/contributions/stream";
import { readerZone } from "@/lib/data/streak";

export type YearTotals = Record<ActivityKind, number>;

export type ContributionYear = {
  days: DayActivity[];
  totals: YearTotals;
  today: string;
};

/**
 * Twelve months of one person's own work, bucketed by day in their zone:
 * notes shared, corrections accepted, corrections they reviewed, resources
 * attached, study runs. Each query is filtered to the caller; row level
 * security narrows the rest.
 */
export async function getContributionYear(userId: string): Promise<ContributionYear> {
  const [supabase, zone] = await Promise.all([supabaseServer(), readerZone()]);
  const now = Date.now();
  const today = localDate(now, zone);
  // The first drawn week, with a day of slack for zones ahead of UTC.
  const first = firstWeekStart(today);
  const since = new Date(Date.parse(`${first}T00:00:00Z`) - 86_400_000).toISOString();
  const [shares, studies, accepted, reviews, resources] = await Promise.all([
    supabase
      .from("shared_notes")
      .select("shared_at")
      .eq("contributor_id", userId)
      .gte("shared_at", since)
      .order("shared_at", { ascending: false })
      .limit(2000),
    supabase
      .from("study_attempts")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(2000),
    supabase
      .from("revision_proposals")
      .select("decided_at")
      .eq("proposer_id", userId)
      .eq("status", "accepted")
      .gte("decided_at", since)
      .order("decided_at", { ascending: false })
      .limit(2000),
    supabase
      .from("revision_proposals")
      .select("decided_at")
      .eq("decided_by", userId)
      .gte("decided_at", since)
      .order("decided_at", { ascending: false })
      .limit(2000),
    supabase
      .from("attachments")
      .select("created_at, contribution:contributions!attachments_contribution_id_fkey!inner(status)")
      .eq("created_by", userId)
      .eq("contribution.status", "shared")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(2000),
  ]);
  for (const result of [shares, studies, accepted, reviews, resources]) {
    if (result.error) console.error("[contributions]", result.error.message);
  }

  const byDay = new Map<string, Record<ActivityKind, number>>();
  const totals: YearTotals = emptyCounts();
  function add(kind: ActivityKind, moments: Array<string | null>) {
    for (const moment of moments) {
      if (!moment) continue;
      const day = localDate(moment, zone);
      if (!day || day < first) continue;
      const counts = byDay.get(day) ?? emptyCounts();
      counts[kind] += 1;
      byDay.set(day, counts);
      totals[kind] += 1;
    }
  }
  add("share", (shares.data ?? []).map((r) => r.shared_at));
  add("study", (studies.data ?? []).map((r) => r.created_at));
  add("accepted", (accepted.data ?? []).map((r) => r.decided_at));
  add("review", (reviews.data ?? []).map((r) => r.decided_at));
  add("resource", (resources.data ?? []).map((r) => r.created_at));

  return {
    days: [...byDay.entries()].map(([day, counts]) => ({ day, counts })).sort((a, b) => a.day.localeCompare(b.day)),
    totals,
    today,
  };
}

/**
 * The caller's standing in each active class, computed by own_standing so
 * nobody's individual counts reach the browser. Empty on any failure: the
 * page then simply has no standing to show.
 */
export async function getStanding(): Promise<Standing[]> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("own_standing");
  if (error) {
    console.error("[standing]", error.message);
    return [];
  }
  return Array.isArray(data) ? (data as unknown as Standing[]) : [];
}
