/**
 * The OAuth shapes, kept pure so they can be tested without a network.
 *
 * The scope list is the narrowest that can push: read the course list, write
 * coursework. Classroom's scopes are restricted, which is what keeps this
 * feature honest about verification: only test users on our own project can
 * grant them until Google has reviewed the app.
 */

export const CLASSROOM_SCOPES = [
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.coursework.students",
] as const;

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const COURSEWORK_ENDPOINT = "https://classroom.googleapis.com/v1/courses";

export function authorizationUrl(options: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  // openid and email ride along so the callback can name the account the
  // maintainer connected, which the settings card then shows.
  const scopes = [...CLASSROOM_SCOPES, "openid", "email"].join(" ");
  const params = new URLSearchParams({
    client_id: options.clientId,
    redirect_uri: options.redirectUri,
    response_type: "code",
    scope: scopes,
    // A refresh token arrives only on the first consent, so ask for one
    // every time; the stored row is replaced on each connect.
    access_type: "offline",
    prompt: "consent",
    state: options.state,
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

export type TokenExchange = {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
};

export function isAccessTokenResponse(value: unknown): value is {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return typeof row.access_token === "string" && row.access_token.length > 0;
}

export function readExchange(value: unknown, fallbackRefreshToken: string | null): TokenExchange | null {
  if (!isAccessTokenResponse(value)) return null;
  const row = value;
  const refreshToken = typeof row.refresh_token === "string" ? row.refresh_token : fallbackRefreshToken;
  if (!refreshToken) return null;
  const expiresIn = typeof row.expires_in === "number" ? row.expires_in : 3600;
  return {
    accessToken: row.access_token,
    refreshToken,
    expiresAt: new Date(Date.now() + expiresIn * 1000),
    scope: typeof row.scope === "string" ? row.scope : "",
  };
}

export function tokenRequestBody(options: {
  code?: string;
  refreshToken?: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): string {
  const params = new URLSearchParams({
    client_id: options.clientId,
    client_secret: options.clientSecret,
    redirect_uri: options.redirectUri,
  });
  if (options.code) {
    params.set("code", options.code);
    params.set("grant_type", "authorization_code");
  } else {
    params.set("refresh_token", options.refreshToken ?? "");
    params.set("grant_type", "refresh_token");
  }
  return params.toString();
}

export const TOKEN_ENDPOINT_URL = TOKEN_ENDPOINT;

/** True when a token stored with this expiry needs a refresh before use. */
export function needsRefresh(expiresAtIso: string | number | null, now = Date.now()): boolean {
  if (expiresAtIso === null) return true;
  const expiresAt = typeof expiresAtIso === "number" ? expiresAtIso : Date.parse(expiresAtIso);
  if (Number.isNaN(expiresAt)) return true;
  // A minute of slack: a push that starts healthy must not expire mid-flight.
  return now >= expiresAt - 60_000;
}

/** The coursework a push creates: an assignment carrying one link, no due date. */
export function courseworkBody(options: { title: string; description: string; url: string }): {
  title: string;
  description: string;
  workType: "ASSIGNMENT";
  materials: Array<{ link: { url: string } }>;
} {
  return {
    title: options.title.slice(0, 3000),
    description: options.description.slice(0, 3000),
    workType: "ASSIGNMENT",
    materials: [{ link: { url: options.url } }],
  };
}

export function courseworkUrl(courseId: string): string {
  return `${COURSEWORK_ENDPOINT}/${encodeURIComponent(courseId)}/courseWork`;
}
