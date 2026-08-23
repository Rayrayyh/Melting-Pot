"use client";

import { useId } from "react";

/**
 * The stir, at full size: the brand pot with a paddle of liquid going round
 * inside it and a wooden ladle riding a figure eight above the rim.
 *
 * Everything here is a pure function of `t`, seconds into an eight second
 * loop. Nothing holds state and nothing eases: the paddle steps evenly round
 * a circle in three dimensions and the projection produces the varying screen
 * speed on its own, which is what stops it reading as a spinner that happens
 * to be orange. Drive `t` from one clock and the whole scene stays in phase.
 *
 * Geometry is authored against a 240x216 viewBox with the mouth ellipse at
 * (120, 78). The rendered box is `size` wide and nine tenths of that tall.
 *
 * Colours come from the --stir-* tokens rather than a theme object, so the
 * page's own light and dark switching drives this with no prop threading.
 */

const TAU = Math.PI * 2;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Mouth centre and the ellipse the paddle travels. */
const CX = 120;
const CY = 78;
const ORX = 44;
const ORY = 9.5;

/** Seconds per revolution. Five turns fill the eight second loop exactly. */
export const STIR_ORBIT = 1.6;
/** Length of the loop. The aroma burst fires once inside it. */
export const STIR_LOOP = 8;
/** When the burst starts, and how long it runs. */
const BURST_AT = 3;
const BURST_FOR = 2;

function orbitPos(th: number): [number, number] {
  return [CX + ORX * Math.cos(th), CY + ORY * Math.sin(th)];
}

/** Nearer the viewer is bigger. Drives both the paddle radius and its glint. */
function depth(t: number) {
  return 0.82 + 0.34 * ((Math.sin(t) + 1) / 2);
}

export function StirPot({
  size = 190,
  t = 0,
  variant = "indet",
  className,
}: {
  /** Rendered width in px. Height is 0.9x that. */
  size?: number;
  /** Seconds into the loop. */
  t?: number;
  /**
   * "reduced" is the still counterpart: the surface breathes on a two second
   * period and nothing travels. It is a variant rather than a slowed version
   * because slowing an orbit is still an orbit.
   */
  variant?: "indet" | "reduced";
  className?: string;
}) {
  // useId returns colons, which are not valid inside url(#...).
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `${uid}-${s}`;
  const ref = (s: string) => `url(#${uid}-${s})`;

  const phase = (t / STIR_ORBIT) * TAU;

  return (
    <svg
      width={size}
      height={size * 0.9}
      viewBox="0 0 240 216"
      className={className}
      style={{ display: "block", overflow: "visible" }}
      aria-hidden
    >
      <defs>
        <linearGradient id={id("body")} x1="0" y1="0" x2="0.25" y2="1">
          <stop offset="0" stopColor="var(--stir-ramp-0)" />
          <stop offset="0.52" stopColor="var(--stir-ramp-1)" />
          <stop offset="1" stopColor="var(--stir-ramp-2)" />
        </linearGradient>
        <linearGradient id={id("liq")} x1="0" y1="0" x2="1" y2="0.6">
          <stop offset="0" stopColor="var(--stir-liquid-a)" />
          <stop offset="1" stopColor="var(--stir-liquid-b)" />
        </linearGradient>
        <clipPath id={id("cup")}>
          <ellipse cx={CX} cy={CY} rx="62" ry="14.5" />
        </clipPath>
        {/* Gooing the trail is what turns nine circles into one comma of liquid. */}
        <filter id={id("goo")} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.7" result="b" />
          <feColorMatrix
            in="b"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -8"
          />
        </filter>
        <filter id={id("goo2")} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3.6" result="b" />
          <feColorMatrix
            in="b"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 17 -7"
          />
        </filter>
      </defs>

      {/* Handles, body, and the m knocked into the front. */}
      <g fill="none" stroke="var(--stir-ramp-1)" strokeWidth="7">
        <ellipse cx="36" cy="79" rx="11" ry="7.5" />
        <ellipse cx="204" cy="79" rx="11" ry="7.5" />
      </g>
      <path
        fill={ref("body")}
        d="M46,80 C37,124 46,158 74,181 C92,196 107,200 120,200 C133,200 148,196 166,181 C194,158 203,124 194,80 Z"
      />
      <path
        fill="none"
        stroke="var(--stir-rim)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.96"
        transform="translate(13,0)"
        d="M91,174 L91,150 C91,136 105,136 105,150 L105,174 M105,150 C105,136 119,136 119,150 L119,174"
      />

      {/* The mouth: cream rim, dark interior, then the liquid surface. */}
      <ellipse cx={CX} cy={CY} rx="74" ry="19" fill="var(--stir-rim)" />
      <ellipse cx={CX} cy={CY} rx="66" ry="16" fill="var(--stir-mouth)" />
      <ellipse cx={CX} cy={CY} rx="62" ry="14.5" fill={ref("liq")} />

      {variant === "reduced" ? (
        <StillSurface t={t} clip={ref("cup")} />
      ) : (
        <Stirring phase={phase} clip={ref("cup")} goo={ref("goo")} />
      )}

      {variant === "indet" ? <Aroma t={t} goo={ref("goo2")} /> : null}
    </svg>
  );
}

