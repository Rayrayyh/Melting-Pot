import { z } from "zod";

/**
 * The shapes every server entry point checks before it does anything.
 *
 * The database is still the authority: every write goes through a definer
 * function that re-checks membership, role and shape, and row level security
 * stands behind that. What these add is a boundary that refuses malformed
 * input before it reaches Postgres, so a bad call fails with a sentence
 * rather than a database error, and so the shape a route accepts is written
 * down in one place rather than implied by what it happens to pass along.
 */

/** Six characters, letters and digits, as printed on a Pot. */
export const classCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{6}$/, "A class code is six letters or digits.");

export const uuidSchema = z.string().uuid("That is not a valid id.");

export const noteViewSchema = z.object({
  potId: uuidSchema,
  noteId: uuidSchema,
});

/** Parse, or return null. Callers decide what a refusal looks like. */
export function parseOrNull<T>(schema: z.ZodType<T>, value: unknown): T | null {
  const result = schema.safeParse(value);
  return result.success ? result.data : null;
}
