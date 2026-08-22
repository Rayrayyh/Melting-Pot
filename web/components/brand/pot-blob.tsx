/**
 * The landing hero pot, traced from the owner's supplied illustration: a squat
 * cauldron with ear handles and a pale rim band, the lowercase m knocked out
 * of the belly with its legs running into the pot's lower edge, one winding
 * ribbon of steam that pales as it rises into a notched crown, and a fat
 * teardrop flung to the right trailing a bead.
 *
 * Vector rather than the sent raster so it stays sharp at any size, weighs
 * nothing, and the knockouts are real holes that sit on any surface in both
 * themes. Drawn in the reference's own 1250 square space so the proportions
 * can be compared against it directly. The gradients are the sanctioned
 * brand-mark use.
 */
export function PotHeroBlob({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1250 1250"
      preserveAspectRatio="xMaxYMax meet"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="mp-blob-pot" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0" stopColor="#F2913B" />
          <stop offset="0.55" stopColor="#E9711A" />
          <stop offset="1" stopColor="#DE5C0E" />
        </linearGradient>
        {/* One ribbon of steam, deep at the mouth and palest at the crown. */}
        <linearGradient id="mp-blob-steam" x1="0.42" y1="1" x2="0.5" y2="0">
          <stop offset="0" stopColor="#ED7B12" />
          <stop offset="0.45" stopColor="#F09A38" />
          <stop offset="0.75" stopColor="#F6BE6A" />
          <stop offset="1" stopColor="#FBE0A8" />
        </linearGradient>
        <linearGradient id="mp-blob-crown" x1="0.2" y1="1" x2="0.7" y2="0">
          <stop offset="0" stopColor="#F6BE6A" />
          <stop offset="1" stopColor="#FBE4B0" />
        </linearGradient>
        <linearGradient id="mp-blob-drop" x1="0.15" y1="0.85" x2="0.85" y2="0.15">
          <stop offset="0" stopColor="#EC7511" />
          <stop offset="1" stopColor="#F49A36" />
        </linearGradient>
        {/* Holes, not paint: the rim band and the m show whatever the pot
            sits on, exactly like the small mark. */}
        <mask id="mp-blob-body">
          <rect width="1250" height="1250" fill="#fff" />
          <path
            d="M272 800C362 846 470 862 595 862C720 862 828 846 918 800"
            fill="none"
            stroke="#000"
            strokeWidth="17"
          />
          <path
            d="M405 1215V990c0-86 190-86 190 0v225M595 990c0-86 190-86 190 0v225"
            fill="none"
            stroke="#000"
            strokeWidth="64"
            strokeLinecap="round"
          />
        </mask>
      </defs>

      {/* Steam first: the pot's front rim paints over its base. The ribbon
          waists above the mouth, bulges left, necks up into the pale crown
          with its torn V notch and short right arm, and carries a concave
          bay on its right edge where the drop's tail points in. */}
      <path
        d="M345 810
           C330 720 342 650 378 592
           C346 542 332 478 354 418
           C376 360 430 330 478 338
           C504 292 534 260 576 246
           C618 233 662 240 684 268
           C702 291 708 324 706 360
           C715 428 720 468 712 515
           C695 558 638 572 614 618
           C597 662 624 704 654 744
           C678 776 702 795 722 810 Z"
        fill="url(#mp-blob-steam)"
      />

      {/* The crown: palest, torn open at the V, its right finger rounded. */}
      <path
        d="M400 232
           C374 150 434 82 520 84
           C572 86 620 106 648 140
           C655 160 657 182 654 202
           C668 168 688 132 714 112
           C740 92 774 86 803 98
           C838 114 852 150 842 182
           C833 210 806 226 776 226
           C746 228 725 212 707 222
           C668 246 618 270 568 280
           C503 290 430 278 400 232 Z"
        fill="url(#mp-blob-crown)"
      />

      {/* The flung drop: a fat teardrop head trailing a tapered tail back
          toward the steam's bay, and the bead it shed beneath the tip. */}
      <g fill="url(#mp-blob-drop)">
        <path d="M973 250C1077 246 1153 318 1155 420C1157 516 1093 588 997 594C945 596 901 580 869 550C826 589 771 633 726 656C698 670 680 650 693 628C716 594 769 560 812 520C837 497 854 468 864 437C870 380 903 288 973 250Z" />
        <circle cx="672" cy="706" r="25" />
      </g>

      {/* Handles: small ears at the rim's shoulders. */}
      <ellipse
        cx="222"
        cy="858"
        rx="42"
        ry="50"
        fill="none"
        stroke="url(#mp-blob-pot)"
        strokeWidth="30"
        transform="rotate(-20 222 858)"
      />
      <ellipse
        cx="968"
        cy="858"
        rx="42"
        ry="50"
        fill="none"
        stroke="url(#mp-blob-pot)"
        strokeWidth="30"
        transform="rotate(20 968 858)"
      />

      {/* The bowl. Its top edge is the front rim; the sliver above the masked
          band reads as the back rim behind the steam, and the m's legs run
          into the pot's lower edge just as they do in the reference. */}
      <path
        d="M262 782
           C355 824 465 840 595 840
           C725 840 835 824 928 782
           C946 915 910 1075 810 1155
           C748 1206 675 1228 595 1228
           C515 1228 442 1206 380 1155
           C280 1075 244 915 262 782 Z"
        fill="url(#mp-blob-pot)"
        mask="url(#mp-blob-body)"
      />
    </svg>
  );
}
