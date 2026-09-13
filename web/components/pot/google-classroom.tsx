"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Cards, FileText, GoogleLogo, LinkSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardSection, Eyebrow } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { supabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

type Course = { id: string; name: string; section: string | null };
type PushSet = { id: string; title: string; kind: "practice" | "flashcards" };

/**
 * Google Classroom, as a quiet card on the Pot's settings page.
 *
 * Pushing hands Google a link back into the app; the material itself stays
 * here, where the answer keys already are. The card says plainly what the
 * feature can and cannot do yet: Google only lets test users on our project
 * grant these scopes until the app has been verified.
 */
export function GoogleClassroom({
  potId,
  potTitle,
  pushableSets,
}: {
  potId: string;
  potTitle: string;
  pushableSets: PushSet[];
}) {
  const router = useRouter();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [courseId, setCourseId] = useState<string>("");
  const [setId, setSetId] = useState<string>(pushableSets[0]?.id ?? "");
  const [pushing, setPushing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pushed, setPushed] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabaseBrowser().rpc("has_google_token");
      setConnected(data === true);
      if (data !== true) return;
      const response = await fetch("/api/google/classes");
      if (response.ok) {
        const body = (await response.json()) as { courses?: Course[] };
        setCourses(body.courses ?? []);
        setCourseId(body.courses?.[0]?.id ?? "");
      } else {
        setCourses([]);
      }
      const me = await supabaseBrowser().rpc("my_google_token");
      const row = me.data as { accountEmail?: string } | null;
      setAccountEmail(row?.accountEmail ?? null);
    })();
  }, []);

  async function push() {
    if (!courseId || !setId || pushing) return;
    setPushing(true);
    setError(null);
    setPushed(null);
    try {
      const response = await fetch("/api/google/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ potId, courseId, studySetId: setId }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok || body?.error) {
        setError(
          body?.error === "rate_limited"
            ? "You have pushed several things just now. Wait a little and try again."
            : body?.error === "not_connected"
              ? "Connect a Google account first."
              : "Google did not accept the push. Try again in a moment.",
        );
        return;
      }
      setPushed("Posted to Classroom.");
      router.refresh();
    } catch {
      setError("Google did not accept the push. Try again in a moment.");
    } finally {
      setPushing(false);
    }
  }

  async function disconnect() {
    await supabaseBrowser().rpc("forget_google_token");
    setConnected(false);
    setAccountEmail(null);
    setCourses(null);
    router.refresh();
  }

  return (
    <Card>
      <CardSection className="space-y-4 py-6">
        <div className="space-y-0.5">
          <Eyebrow>Google Classroom</Eyebrow>
          <p className="text-[13px] leading-relaxed text-ink-muted">
            Post a saved test or deck to one of your classes. Google carries the
            link; the material, the marking and the records stay here.
          </p>
        </div>

        {connected === null ? (
          <p className="text-[12px] text-ink-faint">Checking the connection.</p>
        ) : connected === false ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13px] text-ink-muted">Not connected.</p>
            <a
              href={`/api/google/connect?potId=${potId}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-edge-strong bg-surface px-3.5 text-[13px] font-medium text-ink transition-colors hover:bg-sunken"
            >
              <GoogleLogo className="size-4" />
              Connect Google
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[13px] text-ink-muted">
                Connected as{" "}
                <span className="font-medium text-ink">{accountEmail ?? "a Google account"}</span>
              </p>
              <Button variant="quiet" size="sm" onClick={() => void disconnect()}>
                Disconnect
              </Button>
            </div>

            {courses === null ? (
              <p className="text-[12px] text-ink-faint">Reading your classes.</p>
            ) : courses.length === 0 ? (
              <p className="text-[13px] text-ink-faint">
                No active classes on that account. Create one in Classroom first.
              </p>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select
                    label="Class"
                    value={courseId}
                    onChange={setCourseId}
                    options={courses.map((course) => ({
                      value: course.id,
                      label: course.section ? `${course.name} · ${course.section}` : course.name,
                    }))}
                  />
                  <Select
                    label="What to post"
                    value={setId}
                    onChange={setSetId}
                    options={pushableSets.map((set) => ({
                      value: set.id,
                      label: set.title,
                    }))}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="flex items-center gap-1.5 text-[12px] text-ink-faint">
                    {pushableSets.find((set) => set.id === setId)?.kind === "flashcards" ? (
                      <Cards className="size-3.5" aria-hidden />
                    ) : (
                      <FileText className="size-3.5" aria-hidden />
                    )}
                    <LinkSimple className="size-3.5" aria-hidden />
                    {potTitle} opens when a student follows the link.
                  </p>
                  <Button size="sm" onClick={() => void push()} disabled={pushing || !courseId || !setId}>
                    {pushing ? "Posting" : "Post to Classroom"}
                  </Button>
                </div>
                {pushed ? (
                  <p aria-live="polite" className={cn("text-[13px] text-success")}>
                    {pushed}
                  </p>
                ) : null}
              </>
            )}
          </div>
        )}

        {error ? (
          <p role="alert" className="text-[13px] text-danger">
            {error}
          </p>
        ) : null}

        <p className="border-t border-edge pt-3 text-[12px] text-ink-faint">
          Google only lets test users on our project grant this until the app
          has been verified. Nothing is posted with a due date, because nothing
          here has one.
        </p>
      </CardSection>
    </Card>
  );
}
