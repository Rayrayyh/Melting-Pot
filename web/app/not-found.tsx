import Link from "next/link";
import { PotMark } from "@/components/brand/pot-mark";

export const metadata = { title: "Page not found" };

/**
 * The 404, built from the supplied design file, replicated exactly: the same
 * hexes, sizes, positions, radii and animation timings.
 *
 * One deliberate departure, at the owner's instruction. The design's top left
 * mark is a placeholder, an orange rounded square with an m in it. That is our
 * real PotMark instead.
 *
 * The centre illustration is the design's own pot-splash-cut.png. The design
 * file points at an assets/ folder that did not come with it, but the image
 * was embedded as base64 in an earlier upload of this same page, keyed by an
 * internal id rather than a filename, so it is recovered rather than
 * substituted. 1448x1086 with real transparency.
 *
 * The colours are the design's fixed values rather than theme tokens, which
 * means this page is light in both themes. That is what "exact" costs, and it
 * is a change from the previous version, which followed the theme.
 */

/** The drifting accents, in the design's own units and timings. */
const ACCENTS = [
  { top: "84px", left: "11%", width: 46, height: 46, background: "#F0A24C", borderRadius: "62% 38% 55% 45% / 55% 48% 52% 45%", animation: "mp-drift 7s ease-in-out infinite" },
  { top: "190px", left: "6%", width: 18, height: 18, background: "#E07E22", borderRadius: "50%", animation: "mp-pulse 5s ease-in-out infinite" },
  { top: "88px", right: "4%", width: 58, height: 58, background: "#C4570E", borderRadius: "43% 57% 48% 52% / 58% 44% 56% 42%", animation: "mp-drift2 8s ease-in-out infinite" },
  { top: "250px", right: "5.5%", width: 14, height: 14, background: "#F6C989", borderRadius: "50%", animation: "mp-pulse 6s ease-in-out infinite 1s" },
  { bottom: "150px", left: "9%", width: 34, height: 52, background: "#E8933A", borderRadius: "50% 50% 46% 54% / 62% 64% 36% 38%", animation: "mp-drift 9s ease-in-out infinite 0.5s" },
  { bottom: "84px", left: "16%", width: 16, height: 16, background: "#C4570E", borderRadius: "50%", animation: "mp-pulse 7s ease-in-out infinite 2s" },
  { bottom: "190px", right: "7%", width: 42, height: 42, background: "#F0A24C", borderRadius: "55% 45% 62% 38% / 46% 55% 45% 54%", animation: "mp-drift2 7.5s ease-in-out infinite 1.2s" },
  { bottom: "96px", right: "13%", width: 20, height: 20, background: "#E07E22", borderRadius: "50%", animation: "mp-pulse 5.5s ease-in-out infinite 0.7s" },
  { top: "52%", left: "3%", width: 12, height: 12, background: "#F6C989", borderRadius: "50%", animation: "mp-pulse 6.5s ease-in-out infinite 1.6s" },
  { top: "46%", right: "3%", width: 10, height: 10, background: "#E8933A", borderRadius: "50%", animation: "mp-pulse 8s ease-in-out infinite 0.3s" },
] as const;

const DIGIT: React.CSSProperties = {
  fontFamily: "var(--font-bricolage), sans-serif",
  fontWeight: 800,
  fontSize: 300,
  lineHeight: 0.78,
  color: "#C4570E",
  letterSpacing: "-0.04em",
};

export default function NotFound() {
  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        background: "#FCF7EE",
        overflow: "hidden",
        display: "grid",
        placeItems: "center",
        fontFamily: "var(--font-figtree), sans-serif",
      }}
    >
      <Link
        href="/"
        style={{
          position: "absolute",
          top: 34,
          left: 44,
          display: "flex",
          alignItems: "center",
          gap: 10,
          textDecoration: "none",
        }}
      >
        {/* The design's placeholder square is our own mark, per the owner. */}
        <PotMark className="block size-8" title="MeltingPot" />
        <span
          style={{
            fontFamily: "var(--font-figtree), sans-serif",
            fontWeight: 700,
            fontSize: 23,
            color: "#2E2A26",
            letterSpacing: "-0.015em",
          }}
        >
          meltingpot
        </span>
      </Link>

      {/* Decoration. Nothing here is announced, and reduced motion stills it. */}
      <div aria-hidden className="mp-404-accents">
        {ACCENTS.map((accent, i) => (
          <span key={i} style={{ position: "absolute", display: "block", ...accent }} />
        ))}
      </div>

      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          padding: "72px 24px 64px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
          <span style={DIGIT}>4</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/pot-splash-cut.png"
            alt="MeltingPot pot spilling over"
            className="mp-404-pot"
            style={{ width: 540, height: 476, objectFit: "contain", margin: "0 2px" }}
          />
          <span style={DIGIT}>4</span>
        </div>

        <h1
          style={{
            margin: "44px 0 0",
            fontFamily: "var(--font-bricolage), sans-serif",
            fontWeight: 700,
            fontSize: 44,
            color: "#3D2B1C",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
          }}
        >
          This page melted away.
        </h1>
        <p
          style={{
            margin: "18px 0 0",
            maxWidth: 480,
            fontSize: 18,
            lineHeight: 1.6,
            color: "#6B5744",
            textWrap: "pretty",
          }}
        >
          The page you&rsquo;re trying to reach doesn&rsquo;t exist or has been
          moved. Everything worth reading is back in the Pot.
        </p>

        <Link href="/" className="mp-404-cta">
          Go to homepage
        </Link>
      </div>
    </div>
  );
}
