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

export async function generateStructured<T>({
  model,
  instruction,
  parts,
  schema,
}: {
  model: string;
  instruction: string;
  parts: MixPart[];
  schema: unknown;
}): Promise<T> {
  const apiKey = process.env.MODEL_API_KEY;
  if (!apiKey || !model) throw new MixError("Mixing is not configured", 503);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
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
    const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
    if (!response.ok) {
      const detail = payload && typeof payload.error === "object" && payload.error
        ? String((payload.error as Record<string, unknown>).message || "The mixer could not be reached")
        : "The mixer could not be reached";
      throw new MixError(detail, response.status);
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
    throw new MixError("The mixer returned nothing usable", 502);
  } catch (error) {
    if (error instanceof MixError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new MixError("Mixing timed out", 504);
    }
    throw new MixError("The mixer's reply could not be read", 502);
  } finally {
    clearTimeout(timeout);
  }
}
