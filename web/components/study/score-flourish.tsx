"use client";

import { useEffect, useState } from "react";
import { animate, motion, useReducedMotion } from "framer-motion";

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Where the celebratory marks land, fixed so the burst is the same every time. */
const SPARKS = [
  { x: -78, y: -34, delay: 0, tone: "text-primary" },
  { x: 74, y: -40, delay: 0.04, tone: "text-clay" },
  { x: -58, y: 44, delay: 0.08, tone: "text-clay" },
  { x: 62, y: 46, delay: 0.12, tone: "text-primary" },
  { x: 0, y: -74, delay: 0.06, tone: "text-primary" },
  { x: -88, y: 8, delay: 0.14, tone: "text-clay" },
  { x: 86, y: 12, delay: 0.1, tone: "text-primary" },
];

/**
 * The moment a test is handed in: the ring fills, the number climbs to the
 * score, and a few marks pop once. It celebrates finishing rather than the
 * number, so it plays the same whatever the result, and it does not play at
 * all for anyone who has asked for less motion.
 */
export function ScoreFlourish({
  percentage,
  correct,
  total,
}: {
  percentage: number;
  correct: number;
  total: number;
}) {
  const reduced = useReducedMotion();
  // Null until the climb starts; the final number is what shows in the
  // meantime, so the score is correct even if the animation never runs.
  const [climbing, setClimbing] = useState<number | null>(null);
  const shown = climbing ?? percentage;

  useEffect(() => {
    if (reduced) return;
    const controls = animate(0, percentage, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (value) => setClimbing(Math.round(value)),
      onComplete: () => setClimbing(null),
    });
    return () => controls.stop();
  }, [percentage, reduced]);

  const offset = CIRCUMFERENCE * (1 - Math.min(100, Math.max(0, percentage)) / 100);

  return (
    <div className="relative mx-auto w-fit">
      {!reduced
        ? SPARKS.map((spark, index) => (
            <motion.span
              key={index}
              aria-hidden
              className={`pointer-events-none absolute left-1/2 top-1/2 block size-1.5 rounded-full bg-current ${spark.tone}`}
              initial={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
              animate={{
                opacity: [0, 1, 0],
                x: spark.x,
                y: spark.y,
                scale: [0.4, 1, 0.6],
              }}
              transition={{ duration: 0.9, delay: 0.15 + spark.delay, ease: "easeOut" }}
            />
          ))
        : null}

      <svg viewBox="0 0 128 128" className="size-32" role="img" aria-label={`${percentage}% correct`}>
        <circle
          cx="64"
          cy="64"
          r={RADIUS}
          fill="none"
          strokeWidth="8"
          className="stroke-sunken"
        />
        <motion.circle
          cx="64"
          cy="64"
          r={RADIUS}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          className="stroke-primary"
          transform="rotate(-90 64 64)"
          strokeDasharray={CIRCUMFERENCE}
          initial={{ strokeDashoffset: reduced ? offset : CIRCUMFERENCE }}
          animate={{ strokeDashoffset: offset }}
          transition={reduced ? { duration: 0 } : { duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="font-display text-3xl leading-none text-ink tabular-nums">{shown}%</p>
        <p className="mt-1 text-[12px] text-ink-muted tabular-nums">
          {correct} of {total}
        </p>
      </div>
    </div>
  );
}
