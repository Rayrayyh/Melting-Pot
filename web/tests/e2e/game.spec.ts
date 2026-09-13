import { expect, test, type Page } from "@playwright/test";

// A live room is driven end to end with two browser contexts over the poll
// transport (?transport=poll): the dev container's HTTP-only Supabase rewrite
// cannot carry websockets, so the poll fallback is the whole transport here,
// which is exactly why it exists.
//
// The practice set the room runs is stored straight through the save RPC with
// its keys, so no generation is spent to play.

const QUESTIONS = [
  {
    prompt: "How many cells does mitosis produce?",
    choices: ["One", "Two", "Three", "Four"],
    sourceNoteTitle: "Mitosis vs meiosis",
  },
];

async function loginAs(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("MeltingPot-dev1");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/home/, { timeout: 15_000 });
}

async function potId(page: Page): Promise<string> {
  await page.getByRole("link", { name: "Biology 101" }).first().click();
  await expect(page).toHaveURL(/\/p\//, { timeout: 15_000 });
  return new URL(page.url()).pathname.split("/")[2];
}

/** Signs in over the direct origin and returns a bearer token, as global setup does. */
async function bearer(email: string): Promise<{ token: string; anonKey: string; origin: string }> {
  const env = await import("node:fs").then((fs) =>
    fs.readFileSync(`${__dirname}/../../.env.local`, "utf8"),
  );
  const read = (name: string) =>
    process.env[name] ?? env.match(new RegExp(`^${name}=(.*)$`, "m"))?.[1];
  const origin = read("SUPABASE_REWRITE_ORIGIN") ?? read("NEXT_PUBLIC_SUPABASE_URL") ?? "";
  const anonKey = read("NEXT_PUBLIC_SUPABASE_ANON_KEY") ?? "";
  const response = await fetch(`${origin}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "MeltingPot-dev1" }),
  });
  const { access_token } = (await response.json()) as { access_token: string };
  return { token: access_token, anonKey, origin };
}

async function storePlayableSet(potId: string): Promise<void> {
  const { token, anonKey, origin } = await bearer("maya@meltingpot.dev");
  const response = await fetch(`${origin}/rest/v1/rpc/save_study_set`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      p_pot_id: potId,
      p_kind: "practice",
      p_fingerprint: `game-e2e-${Date.now()}`,
      p_payload: { title: "Game night test", questions: QUESTIONS },
      p_model: "test",
      p_options: null,
      p_keys: [{ answerIndex: 1, explanation: "One division, two cells." }],
    }),
  });
  if (!response.ok) throw new Error(`save_study_set failed: ${response.status}`);
}

test.describe("The class game", () => {
  test("runs a room from lobby to podium over the poll transport", async ({ browser }) => {
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    await loginAs(hostPage, "maya@meltingpot.dev");
    const id = await potId(hostPage);
    await storePlayableSet(id);

    await hostPage.goto(`/p/${id}/game?transport=poll`);
    await hostPage.getByRole("button", { name: "Run it live" }).first().click();

    // The lobby carries the room code on the host's screen.
    const code = (await hostPage.locator("p.font-mono").textContent())?.trim() ?? "";
    expect(code).toHaveLength(6);

    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();
    await loginAs(playerPage, "omar@meltingpot.dev");
    await playerPage.goto(`/p/${id}/game?room=${code}&transport=poll`);
    await playerPage.getByRole("button", { name: "Join", exact: true }).click();

    await expect(
      hostPage.getByText(/Start with 2 players/),
      "the player reaches the lobby",
    ).toBeVisible({ timeout: 15_000 });
    await hostPage.getByRole("button", { name: /Start with 2 players/ }).click();

    await expect(playerPage.getByText(QUESTIONS[0].prompt)).toBeVisible({ timeout: 15_000 });
    await playerPage.getByText("Two", { exact: true }).click();
    await expect(playerPage.getByText("Locked in", { exact: false })).toBeVisible();

    await hostPage.getByRole("button", { name: "Reveal now" }).click();
    await expect(playerPage.getByText("You had it.")).toBeVisible({ timeout: 15_000 });
    await expect(hostPage.getByText("Game night test").or(hostPage.getByText("Question 1 of 1"))).toBeVisible();

    await hostPage.getByRole("button", { name: "Finish the game" }).click();
    await expect(hostPage.getByText("Podium")).toBeVisible({ timeout: 15_000 });
    await expect(playerPage.getByText("Podium")).toBeVisible({ timeout: 15_000 });
    await expect(playerPage.getByText("Your result is on your record.")).toBeVisible();

    await hostContext.close();
    await playerContext.close();
  });
});
