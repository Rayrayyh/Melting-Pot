"use client";

import { useState } from "react";
import { ChalkboardTeacher, Sparkle, Warning } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardSection, Eyebrow } from "@/components/ui/card";
import { Stir } from "@/components/brand/stir";
import {
  MIN_ANSWERS,
  MIN_STUDENTS,
  missRate,
  rankTopics,
  type ClassEvidence,
  type TopicEvidence,
} from "@/lib/teaching/evidence";

type Readout = {
  holding: string[];
  revisit: { topic: string; reading: string; tryThis: string }[];
};

type Response = {
  readout?: Readout | null;
  evidence?: ClassEvidence;
  model?: string;
  reason?: string;
  error?: string;
};

const REASONS: Record<string, string> = {
  not_enough_practice: `Not enough practice yet to read anything into. This needs at least ${MIN_ANSWERS} first-pass answers from ${MIN_STUDENTS} people before it will guess at a pattern.`,
  mixing_unavailable: "The model is not configured on this deployment, so there is nothing to read the results for you. The counts below are the whole picture.",
  model_unavailable: "The model could not be reached just now. The counts below still stand; try again in a moment for the reading.",
};

/**
 * What the class as a whole is getting wrong, and what to do about it.
 *
 * Everything else in this product is built for the student. This is the one
 * screen for the person teaching them, and the split between the two halves is
 * the point: the counts are a SQL aggregate over answers people actually gave,
 * and the model only ever reads them. It cannot inflate a number because it is
 * never asked for one.
 *
 * Nothing here is per student. No name, no ranking, no comparison. A teacher
 * looking at this is looking at the material.
 */
export function TeachingReadout({ potId }: { potId: string }) {
  const [state, setState] = useState<Response | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function run() {
    setBusy(true);
    setFailed(false);
    try {
      const response = await fetch("/api/ai/teaching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ potId }),
      });
      const payload = (await response.json().catch(() => null)) as Response | null;
      if (!payload || payload.error) {
        setFailed(true);
        return;
      }
      setState(payload);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const topics = rankTopics(state?.evidence?.topics ?? []);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-[13px] font-medium text-ink-muted">What the class is shaky on</p>
          <p className="max-w-2xl text-[12px] text-ink-faint">
            Read from the questions your class has actually answered, grouped by
            the note each question came from. About the material, not the people:
            no student is named, counted, or compared here.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void run()} disabled={busy}>
          {busy ? <Stir size={16} /> : <ChalkboardTeacher className="size-4" />}
          {busy ? "Reading the results" : state ? "Read them again" : "Read the results"}
        </Button>
      </div>

      {failed ? (
        <p className="flex items-start gap-1.5 text-[12px] text-danger">
          <Warning className="mt-px size-3.5 shrink-0" aria-hidden />
          <span>That did not go through. Try again in a moment.</span>
        </p>
      ) : null}

      {state?.reason ? (
        <Card>
          <CardSection className="py-6">
            <p className="text-sm text-ink-muted">{REASONS[state.reason] ?? "Nothing to show yet."}</p>
          </CardSection>
        </Card>
      ) : null}

      {state?.readout ? (
        <Card>
          <CardSection className="space-y-5">
            {state.readout.holding.length ? (
              <div className="space-y-1.5">
                <Eyebrow>Holding up</Eyebrow>
                <ul className="space-y-1 text-sm text-ink-muted">
                  {state.readout.holding.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="space-y-3">
              <Eyebrow>Worth revisiting</Eyebrow>
              {state.readout.revisit.map((entry) => (
                <div key={entry.topic} className="space-y-1 border-l-2 border-primary pl-3">
                  <p className="text-sm font-medium text-ink">{entry.topic}</p>
                  <p className="text-[13px] leading-relaxed text-ink-muted">{entry.reading}</p>
                  <p className="text-[13px] leading-relaxed text-ink">
                    <span className="text-ink-faint">Try this: </span>
                    {entry.tryThis}
                  </p>
                </div>
              ))}
            </div>

            {state.model ? (
              <p className="flex items-center gap-1.5 border-t border-edge pt-3 text-[12px] text-ink-faint">
                <Sparkle className="size-3.5 shrink-0" weight="fill" aria-hidden />
                <span>
                  Read by <span className="text-ink-muted">{state.model}</span> from{" "}
                  {state.evidence?.answered ?? 0} answers. The counts are the database&apos;s, not
                  the model&apos;s.
                </span>
              </p>
            ) : null}
          </CardSection>
        </Card>
      ) : null}

      {topics.length ? <TopicTable topics={topics} /> : null}
    </section>
  );
}

/**
 * The counts the reading was made from, shown underneath it. A teacher being
 * told what their class is struggling with should be able to check the claim
 * without taking anyone's word for it.
 */
function TopicTable({ topics }: { topics: TopicEvidence[] }) {
  return (
    <Card>
      <CardSection className="space-y-2">
        <Eyebrow>The counts behind it</Eyebrow>
        <div className="overflow-x-auto">
          <table className="w-full min-w-md text-left text-[13px]">
            <thead className="text-[12px] text-ink-faint">
              <tr>
                <th className="pb-1.5 font-normal">Topic</th>
                <th className="pb-1.5 pl-4 font-normal tabular-nums">Missed</th>
                <th className="pb-1.5 pl-4 font-normal tabular-nums">Asked</th>
                <th className="pb-1.5 pl-4 font-normal tabular-nums">People</th>
              </tr>
            </thead>
            <tbody>
              {topics.map((topic) => (
                <tr key={topic.topic} className="border-t border-edge">
                  <td className="py-2 pr-4 text-ink">{topic.topic}</td>
                  <td className="py-2 pl-4 tabular-nums text-ink">
                    {topic.missed}
                    <span className="pl-1.5 text-[12px] text-ink-faint">
                      {Math.round(missRate(topic) * 100)}%
                    </span>
                  </td>
                  <td className="py-2 pl-4 tabular-nums text-ink-muted">{topic.asked}</td>
                  <td className="py-2 pl-4 tabular-nums text-ink-muted">{topic.students}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardSection>
    </Card>
  );
}
