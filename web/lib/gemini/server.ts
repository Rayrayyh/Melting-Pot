import "server-only";

export const GEMINI_FLASH_MODEL = process.env.GEMINI_FLASH_MODEL || "gemini-3.7-flash";
export const GEMINI_REASONING_MODEL = process.env.GEMINI_REASONING_MODEL || "gemini-3.1-pro-preview";

export class GeminiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "GeminiError";
  }
}

type GeminiPart =
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
  parts: GeminiPart[];
  schema: unknown;
}): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiError("Gemini is not configured", 503);

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
        ? String((payload.error as Record<string, unknown>).message || "Gemini request failed")
        : "Gemini request failed";
      throw new GeminiError(detail, response.status);
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
    throw new GeminiError("Gemini returned no structured output", 502);
  } catch (error) {
    if (error instanceof GeminiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new GeminiError("Gemini timed out", 504);
    }
    throw new GeminiError("Gemini response could not be read", 502);
  } finally {
    clearTimeout(timeout);
  }
}
