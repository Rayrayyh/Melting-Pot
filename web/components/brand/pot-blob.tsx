/**
 * The landing hero pot, redrawn from the owner's supplied illustration: a
 * round-bellied cauldron with ear handles, a pale rim gap, the lowercase m
 * knocked out of the belly, and a soft column of steam rising off the mouth
 * with one pale cloud broken free above it and a flung drop to the right.
 *
 * Vector rather than the sent raster for the same reason as the 404 pot: it
 * stays sharp at any size, weighs nothing, and the knockouts are real holes,
 * so it sits on any surface in both themes. The gradients are the sanctioned
 * brand-mark use.
 */
export function PotHeroBlob({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 680 872"
      preserveAspectRatio="xMaxYMax meet"
      className={className}
      aria-hidden
    >
      <defs>
        {/* The pot deepens toward its base. */}
        <linearGradient id="mp-blob-pot" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0" stopColor="#F5983C" />
          <stop offset="0.5" stopColor="#EA741A" />
          <stop offset="1" stopColor="#D9560A" />
        </linearGradient>
        {/* The steam cools as it rises, so it pales upward. */}
        <linearGradient id="mp-blob-steam" x1="0.35" y1="1" x2="0.6" y2="0">
          <stop offset="0" stopColor="#EE7D14" />
          <stop offset="0.55" stopColor="#F29D3B" />
          <stop offset="1" stopColor="#F7C46E" />
        </linearGradient>
        {/* The cloud that broke free is the palest thing in the scene. */}
        <linearGradient id="mp-blob-cloud" x1="0.2" y1="1" x2="0.8" y2="0">
          <stop offset="0" stopColor="#F5B95F" />
          <stop offset="1" stopColor="#FBE3AC" />
        </linearGradient>
        <linearGradient id="mp-blob-drop" x1="0.1" y1="1" x2="0.9" y2="0">
          <stop offset="0" stopColor="#E97B12" />
          <stop offset="1" stopColor="#F5A93F" />
        </linearGradient>
        {/* Holes, not paint: the rim gap and the m show whatever the pot
            sits on, exactly like the small mark. */}
        <mask id="mp-blob-body">
          <rect width="680" height="872" fill="#fff" />
          <path
            d="M106 562C174 590 254 598 340 598C426 598 506 590 574 562"
            fill="none"
            stroke="#000"
            strokeWidth="11"
          />
          <path
            d="M252 820V730c0-52 88-52 88 0v90M340 730c0-52 88-52 88 0v90"
            fill="none"
            stroke="#000"
            strokeWidth="48"
            strokeLinecap="round"
          />
        </mask>
      </defs>

      {/* Steam first: the pot's front rim paints over its base. */}
      <path
        d="M172 600C158 528 190 484 214 444C170 422 140 362 158 310C176 260 234 248 262 282C272 240 302 210 344 210C388 210 418 240 424 284C446 300 456 330 448 358C438 388 414 400 400 416C386 432 390 462 398 496C406 532 420 570 426 600Z"
        fill="url(#mp-blob-steam)"
      />

      {/* The cloud that broke free, notched where it tore away. */}
      <path
        d="M318 172C290 172 268 152 268 122C268 90 294 70 324 74C330 44 356 24 388 28C422 32 442 60 438 90C462 92 478 110 476 134C474 160 452 174 428 170C416 168 410 160 400 160C390 160 384 168 374 172C356 178 336 178 318 172Z"
        fill="url(#mp-blob-cloud)"
      />

      {/* The flung drop: a round head trailing back toward the pot, and the
          bead it shed behind it. */}
      <g fill="url(#mp-blob-drop)">
        <ellipse cx="540" cy="292" rx="92" ry="84" transform="rotate(-14 540 292)" />
        <path d="M518 348C496 390 470 424 452 442C438 456 424 450 428 434C432 418 448 406 462 386C478 364 492 340 500 318Z" />
        <circle cx="438" cy="478" r="13" />
      </g>

      {/* Handles, tilted out so they read as rings rather than blobs. */}
      <ellipse
        cx="80"
        cy="586"
        rx="24"
        ry="26"
        fill="none"
        stroke="url(#mp-blob-pot)"
        strokeWidth="17"
        transform="rotate(-22 80 586)"
      />
      <ellipse
        cx="600"
        cy="586"
        rx="24"
        ry="26"
        fill="none"
        stroke="url(#mp-blob-pot)"
        strokeWidth="17"
        transform="rotate(22 600 586)"
      />

      {/* The bowl. Its top edge is the front rim; the sliver above the masked
          gap reads as the back rim behind the steam. */}
      <path
        d="M100 552C170 580 252 588 340 588C428 588 510 580 580 552C584 646 558 756 498 812C454 852 402 866 340 866C278 866 226 852 182 812C122 756 96 646 100 552Z"
        fill="url(#mp-blob-pot)"
        mask="url(#mp-blob-body)"
      />
    </svg>
  );
}
