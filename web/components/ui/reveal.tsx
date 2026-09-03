"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Lifts a block into place the first time it scrolls into view. Small on
 * purpose: the landing should feel alive, not animated at.
 *
 * Framer writes inline styles, which the global reduced-motion CSS cannot
 * reach, so the preference is honored here instead.
 *
 * Under reduced motion the block still has to animate to its resting state
 * rather than simply skip the animation. The server renders the hidden
 * start state into the markup, and leaving initial and whileInView unset on
 * the client left that opacity 0 in place for good: seven blocks on the
 * landing, including all three join cards, never appeared for anyone with
 * the preference set.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 18 }}
      animate={reduced ? { opacity: 1, y: 0 } : undefined}
      whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={reduced ? { duration: 0 } : { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
