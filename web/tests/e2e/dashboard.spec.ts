import { expect, test, type Page } from "@playwright/test";

async function loginAs(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("MeltingPot-dev1");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/home/, { timeout: 15_000 });
}

test.describe("role-based dashboard", () => {
  test("a member sees their study desk, never the review module", async ({ page }) => {
    await loginAs(page, "ava@meltingpot.dev");

    // Never the maintainer module.
    await expect(page.getByText("Waiting on your review")).toHaveCount(0);

    // Her unfinished draft is one tap away.
    await expect(page.getByText("Pick up where you left off")).toBeVisible();
    await expect(page.getByText(/photosynthesis rough notes/)).toBeVisible();
    await expect(page.getByText("Resume draft")).toBeVisible();

    // Pot card with stats.
    await expect(page.getByRole("main").getByRole("link", { name: "Biology 101", exact: true })).toBeVisible();
    await expect(page.getByText(/\d+ notes/).first()).toBeVisible();

    // Cross-Pot activity rail.
    await expect(page.getByText("New in your Pots")).toBeVisible();
    await expect(page.getByText("What exam 1 covers").first()).toBeVisible();
  });

  test("Continue deep-links to the last note the member opened", async ({ page }) => {
    await loginAs(page, "ava@meltingpot.dev");
    await page.getByRole("main").getByRole("link", { name: "Biology 101", exact: true }).click();
    await expect(page).toHaveURL(/\/p\//);
    await page.getByText("The cell cycle and its checkpoints").first().click();
    await expect(page).toHaveURL(/\/n\//);

    await page.goto("/home");
    const continueLink = page.getByRole("link", {
      name: /Continue: The cell cycle and its checkpoints/,
    });
    await expect(continueLink).toBeVisible();
    await continueLink.click();
    await expect(page).toHaveURL(/\/n\//);
    await expect(
      page.getByRole("heading", { name: "The cell cycle and its checkpoints" }),
    ).toBeVisible();
  });

  test("a maintainer leads with corrections waiting across their Pots", async ({
    page,
  }) => {
    await loginAs(page, "maya@meltingpot.dev");

    await expect(page.getByText(/1 correction is waiting on you/)).toBeVisible();
    await expect(page.getByText("Waiting on your review")).toBeVisible();
    const queueItem = page.getByRole("link", {
      name: /Osmosis and tonicity.*Priya Patel/s,
    });
    await expect(queueItem).toBeVisible();

    await queueItem.click();
    await expect(page).toHaveURL(/\/review\//);
    await expect(page.getByText("Current version", { exact: true })).toBeVisible();
    await expect(page.getByText("Suggested version", { exact: true })).toBeVisible();
    await expect(page.getByText(/net movement/).first()).toBeVisible();
  });

  test("the review queue is not reachable for plain members", async ({ page }) => {
    await loginAs(page, "ava@meltingpot.dev");
    await page.getByRole("main").getByRole("link", { name: "Biology 101", exact: true }).click();
    await expect(page).toHaveURL(/\/p\//);
    const potId = page.url().split("/p/")[1].split("/")[0];

    // The nav offers no Review entry to members.
    await expect(page.getByRole("link", { name: "Review", exact: true })).toHaveCount(0);

    // And direct navigation is a 404, not a hidden page.
    const response = await page.goto(`/p/${potId}/review`);
    expect(response?.status()).toBe(404);
  });
});
