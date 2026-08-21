"use client";

import { useEffect, useState } from "react";
import { Eye, Lightbulb, Tray } from "@phosphor-icons/react";
import { AppShell } from "@/components/shell/app-shell";
import { PotNav, UserNav } from "@/components/shell/left-nav";
import { AttributionRow, Avatar } from "@/components/ui/avatar";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Stir } from "@/components/brand/stir";
import { StirPot } from "@/components/brand/stir-pot";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { Card, CardSection, Eyebrow } from "@/components/ui/card";
import { ClassCodeInput } from "@/components/ui/class-code-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, TextArea } from "@/components/ui/input";
import { MetricCard } from "@/components/ui/metric-card";
import { NoticeBanner } from "@/components/ui/notice-banner";
import { RolePill, SectionPill, StatusPill } from "@/components/ui/pills";
import { FlowProgress, StageChecklist } from "@/components/ui/progress-steps";
import { StickyActionBar } from "@/components/ui/sticky-action-bar";

const demoSections = [
  { id: "s1", title: "Week 1: Foundations" },
  { id: "s2", title: "Week 2: Cell cycle" },
  { id: "s3", title: "Exam review" },
];

/** Times chosen to show distinct moments: rest, mid-orbit, and the burst. */
const STIR_FRAMES = [0, 0.4, 3.4, 4.2];

