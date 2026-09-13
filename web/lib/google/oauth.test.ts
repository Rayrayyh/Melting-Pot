import { describe, expect, it } from "vitest";
import {
  authorizationUrl,
  courseworkBody,
  courseworkUrl,
  needsRefresh,
  readExchange,
  tokenRequestBody,
} from "./oauth";

const SCOPES = [
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.coursework.students",
  "openid",
  "email",
];

describe("authorizationUrl", () => {
  it("asks for the two classroom scopes plus identity, offline, with state", () => {
    const url = new URL(
      authorizationUrl({ clientId: "client-1", redirectUri: "https://app.test/cb", state: "st-1" }),
    );
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe("client-1");
    expect(url.searchParams.get("redirect_uri")).toBe("https://app.test/cb");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("state")).toBe("st-1");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    expect(url.searchParams.get("scope")?.split(" ")).toEqual(SCOPES);
  });
});

describe("tokenRequestBody", () => {
  it("exchanges a code for an authorization grant", () => {
    const body = new URLSearchParams(
      tokenRequestBody({
        code: "abc",
        clientId: "client-1",
        clientSecret: "secret-1",
        redirectUri: "https://app.test/cb",
      }),
    );
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code")).toBe("abc");
    expect(body.get("client_secret")).toBe("secret-1");
    expect(body.get("redirect_uri")).toBe("https://app.test/cb");
  });

  it("refreshes with the stored refresh token and no redirect", () => {
    const body = new URLSearchParams(
      tokenRequestBody({
        refreshToken: "r-1",
        clientId: "client-1",
        clientSecret: "secret-1",
        redirectUri: "",
      }),
    );
    expect(body.get("grant_type")).toBe("refresh_token");
    expect(body.get("refresh_token")).toBe("r-1");
    expect(body.get("code")).toBeNull();
  });
});

describe("readExchange", () => {
  it("keeps the old refresh token when Google does not send a new one", () => {
    const out = readExchange(
      { access_token: "a-2", expires_in: 3600, scope: "scope-1" },
      "r-old",
    );
    expect(out).toEqual({
      accessToken: "a-2",
      refreshToken: "r-old",
      expiresAt: expect.any(Date),
      scope: "scope-1",
    });
  });

  it("refuses a reply with no refresh token anywhere", () => {
    expect(readExchange({ access_token: "a-2" }, null)).toBeNull();
    expect(readExchange("nope", "r")).toBeNull();
  });
});

describe("needsRefresh", () => {
  it("wants a refresh a minute before expiry, and for anything unreadable", () => {
    const now = 1_000_000;
    expect(needsRefresh(1_200_000, now)).toBe(false);
    expect(needsRefresh(1_000_030, now)).toBe(true);
    expect(needsRefresh(new Date(now + 30_000).toISOString(), now)).toBe(true);
    expect(needsRefresh(null, now)).toBe(true);
    expect(needsRefresh("not a date", now)).toBe(true);
  });
});

describe("courseworkBody", () => {
  it("carries the link and never a due date", () => {
    const body = courseworkBody({
      title: "Practice test",
      description: "Open the link.",
      url: "https://app.test/p/p1/study/set/s1",
    });
    expect(body.workType).toBe("ASSIGNMENT");
    expect(body.materials).toEqual([{ link: { url: "https://app.test/p/p1/study/set/s1" } }]);
    expect(JSON.stringify(body)).not.toContain("dueDate");
    expect(JSON.stringify(body)).not.toContain("due");
  });

  it("builds the coursework URL from the course id", () => {
    expect(courseworkUrl("c-1")).toBe("https://classroom.googleapis.com/v1/courses/c-1/courseWork");
  });
});
