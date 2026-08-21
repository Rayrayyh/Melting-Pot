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
  "M212 890v-172c0-30 22-48 52-48s52 20 52 50v170M316 720c0-30 22-50 52-50s52 20 52 50v170";

/**
 * The square mark alone. Simplified for small sizes: a bold pot, one rising
 * blob, one side drop, one dot. Nothing is drawn behind it.
 */
export function PotMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 240 240"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        {potGradient("mp-pot")}
        {/* Body: the mouth and the m are cut away. */}
        <mask id="mp-pot-body">
          <rect width="240" height="240" fill="#fff" />
          <ellipse cx="120" cy="104" rx="80" ry="12" fill="#000" />
          <path d={MARK_M} fill="none" stroke="#000" strokeWidth="22" strokeLinecap="round" />
        </mask>
        {/* Front lip: keeps the mouth, loses the m. */}
        <mask id="mp-pot-lip">
          <rect width="240" height="240" fill="#fff" />
          <path d={MARK_M} fill="none" stroke="#000" strokeWidth="22" strokeLinecap="round" />
        </mask>
      </defs>

      <g mask="url(#mp-pot-body)">
        {/* Handles behind the body. */}
        <ellipse cx="18" cy="118" rx="15" ry="16" fill="none" stroke="url(#mp-pot)" strokeWidth="12" />
        <ellipse cx="222" cy="118" rx="15" ry="16" fill="none" stroke="url(#mp-pot)" strokeWidth="12" />
        {/* Pot body. */}
        <path
          d="M26 104c0-5 10-9 22-11 22-3 46-5 72-5s50 2 72 5c12 2 22 6 22 11 0 42-12 74-36 94-16 13-38 20-58 20s-42-7-58-20c-24-20-36-52-36-94Z"
          fill="url(#mp-pot)"
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
        fill="url(#mp-pot)"
        mask="url(#mp-pot-lip)"
      />
    </svg>
  );
}

/**
 * The hero composition: the pot large at the bottom, a liquid ribbon rising
 * out of the mouth and splitting into two rounded prongs, and a heavy drop
 * pouring back down into it. Meant to bleed off the bottom edge of the hero.
 *
 * The ribbon, the drop and the dot are three separate gestures with cream
 * between them. They read as one pour only because they line up: overlap any
 * two and the whole thing turns into a single orange mass.
 */
export function PotHeroArt({ className }: { className?: string }) {
  return (
    // The pot's base sits at y 862, so the box runs past it: the whole pot has
    // to land above the fold when the landing first paints.
    // Hugging the bottom right keeps the pot in place when a short viewport
    // constrains the height and the drawing has to scale down inside its box.
    <svg
      viewBox="0 0 680 872"
      preserveAspectRatio="xMaxYMax meet"
      className={className}
      aria-hidden
    >
      <defs>
        {/* The hero carries its own pot ramp rather than the shared one: at
            this size the mark can hold a deeper, more saturated body without
            the muddiness that the same stops would give a 16px favicon. */}
        <linearGradient id="mp-hero-pot" x1="0.12" y1="0" x2="0.88" y2="1">
          <stop offset="0" stopColor="#F0982F" />
          <stop offset="0.45" stopColor="#E0761A" />
          <stop offset="1" stopColor="#BE530E" />
        </linearGradient>
        {/* Bottom to top: the ribbon cools as it rises, so it pales upward. */}
        <linearGradient id="mp-hero-ribbon" x1="0.25" y1="1" x2="0.8" y2="0">
          <stop offset="0" stopColor="#D96F16" />
          <stop offset="0.32" stopColor="#EA8E2B" />
          <stop offset="0.7" stopColor="#F5B860" />
          <stop offset="1" stopColor="#FBDDA6" />
        </linearGradient>
        <linearGradient id="mp-hero-drop" x1="0.05" y1="1" x2="0.9" y2="0">
          <stop offset="0" stopColor="#CF6210" />
          <stop offset="0.55" stopColor="#E2791B" />
          <stop offset="1" stopColor="#F5A845" />
        </linearGradient>
        <mask id="mp-hero-body">
          <rect width="680" height="872" fill="#fff" />
          <ellipse cx="340" cy="552" rx="268" ry="24" fill="#000" />
          <path d={HERO_M} fill="none" stroke="#000" strokeWidth="56" strokeLinecap="round" />
        </mask>
        <mask id="mp-hero-lip">
          <rect width="680" height="872" fill="#fff" />
          <path d={HERO_M} fill="none" stroke="#000" strokeWidth="56" strokeLinecap="round" />
        </mask>
      </defs>

      <g mask="url(#mp-hero-body)">
        {/* Handles, tilted out so they read as rings rather than blobs. */}
        <ellipse
          cx="52"
          cy="596"
          rx="32"
          ry="34"
          fill="none"
          stroke="url(#mp-hero-pot)"
          strokeWidth="21"
          transform="rotate(-20 52 596)"
        />
        <ellipse
          cx="628"
          cy="596"
          rx="32"
          ry="34"
          fill="none"
          stroke="url(#mp-hero-pot)"
          strokeWidth="21"
          transform="rotate(20 628 596)"
        />
        {/* Pot body. The m runs off the bottom and the belly clips it. */}
        <path
          d="M58 552c0-9 20-16 44-20 56-9 148-13 238-13s182 4 238 13c24 4 44 11 44 20 0 118-32 204-88 254-42 38-110 56-194 56s-152-18-194-56c-56-50-88-136-88-254Z"
          fill="url(#mp-hero-pot)"
        />
      </g>

      {/* The ribbon: out of the mouth, a slow S, then two rounded prongs. */}
      <path
        d="M268 566C224 526 210 472 222 428c12-42 46-68 50-110 4-44-30-68-24-108 6-42 40-64 50-98 8-30-8-64 18-84 26-20 64-6 66 28 2 30-26 48-26 74 0 26 22 42 40 28 8-6 12-34 16-62 7-40 62-42 66 2 4 38-20 66-30 94-14 38-36 68-46 110-10 42-4 80-8 122-4 46-16 104-10 142Z"
        fill="url(#mp-hero-ribbon)"
      />

      {/* The drop pouring back in: one head, one tail, tapering to a point. */}
      <g fill="url(#mp-hero-drop)">
        <ellipse cx="578" cy="232" rx="94" ry="104" transform="rotate(-22 578 232)" />
        <path d="M556 306c-22 46-56 100-86 140-18 24-54 54-70 38-16-16 0-42 14-60 28-38 62-88 86-144Z" />
      </g>
      <circle cx="392" cy="522" r="15" fill="#CE5D14" />

      {/* Front lip clips the ribbon into the pot. */}
      <path
        d="M60 556c58 22 146 34 280 34s222-12 280-34c-3 17-7 33-12 48-60 20-156 30-268 30s-208-10-268-30c-5-15-9-31-12-48Z"
        fill="url(#mp-hero-pot)"
        mask="url(#mp-hero-lip)"
      />
    </svg>
  );
}