export default function StyleguidePage() {
  const [code, setCode] = useState("D2Z7");
  const [badCode, setBadCode] = useState("ABC123");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadingOpen, setLoadingOpen] = useState(false);

  // The real loader closes when its work finishes. Nothing is working here,
  // so the preview gives itself one loop and then lets go.
  useEffect(() => {
    if (!loadingOpen) return;
    const id = setTimeout(() => setLoadingOpen(false), 8000);
    return () => clearTimeout(id);
  }, [loadingOpen]);
  const [navMode, setNavMode] = useState<"user" | "pot">("pot");

  return (
    <AppShell
      displayName="Ada Lovelace"
      email="ada@example.com"
      searchScope={navMode === "pot" ? { potId: "demo", potTitle: "Biology 101" } : undefined}
      nav={
        navMode === "user" ? (
          <UserNav
            pots={[
              { id: "demo", title: "Biology 101" },
              { id: "demo2", title: "World History" },
            ]}
          />
        ) : (
          <PotNav
            potId="demo"
            potTitle="Biology 101"
            memberCount={12}
            sections={demoSections}
            role="maintainer"
            openReviewCount={2}
          />
        )
      }
    >
      <div className="mx-auto w-full max-w-3xl px-6 py-10 space-y-12 pb-28">
        <header className="space-y-2">
          <Eyebrow>Internal</Eyebrow>
          <h1 className="text-2xl font-semibold">Styleguide</h1>
          <p className="text-sm text-ink-muted">
            Every base component in both themes. Toggle the theme from the top bar.
          </p>
          <div className="flex gap-2 pt-2">
            <Button size="sm" variant={navMode === "user" ? "primary" : "secondary"} onClick={() => setNavMode("user")}>
              User nav
            </Button>
            <Button size="sm" variant={navMode === "pot" ? "primary" : "secondary"} onClick={() => setNavMode("pot")}>
              Pot nav
            </Button>
          </div>
        </header>

        <section className="space-y-4">
          <Eyebrow>Buttons</Eyebrow>
          <div className="flex flex-wrap items-center gap-3">
            <Button>Share with class</Button>
            <Button variant="secondary">Save draft</Button>
            <Button variant="quiet">View original</Button>
            <Button variant="clay">Add contribution</Button>
            <Button variant="danger">Decline</Button>
            <Button disabled>Organizing</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" variant="secondary">Copy code</Button>
            <Button size="lg">Join Pot</Button>
          </div>
        </section>

        <section className="space-y-4">
          <Eyebrow>The stir</Eyebrow>
          <Card>
            <CardSection className="flex flex-wrap items-center gap-8">
              {[96, 56, 24, 14].map((size) => (
                <div key={size} className="flex flex-col items-center gap-2">
                  <Stir size={size} />
                  <span className="text-[12px] text-ink-faint">{size}</span>
                </div>
              ))}
              <Button disabled>
                <Stir size={16} tone="on-primary" />
                Mixing
              </Button>
              <Button variant="secondary" disabled>
                <Stir size={16} />
                Writing
              </Button>
            </CardSection>
          </Card>
        </section>

        <section className="space-y-4">
          <Eyebrow>The stir, full screen</Eyebrow>
          <Card>
            <CardSection className="flex flex-wrap items-end gap-10">
              {STIR_FRAMES.map((t) => (
                <div key={t} className="flex flex-col items-center gap-2">
                  <StirPot t={t} size={150} />
                  <span className="text-[12px] text-ink-faint">t = {t}s</span>
                </div>
              ))}
              <div className="flex flex-col items-center gap-2">
                <StirPot t={0.6} size={150} variant="reduced" />
                <span className="text-[12px] text-ink-faint">reduced</span>
              </div>
            </CardSection>
          </Card>
          <Button variant="secondary" onClick={() => setLoadingOpen(true)}>
            Open the full-screen wait
          </Button>
        </section>

        <section className="space-y-4">
          <Eyebrow>Pills and status</Eyebrow>
          <div className="flex flex-wrap items-center gap-2.5">
            <StatusPill tone="success">Live</StatusPill>
            <StatusPill tone="pending">Waiting on maintainer</StatusPill>
            <StatusPill tone="warning">Revision requested</StatusPill>
            <StatusPill tone="danger">Declined</StatusPill>
            <StatusPill tone="primary">Ready</StatusPill>
            <StatusPill>Draft</StatusPill>
            <RolePill role="owner" />
            <RolePill role="maintainer" />
            <RolePill role="member" />
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <SectionPill active>Week 2: Cell cycle</SectionPill>
            <SectionPill>Exam review</SectionPill>
            <SectionPill>All sections</SectionPill>
          </div>
        </section>

        <section className="space-y-4">
          <Eyebrow>Metrics</Eyebrow>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard label="Contributors" value={12} />
            <MetricCard label="Shared notes" value={48} />
            <MetricCard label="Open corrections" value={2} tone="attention" href="#" />
            <MetricCard label="Class code" value="D2Z7GG" />
          </div>
        </section>

        <section className="space-y-4">
          <Eyebrow>Forms</Eyebrow>
          <Card>
            <CardSection className="space-y-5">
              <Field label="Pot name" hint="Titles can repeat. The class code is what stays unique.">
                {(props) => <Input {...props} placeholder="Biology 101" />}
              </Field>
              <Field label="What is this Pot for?" error="Something went wrong saving this.">
                {(props) => <TextArea {...props} rows={3} placeholder="Optional description" />}
              </Field>
            </CardSection>
          </Card>
          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <CardSection>
                <ClassCodeInput value={code} onValueChange={setCode} />
              </CardSection>
            </Card>
            <Card>
              <CardSection>
                <ClassCodeInput
                  value={badCode}
                  onValueChange={setBadCode}
                  error="We couldn't find that Pot. Check the code and try again."
                />
              </CardSection>
            </Card>
          </div>
        </section>

        <section className="space-y-4">
          <Eyebrow>Attribution</Eyebrow>
          <Card>
            <CardSection className="space-y-4">
              <AttributionRow name="Ava Morgan" meta="Shared 2 hours ago in Week 2: Cell cycle" />
              <AttributionRow name="Omar Haddad" meta="Correction accepted yesterday" size="sm" />
              <div className="flex items-center gap-2">
                <Avatar name="Ada Lovelace" size="lg" />
                <Avatar name="Grace Hopper" size="md" />
                <Avatar name="Mae Jemison" size="sm" />
              </div>
            </CardSection>
          </Card>
        </section>

        <section className="space-y-4">
          <Eyebrow>Progress</Eyebrow>
          <Card>
            <CardSection className="space-y-6">
              <FlowProgress step={1} total={3} label="Write" />
              <StageChecklist
                stages={[
                  { label: "Original preserved", detail: "Saved exactly as you wrote it", state: "done" },
                  { label: "Structuring the idea", detail: "Building a scannable explanation", state: "active" },
                  { label: "Creating a summary", state: "waiting" },
                  { label: "Suggesting placement", state: "waiting" },
                ]}
              />
            </CardSection>
          </Card>
        </section>

        <section className="space-y-4">
          <Eyebrow>Banners</Eyebrow>
          <div className="space-y-3">
            <NoticeBanner tone="success" icon={<Tray />} title="Shared with the class">
              Your contribution is live and credited to you.
            </NoticeBanner>
            <NoticeBanner tone="warning" title="Revision requested">
              Keep working on the same proposal. Ms. Chen left feedback below.
            </NoticeBanner>
            <NoticeBanner tone="primary" icon={<Lightbulb />} title="A maintainer approves changes">
              Your proposal won&apos;t replace the note automatically.
            </NoticeBanner>
            <NoticeBanner tone="danger" title="We couldn't organize this contribution">
              Your original draft is safe. You can try again or edit it manually.
            </NoticeBanner>
          </div>
        </section>

        <section className="space-y-4">
          <Eyebrow>Breadcrumb</Eyebrow>
          <Breadcrumb
            crumbs={[
              { label: "Biology 101", href: "#" },
              { label: "Week 2: Cell cycle", href: "#" },
              { label: "Mitosis vs meiosis" },
            ]}
          />
        </section>

        <section className="space-y-4">
          <Eyebrow>Empty state</Eyebrow>
          <Card>
            <EmptyState
              icon={<Tray />}
              title="Nothing in the pot yet"
              body="Be the first. Write it however it comes to you."
              action={<Button>Add contribution</Button>}
            />
          </Card>
        </section>

        <section className="space-y-4">
          <Eyebrow>Dialog</Eyebrow>
          <Button variant="secondary" onClick={() => setDialogOpen(true)}>
            Open confirm dialog
          </Button>
          <LoadingScreen open={loadingOpen} />
          <ConfirmDialog
            open={dialogOpen}
            title="Regenerate class code?"
            confirmLabel="Regenerate code"
            tone="danger"
            onConfirm={() => setDialogOpen(false)}
            onCancel={() => setDialogOpen(false)}
          >
            This invalidates the old code. Anyone joining will need the new one.
          </ConfirmDialog>
        </section>

        <section className="space-y-4">
          <Eyebrow>Long-form serif</Eyebrow>
          <Card>
            <CardSection className="font-serif text-[17px] leading-relaxed space-y-4">
              <p>
                Mitosis produces two identical daughter cells, while meiosis produces four
                genetically distinct cells with half the chromosome count. The distinction
                matters because growth and repair rely on the first, and reproduction relies
                on the second.
              </p>
              <p className="text-ink-muted">
                Shared notes render in Source Serif for comfortable long reading, while
                controls and metadata stay in Inter.
              </p>
            </CardSection>
          </Card>
        </section>
      </div>

      <StickyActionBar message="Only you can approve what gets shared." icon={<Eye />}>
        <Button variant="secondary">Edit</Button>
        <Button>Share with class</Button>
      </StickyActionBar>
    </AppShell>
  );
}
