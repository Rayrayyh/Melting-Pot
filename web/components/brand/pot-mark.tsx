// The MeltingPot brand mark: an orange pot with the lowercase m knocked out
// of its body and liquid blobs rising from the mouth. Hand-drawn SVG so the
// mark stays crisp from favicon size to the landing hero.
//
// The mouth and the m are real holes punched with masks rather than shapes
// painted in the background color, so the mark carries no tile of its own and
// sits on any surface: cream, dark, or the browser's tab strip.

const potGradient = (id: string) => (
  <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stopColor="#F2A44C" />
    <stop offset="0.55" stopColor="#E5821F" />
    <stop offset="1" stopColor="#CE5E14" />
  </linearGradient>
);

/** The path of the lowercase m, stroked to become the knockout. */
const MARK_M = "M82 204v-46c0-15 9-23 19-23s17 8 17 21v48M118 156c0-13 7-21 17-21s19 8 19 23v46";
const HERO_M =
  "M208 890v-176c0-32 24-52 56-52s56 22 56 54v174M320 716c0-32 24-54 56-54s56 22 56 54v174";

/**
 * The square mark alone. Simplified for small sizes: a bold pot, one rising
 * blob, one side drop, one dot. Nothing is drawn behind it.
 */
export function PotMark({
  className,
  title,
  idPrefix = "mp-pot",
}: {
  className?: string;
  title?: string;
  /**
   * Namespace for this instance's gradient and mask ids.
   *
   * SVG resolves url(#id) against the whole document and takes the first
   * match, so two marks on one page had the second silently borrowing the
   * first's defs. Identical marks made that invisible, but it is invalid
   * markup and it breaks the moment the two differ or the first unmounts.
   * Pass a distinct prefix wherever a second mark shares a page.
   */
  idPrefix?: string;
}) {
  const gradientId = `${idPrefix}-fill`;
  const bodyMaskId = `${idPrefix}-body`;
  const lipMaskId = `${idPrefix}-lip`;
  return (
    <svg
      viewBox="0 0 240 240"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        {potGradient(gradientId)}
        {/* Body: the mouth and the m are cut away. */}
        <mask id={bodyMaskId}>
          <rect width="240" height="240" fill="#fff" />
          <ellipse cx="120" cy="104" rx="80" ry="12" fill="#000" />
          <path d={MARK_M} fill="none" stroke="#000" strokeWidth="22" strokeLinecap="round" />
        </mask>
        {/* Front lip: keeps the mouth, loses the m. */}
        <mask id={lipMaskId}>
          <rect width="240" height="240" fill="#fff" />
          <path d={MARK_M} fill="none" stroke="#000" strokeWidth="22" strokeLinecap="round" />
        </mask>
      </defs>

      <g mask={`url(#${bodyMaskId})`}>
        {/* Handles behind the body. */}
        <ellipse cx="18" cy="118" rx="15" ry="16" fill="none" stroke={`url(#${gradientId})`} strokeWidth="12" />
        <ellipse cx="222" cy="118" rx="15" ry="16" fill="none" stroke={`url(#${gradientId})`} strokeWidth="12" />
        {/* Pot body. */}
        <path
          d="M26 104c0-5 10-9 22-11 22-3 46-5 72-5s50 2 72 5c12 2 22 6 22 11 0 42-12 74-36 94-16 13-38 20-58 20s-42-7-58-20c-24-20-36-52-36-94Z"
          fill={`url(#${gradientId})`}
        />
      </g>

      {/* Blobs rising out of the mouth, in front of the back rim. */}
      <path
        d="M96 100c-14-8-20-24-14-40 5-14 20-18 22-32 2-12-6-20-2-31 4-10 14-15 25-13 14 3 18 15 14 26-4 10-12 15-10 26 2 12 14 16 17 29 4 17-6 33-18 39-12 5-26 4-34-4Z"
        fill="#F0973B"
      />
      <path d="M172 62 L154 92" stroke="#DB7A25" strokeWidth="20" strokeLinecap="round" />
      <circle cx="177" cy="55" r="18" fill="#DB7A25" />
      <circle cx="148" cy="103" r="7" fill="#D2601F" />
      <path
        d="M52 46c8-8 21-8 27 0 6 9 2 21-8 25-10 4-21 0-24-9-2-7-1-11 5-16Z"
        fill="#F7C577"
      />

      {/* Front lip clips the blobs into the pot. */}
      <path
        d="M28 108c24 9 56 14 92 14s68-5 92-14c-1 8-3 15-5 22-25 8-54 12-87 12s-62-4-87-12c-2-7-4-14-5-22Z"
        fill={`url(#${gradientId})`}
        mask={`url(#${lipMaskId})`}
      />
    </svg>
  );
}

/**
 * The hero composition: the pot at the bottom, a liquid ribbon rising out of
 * the mouth into two fat lobes, and a heavy drop pouring back down into it.
 * Meant to bleed off the bottom edge of the hero.
 *
 * The drop crosses in front of the ribbon rather than dodging it, and what
 * keeps the two readable is a gap rather than an outline: the ribbon is masked
 * by a fattened copy of the drop, so the separation is a hole and reads the
 * same on cream, on dark, and on anything else. A cream keyline would have
 * been simpler and would have been wrong the moment the page went dark.
 */