/** The reduced counterpart. It breathes, it does not travel. */
function StillSurface({ t, clip }: { t: number; clip: string }) {
  const pulse = 0.5 + 0.5 * Math.sin(TAU * (t / 2) - Math.PI / 2);
  return (
    <g clipPath={clip}>
      <ellipse
        cx={CX}
        cy={CY}
        rx="50"
        ry="11"
        fill="var(--stir-glint)"
        opacity={0.06 + 0.3 * pulse}
      />
      <ellipse
        cx={CX}
        cy={CY}
        rx="30"
        ry="6.6"
        fill="var(--stir-glint)"
        opacity={0.05 + 0.22 * pulse}
      />
      <circle cx={CX + 30} cy={CY - 3} r="3.4" fill="var(--stir-paddle)" opacity="0.5" />
      <circle cx={CX - 26} cy={CY + 4} r="2.6" fill="var(--stir-paddle)" opacity="0.4" />
    </g>
  );
}

/**
 * The ladle and the comma of liquid it drags. The ladle is drawn first so the
 * liquid overlaps its submerged tip, which is what sells the tip being under
 * the surface rather than resting on it. The ladle's y runs at twice the
 * orbit's rate, so it traces a figure eight rather than a circle.
 */
function Stirring({ phase, clip, goo }: { phase: number; clip: string; goo: string }) {
  const trail = [];
  for (let k = 0; k < 9; k++) {
    const at = phase - k * 0.46;
    const [x, y] = orbitPos(at);
    const dp = depth(at);
    trail.push(<circle key={k} cx={x} cy={y} r={(11 - k * 1.05) * dp} fill="var(--stir-paddle)" />);
  }

  const gx = CX + 30 * Math.cos(phase);
  const gy = 16 + 7.5 * Math.sin(2 * phase);
  const bx = CX + (ORX - 4) * Math.cos(phase);
  const by = CY - 1 + (ORY - 1) * Math.sin(phase);
  const [hx, hy] = orbitPos(phase);
  const dp0 = depth(phase);

  return (
    <>
      <g strokeLinecap="round">
        <line x1={bx} y1={by} x2={gx} y2={gy} stroke="var(--stir-wood-dark)" strokeWidth="9.5" />
        <line
          x1={bx + (gx - bx) * 0.12 - 1.5}
          y1={by + (gy - by) * 0.12}
          x2={gx - 1.5}
          y2={gy + 1.5}
          stroke="var(--stir-wood-light)"
          strokeWidth="4.2"
        />
        <circle cx={gx} cy={gy - 0.5} r="4.6" fill="var(--stir-wood-dark)" />
        <circle cx={gx - 1.5} cy={gy - 2} r="1.5" fill="var(--stir-wood-light)" />
      </g>
      <g clipPath={clip}>
        <g filter={goo}>{trail}</g>
        <circle
          cx={hx - 2.6 * dp0}
          cy={hy - 2.4 * dp0}
          r={2.5 * dp0}
          fill="var(--stir-glint)"
          opacity={0.35 + 0.45 * ((Math.sin(phase) + 1) / 2)}
        />
      </g>
    </>
  );
}

/** Two constant wisps, plus one burst of steam and spice partway through. */
function Aroma({ t, goo }: { t: number; goo: string }) {
  const wisps = [];
  for (let k = 0; k < 2; k++) {
    const ph = (t / 4 + k * 0.5) % 1;
    const o = Math.sin(Math.PI * ph);
    const wy = 72 - 54 * ph;
    const wx = 102 + 34 * k + 6 * Math.sin(TAU * (t / 4) + k * 2.6);
    const s = 0.5 + 0.5 * ph;
    wisps.push(
      <g key={k} opacity={o * 0.75}>
        <g filter={goo} transform={`translate(${wx},${wy}) scale(${s})`}>
          <circle r="9.5" fill="var(--stir-wisp-a)" />
          <circle cx="7" cy="-9" r="6" fill="var(--stir-wisp-b)" />
          <circle cx="-2" cy="-15" r="4" fill="var(--stir-wisp-b)" />
        </g>
      </g>,
    );
  }

  const u = clamp01((t - BURST_AT) / BURST_FOR);
  const showBurst = u > 0 && u < 1;
  const e = 1 - Math.pow(1 - u, 3);
  const fade = Math.pow(Math.sin(Math.PI * u), 0.7);
  const spice = [
    "var(--stir-spice-0)",
    "var(--stir-spice-1)",
    "var(--stir-spice-2)",
    "var(--stir-spice-3)",
  ];

  return (
    <>
      <g>{wisps}</g>
      {showBurst ? (
        <g opacity={fade}>
          <g
            filter={goo}
            transform={`translate(${150 + 9 * e},${54 - 48 * e}) scale(${0.55 + 0.72 * e}) rotate(${12 * e})`}
          >
            <circle r="15" fill="var(--stir-wisp-a)" />
            <circle cx="14" cy="-14" r="9" fill="var(--stir-wisp-b)" />
            <circle cx="-10" cy="-18" r="7" fill="var(--stir-wisp-b)" />
            <circle cx="4" cy="-26" r="5" fill="var(--stir-wisp-a)" />
          </g>
          {spice.map((c, i) => {
            const a = -0.9 + i * 0.62;
            const r = 20 + 66 * e;
            return (
              <circle
                key={i}
                cx={120 + Math.cos(a) * r * 1.25}
                cy={64 - Math.sin(Math.abs(a) + 0.5) * r + 26 * e * e}
                r={2.7 - 0.3 * (i % 2)}
                fill={c}
                opacity={1 - e * 0.5}
              />
            );
          })}
        </g>
      ) : null}
    </>
  );
}
