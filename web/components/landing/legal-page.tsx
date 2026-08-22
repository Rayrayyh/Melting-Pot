import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";

/**
 * Shared chrome for the legal pages: a quiet prose column under the public
 * header. Sections are plain h2 + paragraphs, written in the app's own voice.
 */
export function LegalPage({
  signedIn,
  eyebrow,
  title,
  updated,
  children,
}: {
  signedIn: boolean;
  eyebrow: string;
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <SiteHeader signedIn={signedIn} />
      <main className="px-6 sm:px-10 pt-14 sm:pt-20 pb-24 sm:pb-32">
        <div className="mx-auto w-full max-w-2xl space-y-5">
          <p className="text-[12px] font-semibold tracking-[0.14em] uppercase text-clay">
            {eyebrow}
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.08] text-ink">
            {title}
          </h1>
          <p className="text-[13px] text-ink-faint">Last updated {updated}</p>
          <div className="pt-4 space-y-10 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-ink [&_section]:space-y-3 [&_p]:text-[15px] [&_p]:leading-relaxed [&_p]:text-ink-muted [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_li]:text-[15px] [&_li]:leading-relaxed [&_li]:text-ink-muted [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4">
            {children}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
