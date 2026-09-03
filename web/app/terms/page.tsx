import type { Metadata } from "next";
import { LegalPage } from "@/components/landing/legal-page";
import { REPO_URL } from "@/components/landing/site-content";
import { getAuthUser } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "The terms that apply when you use MeltingPot.",
};

export default async function TermsPage() {
  const user = await getAuthUser();

  return (
    <LegalPage
      signedIn={Boolean(user)}
      eyebrow="The fine print, kept short"
      title="Terms of service"
      updated="22 August 2026"
    >
      <section>
        <h2>What MeltingPot is</h2>
        <p>
          MeltingPot is a shared space where a class builds one set of notes
          together. It was built by students for the Prometheus August AI
          Challenge and is provided free, as is, while we keep it running. It is a
          student project, not a commercial service, and it may change or
          pause without notice.
        </p>
      </section>
      <section>
        <h2>Your account</h2>
        <p>
          You need an account to join a class and contribute. Keep your
          password to yourself, and tell us through the repository below if
          you believe someone else has used your account. You are responsible
          for what happens under your sign in.
        </p>
      </section>
      <section>
        <h2>Your content</h2>
        <p>
          Your notes are yours. By sharing a note with a class you give that
          class permission to read it, study from it, and propose corrections
          to it inside MeltingPot. You can stop sharing new work at any time.
          Originals are never edited or deleted by the app: every version of
          a shared note, including the first, stays attached to it.
        </p>
      </section>
      <section>
        <h2>Acceptable use</h2>
        <ul>
          <li>Only share notes you have the right to share.</li>
          <li>Do not upload content that is unlawful, hateful, or harassing.</li>
          <li>Do not upload malware or attempt to break the service or its limits.</li>
          <li>Do not try to access classes or drafts that are not yours.</li>
        </ul>
        <p>
          Maintainers can remove shared content from their class, and we can
          remove content or accounts that break these rules.
        </p>
      </section>
      <section>
        <h2>The organizer</h2>
        <p>
          MeltingPot uses an AI model to organize notes and to build study
          material. It can be wrong. Organized versions and generated study
          material are suggestions to review, not statements of fact, and the
          person sharing a note is responsible for what it says.
        </p>
      </section>
      <section>
        <h2>No warranty</h2>
        <p>
          MeltingPot is provided as is, without warranties of any kind. To
          the extent the law allows, we are not liable for lost content, lost
          marks, or any damages arising from your use of the service. Keep
          your own copies of anything you cannot afford to lose.
        </p>
      </section>
      <section>
        <h2>Changes and contact</h2>
        <p>
          If these terms change, the date above changes with them. Questions
          and problems are welcome as issues on{" "}
          <a href={REPO_URL} target="_blank" rel="noreferrer noopener">
            the open source repository
          </a>
          .
        </p>
      </section>
    </LegalPage>
  );
}