export function PotHeroArt({ className }: { className?: string }) {
  // Drawn once and used twice: as the drop itself, and fattened by a stroke to
  // cut the ribbon behind it. They have to stay identical or the gap wanders.
  const drop = (
    <>
      <ellipse cx="508" cy="306" rx="104" ry="94" transform="rotate(-12 508 306)" />
      <path d="M470 386C442 420 400 448 372 462C356 470 342 462 346 448C350 434 372 424 392 406C418 384 442 360 454 336Z" />
      <circle cx="344" cy="506" r="18" />
    </>
  );

  return (
    // The pot's base sits at y 862, so the box runs past it: the whole pot has
    // to land above the fold when the landing first paints.
    <svg
      viewBox="0 0 680 872"
      preserveAspectRatio="xMaxYMax meet"
      className={className}
      aria-hidden
    >
      <defs>
        {/* The hero carries its own pot ramp rather than the shared one: at
            this size the body holds deeper stops that would go muddy on a
            16px favicon. */}
        <linearGradient id="mp-hero-pot" x1="0.12" y1="0" x2="0.88" y2="1">
          <stop offset="0" stopColor="#F0982F" />
          <stop offset="0.45" stopColor="#E0761A" />
          <stop offset="1" stopColor="#BE530E" />
        </linearGradient>
        {/* Bottom to top: the ribbon cools as it rises, so it pales upward. */}
        <linearGradient id="mp-hero-ribbon" x1="0.3" y1="1" x2="0.75" y2="0">
          <stop offset="0" stopColor="#DE7A1B" />
          <stop offset="0.35" stopColor="#EE9B33" />
          <stop offset="0.72" stopColor="#F7C476" />
          <stop offset="1" stopColor="#FBE0AE" />
        </linearGradient>
        <linearGradient id="mp-hero-drop" x1="0.1" y1="1" x2="0.9" y2="0">
          <stop offset="0" stopColor="#D66A12" />
          <stop offset="0.6" stopColor="#E8811F" />
          <stop offset="1" stopColor="#F4A63F" />
        </linearGradient>
        <mask id="mp-hero-body">
          <rect width="680" height="872" fill="#fff" />
          <ellipse cx="340" cy="552" rx="268" ry="24" fill="#000" />
          <path d={HERO_M} fill="none" stroke="#000" strokeWidth="62" strokeLinecap="round" />
        </mask>
        <mask id="mp-hero-lip">
          <rect width="680" height="872" fill="#fff" />
          <path d={HERO_M} fill="none" stroke="#000" strokeWidth="62" strokeLinecap="round" />
        </mask>
        {/* The gap the drop leaves in the ribbon it crosses. */}
        <mask id="mp-hero-cut">
          <rect width="680" height="872" fill="#fff" />
          <g fill="#000" stroke="#000" strokeWidth="17" strokeLinejoin="round">
            {drop}
          </g>
        </mask>
      </defs>

      <g mask="url(#mp-hero-body)">
        {/* Handles, tilted out so they read as rings rather than blobs. */}
        <ellipse
          cx="58"
          cy="590"
          rx="26"
          ry="28"
          fill="none"
          stroke="url(#mp-hero-pot)"
          strokeWidth="18"
          transform="rotate(-22 58 590)"
        />
        <ellipse
          cx="622"
          cy="590"
          rx="26"
          ry="28"
          fill="none"
          stroke="url(#mp-hero-pot)"
          strokeWidth="18"
          transform="rotate(22 622 590)"
        />
        {/* Pot body. The m runs off the bottom and the belly clips it. */}
        <path
          d="M62 552c0-9 20-16 44-20 56-9 146-13 234-13s178 4 234 13c24 4 44 11 44 20 0 120-32 206-88 256-42 38-108 56-190 56s-148-18-190-56c-56-50-88-136-88-256Z"
          fill="url(#mp-hero-pot)"
        />
      </g>

      {/* The ribbon, cut where the drop passes over it. */}
      <path
        d="M224 552C186 500 172 420 190 350c16-62 56-100 50-160-6-60 10-120 56-148 40-24 78 2 70 50-5 30-22 38-22 60 0 24 22 36 42 20 14-11 10-52 24-82 18-40 60-32 58 14-2 42-28 74-40 110-16 48-28 86-28 136 0 70 8 150 12 202Z"
        fill="url(#mp-hero-ribbon)"
        mask="url(#mp-hero-cut)"
      />

      {/* The drop pouring back in, over the ribbon. */}
      <g fill="url(#mp-hero-drop)">{drop}</g>

      {/* Front lip clips the ribbon into the pot. */}
      <path
        d="M64 556c58 22 144 34 276 34s218-12 276-34c-3 17-7 33-12 48-58 20-152 30-264 30s-206-10-264-30c-5-15-9-31-12-48Z"
        fill="url(#mp-hero-pot)"
        mask="url(#mp-hero-lip)"
      />
    </svg>
  );
}
