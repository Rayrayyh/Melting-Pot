import type { Metadata } from "next";
import { LegalPage } from "@/components/landing/legal-page";
import { REPO_URL } from "@/components/landing/site-content";
import { getAuthUser } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What MeltingPot collects, why, and who can see it.",
};

export default async function PrivacyPage() {
  const user = await getAuthUser();

  return (
    <LegalPage
      signedIn={Boolean(user)}
      eyebrow="What we know and who sees it"
      title="Privacy policy"
      updated="2 September 2026"
    >
      <section>
        <h2>What we collect</h2>
        <ul>
          <li>Your email address and display name, to run your account.</li>
          <li>The notes, attachments, and corrections you write.</li>
          <li>Which classes you belong to and your role in them.</li>
          <li>
            A private record of the days you contributed, shown only to you.
          </li>
        </ul>
        <p>
          There are no advertising trackers and no analytics scripts. Cookies
          are used for two things: keeping you signed in, and remembering your
          time zone so the days on your private record are counted where you
          are.
        </p>
      </section>
      <section>
        <h2>Who can see your work</h2>
        <p>
          Drafts are private to you. Nobody, including class maintainers, can
          read a note you have not shared. When you share a note, the members
          of that class can read it, and your name appears on it. Your record of
          days is never shown to anyone else. Where you stand in a class is
          worked out on the server from the class as a whole and shown only to
          you.
        </p>
      </section>
      <section>
        <h2>The organizer and AI</h2>
        <p>
          When you ask MeltingPot to organize a note or build study material,
          the text of that note, and any images attached to it, are sent to
          Google&apos;s model API to produce the organized version. We do not
          use your notes to train models. When no model is configured, a
          deterministic organizer runs instead and your note leaves the
          database for nowhere.
        </p>
      </section>
      <section>
        <h2>Where it lives</h2>
        <p>
          Data is stored in Supabase, which runs on managed cloud
          infrastructure. Every table is protected by row level security, so
          the database itself enforces who can read what, and accounts that
          maintain classes can turn on two-step sign in.
        </p>
      </section>
      <section>
        <h2>Deletion</h2>
        <p>
          Removing a shared note in a class marks it removed rather than
          destroying it, so a mistaken removal can be undone by a maintainer.
          If you want your account or your content permanently deleted, ask
          through the repository below and we will do it.
        </p>
      </section>
      <section>
        <h2>Changes and contact</h2>
        <p>
          If this policy changes, the date above changes with it. Questions
          are welcome as issues on{" "}
          <a href={REPO_URL} target="_blank" rel="noreferrer noopener">
            the open source repository
          </a>
          .
        </p>
      </section>
    </LegalPage>
  );
}
