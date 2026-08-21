import "server-only";

/**
 * Which model answers which task. Both are deployment config rather than
 * source: a model identifier belongs to the provider, changes on their
 * schedule, and should never need a code change to follow. Unset reads the
 * same as an unset key, so the app falls back rather than calling a guess.
 */
export const FAST_MODEL = process.env.FAST_MODEL ?? "";
export const REASONING_MODEL = process.env.REASONING_MODEL ?? "";

/** True when this server can mix at all: a key and something to send it to. */
export function mixingConfigured(): boolean {
  return Boolean(process.env.MODEL_API_KEY && FAST_MODEL && REASONING_MODEL);
}

export class MixError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "MixError";
  }
}

type MixPart =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mime_type: string };

/** One try, plus three more. */
export const MAX_ATTEMPTS = 4;

/**
 * The whole call, retries included.
 *
 * This has to be under the route's maxDuration, not near it and not over it.
 * At 60 seconds against a 26 second function the platform always won the race,
 * which meant the timeout here could never fire: the invocation was severed
 * mid-flight, the browser was handed a gateway error, and the function went on
 * to finish and save. The class saw a failure sitting next to a test that
 * plainly existed.
 *
 * Under the ceiling, this code gives up first. That matters because giving up
 * here happens before the set is stored, so a run that runs out of time leaves
 * nothing behind and says so honestly.
 */
const TOTAL_BUDGET_MS = 22_000;

/**
 * Worth another go, or worth giving up on.
 *
 * A busy pot is the case this exists for. Capacity refusals come back fast,
 * usually in a few hundred milliseconds, because nothing is queued behind
 * them: the mixer says it is full and returns. That is what makes retrying
 * affordable inside a fixed budget, and why the waits below are short.
 *
 * A refusal about the request itself is never retried. Bad credentials, a
 * malformed body or a missing model do not become correct by being asked
 * again; they would only spend the budget and arrive at the same answer.
 */
export function isWorthRetrying(status: number | undefined): boolean {
  if (status === undefined) return true; // the connection failed, not the request
  if (status === 429) return true; // too many at once
  return status >= 500 && status < 600; // full, restarting, or behind a bad gateway
}

/**
 * How long to wait before trying again, growing each time so a pot that is
 * genuinely full is not hammered, with jitter so a classroom that all pressed
 * the button together does not come back in lockstep.
 */
export function waitBeforeRetry(attempt: number, random = Math.random): number {
  const base = [400, 900, 2000][attempt - 1] ?? 2000;
  return Math.round(base * (0.75 + random() * 0.5));
}

/** What the mixer asked us to wait, when it says so. Seconds or an HTTP date. */
export function honourRetryAfter(header: string | null, now = Date.now()): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1000);
  const when = Date.parse(header);
  if (Number.isNaN(when)) return null;
  return Math.max(0, when - now);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function generateStructured<T>({
  model,
  instruction,
  parts,
  schema,
  deadlineAt,
}: {
  model: string;
  instruction: string;
  parts: MixPart[];
  schema: unknown;
  /**
   * When this call must be finished by, as an absolute time.
   *
   * A request that makes more than one call has to share one budget between
   * them, or the first spends everything and the platform kills the function
   * before the second runs. Organizing a note with images is exactly that
   * shape: reading the pictures, then writing the note.
   */
  deadlineAt?: number;
}): Promise<T> {
  const apiKey = process.env.MODEL_API_KEY;
  if (!apiKey || !model) throw new MixError("Mixing is not configured", 503);

  const deadline = deadlineAt ?? Date.now() + TOTAL_BUDGET_MS;
  let lastError: MixError = new MixError("The mixer could not be reached", 502);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), remaining);
    try {
      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
          "Api-Revision": "2026-05-20",
        },
        body: JSON.stringify({
          model,
          store: false,
          system_instruction: instruction,
          input: parts,
          response_format: { type: "text", mime_type: "application/json", schema },
        }),
        signal: controller.signal,
      });
      const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;

      if (!response.ok) {
        const detail =
          payload && typeof payload.error === "object" && payload.error
            ? String(
                (payload.error as Record<string, unknown>).message ||
                  "The mixer could not be reached",
              )
            : "The mixer could not be reached";
        lastError = new MixError(detail, response.status);
        if (attempt < MAX_ATTEMPTS && isWorthRetrying(response.status)) {
          const asked = honourRetryAfter(response.headers.get("retry-after"));
          const wait = Math.max(asked ?? 0, waitBeforeRetry(attempt));
          // Only wait if there is still budget to use the time for.
          if (Date.now() + wait < deadline) {
            clearTimeout(timeout);
            await sleep(wait);
            continue;
          }
        }
        throw lastError;
      }

      const steps = Array.isArray(payload?.steps) ? payload.steps : [];
      for (let index = steps.length - 1; index >= 0; index -= 1) {
        const step = steps[index] as Record<string, unknown>;
        if (step.type !== "model_output" || !Array.isArray(step.content)) continue;
        for (const part of step.content as Array<Record<string, unknown>>) {
          if (part.type === "text" && typeof part.text === "string") {
            return JSON.parse(part.text) as T;
          }
        }
      }
      // A reply that arrived but says nothing usable is not a capacity
      // problem, and asking again would spend a whole generation to find that
      // out. The caller falls back to the deterministic organizer instead.
      throw new MixError("The mixer returned nothing usable", 502);
    } catch (error) {
      if (error instanceof MixError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new MixError("Mixing timed out", 504);
      }
      // The connection itself failed. Worth another go while there is budget.
      lastError = new MixError("The mixer's reply could not be read", 502);
      if (attempt < MAX_ATTEMPTS) {
        const wait = waitBeforeRetry(attempt);
        if (Date.now() + wait < deadline) {
          clearTimeout(timeout);
          await sleep(wait);
          continue;
        }
      }
      throw lastError;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError;
}
