"use server";

import type { WeekDay } from "@/lib/contributions/streak";
import { countedJustNow, getOwnRecord } from "@/lib/data/streak";
import { getUser } from "@/lib/data/user";

export type RecordCheck = {
  /** True only when the action that just finished was the first to count today. */
  countedNow: boolean;
  /** Days in a row ending today. */
  days: number;
  /** The calendar week, Monday first, for the seven dots. */
  week: WeekDay[];
};

const NOTHING: RecordCheck = { countedNow: false, days: 0, week: [] };

/**
 * Asked by a completion screen once its write has landed: was that the first
 * thing to count today, and what does the record look like now? True earns
 * the day's one celebration and nothing else. Signed out, or anything
 * failing, reads as false, so the screen simply says what it said before.
 */
export async function checkRecord(): Promise<RecordCheck> {
  try {
    const user = await getUser();
    if (!user) return NOTHING;
    const countedNow = await countedJustNow(user.id);
    if (!countedNow) return NOTHING;
    const record = await getOwnRecord(user.id);
    return { countedNow, days: record.current, week: record.week };
  } catch {
    return NOTHING;
  }
}
