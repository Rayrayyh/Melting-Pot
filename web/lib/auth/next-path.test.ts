import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/auth/next-path";

describe("safeNextPath", () => {
  it("keeps ordinary in-app destinations", () => {
    expect(safeNextPath("/home")).toBe("/home");
    expect(safeNextPath("/p/abc/admin?tab=review")).toBe("/p/abc/admin?tab=review");
    expect(safeNextPath("/search?q=cells#top")).toBe("/search?q=cells#top");
  });

  it("refuses the scheme-relative form that starts with a slash", () => {
    // The bug this exists for: "//evil.test" passes a startsWith("/") check and
    // is then read as a host, so the real sign-in page hands the visitor to an
    // attacker after a genuine authentication.
    expect(safeNextPath("//evil.test")).toBeNull();
    expect(safeNextPath("//evil.test/looks/like/a/path")).toBeNull();
  });

  it("refuses backslash variants some parsers fold into slashes", () => {
    expect(safeNextPath("/\\evil.test")).toBeNull();
    expect(safeNextPath("/\\/evil.test")).toBeNull();
    expect(safeNextPath("/home\\..\\evil")).toBeNull();
  });

  it("refuses anything carrying its own scheme or host", () => {
    expect(safeNextPath("https://evil.test")).toBeNull();
    expect(safeNextPath("http://evil.test")).toBeNull();
    expect(safeNextPath("javascript:alert(1)")).toBeNull();
    expect(safeNextPath("data:text/html,<script>")).toBeNull();
    expect(safeNextPath("mailto:someone@example.com")).toBeNull();
  });

  it("refuses control characters used to smuggle a scheme past a check", () => {
    expect(safeNextPath("/\u0000//evil.test")).toBeNull();
    expect(safeNextPath("/\u0009//evil.test")).toBeNull();
    expect(safeNextPath("/home\u000a")).toBeNull();
    expect(safeNextPath("/home\u007f")).toBeNull();
  });

  it("refuses anything that is not a path at all", () => {
    expect(safeNextPath("home")).toBeNull();
    expect(safeNextPath("")).toBeNull();
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
  });
});
