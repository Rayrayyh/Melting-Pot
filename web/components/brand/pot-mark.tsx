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
const HERO_M = "M234 812v-118c0-34 22-54 47-54s43 20 43 50v126M324 690c0-30 18-50 43-50s47 20 47 54v118";

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
 * The hero composition: the pot large at the bottom with a tall steam
 * column pouring out of the mouth, a heavy drop falling back in from the
 * right, and a pale blob drifting off the top. Meant to bleed off the
 * bottom edge of the hero section.
 */
export function PotHeroArt({ className }: { className?: string }) {
  return (
    // The pot's base sits at y 861, so the box runs past it: the whole pot has
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
        {potGradient("mp-hero-pot")}
        <linearGradient id="mp-hero-steam" x1="0.2" y1="0" x2="0.5" y2="1">
          <stop offset="0" stopColor="#F6BE6E" />
          <stop offset="1" stopColor="#EC8C22" />
        </linearGradient>
        <mask id="mp-hero-body">
          <rect width="680" height="872" fill="#fff" />
          <ellipse cx="340" cy="575" rx="210" ry="26" fill="#000" />
          <path d={HERO_M} fill="none" stroke="#000" strokeWidth="50" strokeLinecap="round" />
        </mask>
        <mask id="mp-hero-lip">
          <rect width="680" height="872" fill="#fff" />
          <path d={HERO_M} fill="none" stroke="#000" strokeWidth="50" strokeLinecap="round" />
        </mask>
      </defs>

      {/* Pale blob drifting off the top, behind the steam. */}
      <path
        d="M446 66c14-28 50-40 76-25 27 15 33 51 12 72-20 20-55 19-72-2-13-16-18-31-16-45Z"
        fill="#F8CE8C"
      />

      <g mask="url(#mp-hero-body)">
        {/* Handles. */}
        <ellipse cx="106" cy="591" rx="27" ry="29" fill="none" stroke="url(#mp-hero-pot)" strokeWidth="20" />
        <ellipse cx="574" cy="591" rx="27" ry="29" fill="none" stroke="url(#mp-hero-pot)" strokeWidth="20" />
        {/* Pot body. */}
        <path
          d="M112 575c0-9 18-16 40-19 42-6 116-9 188-9s146 3 188 9c22 3 40 10 40 19 0 104-26 182-70 230-34 37-92 56-158 56s-124-19-158-56c-44-48-70-126-70-230Z"
          fill="url(#mp-hero-pot)"
        />
      </g>

      {/* Steam column pouring from inside the mouth. */}
      <path
        d="M285 585c-50-45-45-105-10-140 30-30 55-50 45-90-8-33-58-45-62-97-4-48 34-68 50-100 14-28 10-62 40-76 30-14 68-2 76 30 6 28-14 46-26 74-12 28 2 52 18 82 18 34 12 72-8 102-18 28-14 60-2 94 10 28 22 78 17 121-30 8-70 12-138 0Z"
        fill="url(#mp-hero-steam)"
      />

      {/* Heavy drop falling back in from the right. */}
      <circle cx="565" cy="280" r="92" fill="#E8801F" />
      <path d="M518 352 L455 442" stroke="#E8801F" strokeWidth="46" strokeLinecap="round" />
      <circle cx="432" cy="505" r="13" fill="#DB7A25" />

      {/* Front lip clips the steam into the pot. */}
      <path
        d="M116 583c58 22 134 34 224 34s166-12 224-34c-3 18-7 34-12 50-60 19-130 29-212 29s-152-10-212-29c-5-16-9-32-12-50Z"
        fill="url(#mp-hero-pot)"
        mask="url(#mp-hero-lip)"
      />
    </svg>
  );
}
