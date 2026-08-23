import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// server.ts imports "server-only", which throws outside a server component.
vi.mock("server-only", () => ({}));

const ORIGINAL_ENV = { ...process.env };

async function loadMix() {
  return import("@/lib/mix/server");
}

describe("isWorthRetrying", () => {
  it("retries a pot that is full or restarting", async () => {
    const { isWorthRetrying } = await loadMix();
    expect(isWorthRetrying(429)).toBe(true);
    expect(isWorthRetrying(500)).toBe(true);
    expect(isWorthRetrying(502)).toBe(true);
    expect(isWorthRetrying(503)).toBe(true);
    expect(isWorthRetrying(504)).toBe(true);
  });

  it("retries when the connection failed rather than the request", async () => {
    const { isWorthRetrying } = await loadMix();
    expect(isWorthRetrying(undefined)).toBe(true);
  });

  it("gives up on anything about the request itself", async () => {
    const { isWorthRetrying } = await loadMix();
    // These do not become correct by being asked again.
    expect(isWorthRetrying(400)).toBe(false);
    expect(isWorthRetrying(401)).toBe(false);
    expect(isWorthRetrying(403)).toBe(false);
    expect(isWorthRetrying(404)).toBe(false);
  });
});

describe("waitBeforeRetry", () => {
  it("grows with each attempt", async () => {
    const { waitBeforeRetry } = await loadMix();
    const mid = () => 0.5;
    expect(waitBeforeRetry(1, mid)).toBeLessThan(waitBeforeRetry(2, mid));
    expect(waitBeforeRetry(2, mid)).toBeLessThan(waitBeforeRetry(3, mid));
  });

  it("jitters either side of the base so a class does not return in lockstep", async () => {
    const { waitBeforeRetry } = await loadMix();
    expect(waitBeforeRetry(1, () => 0)).toBe(300); // 400 * 0.75
    expect(waitBeforeRetry(1, () => 1)).toBe(500); // 400 * 1.25
  });

  it("holds the last wait for any attempt past the table", async () => {
    const { waitBeforeRetry } = await loadMix();
    expect(waitBeforeRetry(9, () => 0.5)).toBe(waitBeforeRetry(3, () => 0.5));
  });
});

describe("honourRetryAfter", () => {
  it("reads a count of seconds", async () => {
    const { honourRetryAfter } = await loadMix();
    expect(honourRetryAfter("2")).toBe(2000);
    expect(honourRetryAfter("0")).toBe(0);
  });

  it("reads an HTTP date as a distance from now", async () => {
    const { honourRetryAfter } = await loadMix();
    const now = Date.parse("2026-01-01T00:00:00Z");
    expect(honourRetryAfter("Thu, 01 Jan 2026 00:00:03 GMT", now)).toBe(3000);
  });

  it("never asks for a wait in the past", async () => {
    const { honourRetryAfter } = await loadMix();
    const now = Date.parse("2026-01-01T00:00:10Z");
    expect(honourRetryAfter("Thu, 01 Jan 2026 00:00:00 GMT", now)).toBe(0);
  });

  it("ignores a header it cannot read", async () => {
    const { honourRetryAfter } = await loadMix();
    expect(honourRetryAfter(null)).toBeNull();
    expect(honourRetryAfter("soon")).toBeNull();
  });
});

describe("generateStructured retrying", () => {
  const usable = {
    steps: [{ type: "model_output", content: [{ type: "text", text: '{"ok":true}' }] }],
  };

  function reply(status: number, body: unknown, headers: Record<string, string> = {}) {
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
      json: async () => body,
    } as unknown as Response;
  }

  beforeEach(() => {
    process.env.MODEL_API_KEY = "test-key";
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    process.env = { ...ORIGINAL_ENV };
    vi.resetModules();
  });

  /**
   * Runs the call while letting every backoff timer fire immediately.
   *
   * The catch is attached before the timers drain, not after. Without it the
   * promise rejects during runAllTimersAsync with nothing listening yet, and
   * the run is littered with unhandled rejections even though every assertion
   * passes.
   */
  async function run<T>(promise: Promise<T>): Promise<T> {
    promise.catch(() => {});
    await vi.runAllTimersAsync();
    return promise;
  }

  it("comes back from a full pot without the caller knowing", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(reply(503, { error: { message: "overloaded" } }))
      .mockResolvedValueOnce(reply(503, { error: { message: "overloaded" } }))
      .mockResolvedValueOnce(reply(200, usable));
    vi.stubGlobal("fetch", fetchMock);

    const { generateStructured } = await loadMix();
    const result = await run(
      generateStructured({ model: "m", instruction: "i", parts: [], schema: {} }),
    );
    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("tries four times and no more", async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(503, { error: { message: "overloaded" } }));
    vi.stubGlobal("fetch", fetchMock);

    const { generateStructured, MAX_ATTEMPTS } = await loadMix();
    await expect(
      run(generateStructured({ model: "m", instruction: "i", parts: [], schema: {} })),
    ).rejects.toThrow(/overloaded/);
    expect(fetchMock).toHaveBeenCalledTimes(MAX_ATTEMPTS);
    expect(MAX_ATTEMPTS).toBe(4);
  });

  it("does not retry a refusal about the request itself", async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(403, { error: { message: "key rejected" } }));
    vi.stubGlobal("fetch", fetchMock);

    const { generateStructured } = await loadMix();
    await expect(
      run(generateStructured({ model: "m", instruction: "i", parts: [], schema: {} })),
    ).rejects.toThrow(/key rejected/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries a connection that failed outright", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("network down"))
      .mockResolvedValueOnce(reply(200, usable));
    vi.stubGlobal("fetch", fetchMock);

    const { generateStructured } = await loadMix();
    await expect(
      run(generateStructured({ model: "m", instruction: "i", parts: [], schema: {} })),
    ).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("refuses without calling out when the shared deadline has already gone", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { generateStructured } = await loadMix();
    await expect(
      run(
        generateStructured({
          model: "m",
          instruction: "i",
          parts: [],
          schema: {},
          deadlineAt: Date.now() - 1,
        }),
      ),
    ).rejects.toThrow();
    // The point of the shared budget: a later call in the same request does
    // not get to start once the earlier ones have spent the time.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("stops retrying once the shared deadline leaves no room for the wait", async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(503, { error: { message: "overloaded" } }));
    vi.stubGlobal("fetch", fetchMock);

    const { generateStructured } = await loadMix();
    await expect(
      run(
        generateStructured({
          model: "m",
          instruction: "i",
          parts: [],
          schema: {},
          // Enough for one attempt, not enough to wait and go again.
          deadlineAt: Date.now() + 50,
        }),
      ),
    ).rejects.toThrow(/overloaded/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not spend a second generation on a reply that arrived but said nothing", async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(200, { steps: [] }));
    vi.stubGlobal("fetch", fetchMock);

    const { generateStructured } = await loadMix();
    await expect(
      run(generateStructured({ model: "m", instruction: "i", parts: [], schema: {} })),
    ).rejects.toThrow(/nothing usable/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
