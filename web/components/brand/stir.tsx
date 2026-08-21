import { cn } from "@/lib/cn";

/** The m, stroked to become the knockout, at the spinner's scale. */
const STIR_M =
  "M33 86v-26c0-5 4-8 8.5-8s8.5 3 8.5 8v26M50 60c0-5 4-8 8.5-8s8.5 3 8.5 8v26";

/**
 * The stir: the loading mark. It is the hero pot, seen from the same low
 * angle, with a paddle of liquid going round inside it.
 *
 * The paddle travels a circle in three dimensions, so the ellipse it appears
 * to follow is a projection. Two things follow, and both are what stop it
 * reading as a spinner that happens to be orange:
 *
 * - It goes behind the pot across the front. Nothing animates the depth
 *   ordering: the front lip is painted after the paddle and the body before
 *   it, so the paddle is simply sandwiched.
 * - It moves fastest across the front and slowest across the back, and it is
 *   smaller at the back. The keyframes step the angle evenly and let the
 *   projection produce that, so no easing is applied on top.
 *
 * The rim is flatter than a spinner would normally want, because that is the
 * angle the hero is drawn at and matching it matters more than the extra few
 * pixels of travel a rounder ellipse would give.
 *
 * The trail is five more paddles on the same animation with negative delays
 * rather than a drawn tail, because a drawn tail would have to rotate to stay
 * tangent to an ellipse: a second animated channel for a worse result.
 */
export function Stir({
  size = 20,
  label,
  className,
  tone = "primary",
}: {
  /** Rendered width in px. */
  size?: number;
  /** Announce it. Without one the mark is decorative and the copy beside it carries the meaning. */
  label?: string;
  className?: string;
  /** "on-primary" for a filled button, where the liquid has to read on orange. */
  tone?: "primary" | "on-primary";
}) {
  // A whole pot at 16px is mud. Under 34 the vessel goes and the paddle is
  // drawn fat, so what survives is the one thing that still reads at that
  // size: something going round on an ellipse rather than a circle. The m
  // needs more room again before its counters stop filling in.
  const bare = size < 34;
  const withM = size >= 64;
  const liquid = tone === "on-primary" ? "var(--on-primary)" : "var(--clay)";
  const vessel = tone === "on-primary" ? "var(--on-primary)" : "var(--primary)";
  const uid = `${tone}-${withM ? "m" : "plain"}`;

  const head = bare ? 11 : 5.5;
  const trail = [1, 0.86, 0.72, 0.59, 0.47, 0.36].map((step, i) => ({
    r: head * step,
    o: [1, 0.66, 0.46, 0.32, 0.21, 0.13][i],
    delay: -0.05 * i,
  }));

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cn("mp-stir", className)}
      role={label ? "img" : undefined}
      aria-hidden={label ? undefined : true}
    >
      {label ? <title>{label}</title> : null}
      <defs>
        <mask id={`mp-stir-body-${uid}`}>
          <rect width="100" height="100" fill="#fff" />
          <ellipse cx="50" cy="32" rx="35" ry="5.5" fill="#000" />
          {withM ? (
            <path d={STIR_M} fill="none" stroke="#000" strokeWidth="9" strokeLinecap="round" />
          ) : null}
        </mask>
        <mask id={`mp-stir-lip-${uid}`}>
          <rect width="100" height="100" fill="#fff" />
          {withM ? (
            <path d={STIR_M} fill="none" stroke="#000" strokeWidth="9" strokeLinecap="round" />
          ) : null}
        </mask>
      </defs>

      {bare ? null : (
        <g mask={`url(#mp-stir-body-${uid})`}>
          <ellipse
            cx="6.5"
            cy="40"
            rx="4"
            ry="4.5"
            fill="none"
            stroke={vessel}
            strokeWidth="2.6"
            transform="rotate(-22 6.5 40)"
          />
          <ellipse
            cx="93.5"
            cy="40"
            rx="4"
            ry="4.5"
            fill="none"
            stroke={vessel}
            strokeWidth="2.6"
            transform="rotate(22 93.5 40)"
          />
          <path
            d="M10 32c0-2 3-4 7-4.5 9-1.5 22-2 33-2s24 0.5 33 2c4 0.5 7 2.5 7 4.5 0 29-5 47-16 55-6 4.5-15 7-24 7s-18-2.5-24-7c-11-8-16-26-16-55Z"
            fill={vessel}
          />
        </g>
      )}

      {/* Moving. Removed outright when the reader has asked for less motion. */}
      <g className="mp-stir-motion">
        {trail.map((dot, i) => (
          <g key={i} className="mp-stir-orbit" style={{ animationDelay: `${dot.delay}s` }}>
            <circle r={dot.r} fill={liquid} opacity={dot.o} />
          </g>
        ))}
      </g>

      {/* Still. Its counterpart: the surface sits in the pot and nothing goes round. */}
      <g className="mp-stir-still">
        <ellipse cx="50" cy="32" rx={bare ? 32 : 30} ry={bare ? 6 : 4.5} fill={liquid} opacity="0.6" />
      </g>

      {/* The front lip, painted last, so the paddle passes behind it. */}
      {bare ? null : (
        <path
          d="M10.5 33c8.5 3.5 22 5.5 39.5 5.5s31-2 39.5-5.5c-0.4 2.6-0.9 5-1.5 7.2-8.6 3-22.4 4.6-38 4.6s-29.4-1.6-38-4.6c-0.6-2.2-1.1-4.6-1.5-7.2Z"
          fill={vessel}
          mask={`url(#mp-stir-lip-${uid})`}
        />
      )}
    </svg>
  );
}
