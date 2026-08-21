/**
 * Where a sign-in is allowed to land.
 *
 * `next` arrives from the query string, so it is attacker-chosen. Checking
 * only that it starts with "/" is not enough: "//evil.test" starts with a
 * slash and is a scheme-relative URL, so the browser reads it as a host and
 * leaves the site. That turns the real sign-in page into the convincing first
 * half of a phishing chain, which is the whole trick.
 *
 * So the rule is a path, not a prefix: one leading slash, never two, no
 * backslashes (some parsers fold them into slashes), no scheme, no control
 * characters, and nothing that survives parsing as an absolute URL.
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith("/")) return null;
  // "//host" and "/\host" are both read as scheme-relative by some parsers.
  if (next.startsWith("//") || next.startsWith("/\\")) return null;
  if (next.includes("\\")) return null;
  // Control characters can be used to smuggle a scheme past a naive check.
  if (/[\u0000-\u001f\u007f]/.test(next)) return null;

  // Parse against a throwaway origin. Anything carrying its own scheme or host
  // resolves somewhere other than that origin and is refused.
  let url: URL;
  try {
    url = new URL(next, "https://meltingpot.invalid");
  } catch {
    return null;
  }
  if (url.origin !== "https://meltingpot.invalid") return null;

  return `${url.pathname}${url.search}${url.hash}`;
}
