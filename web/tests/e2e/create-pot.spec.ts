import { expect, test } from "@playwright/test";

test("creating a Pot generates a code and opens the empty Pot", async ({ page }) => {
  // Fresh account with no memberships.
  const email = `e2e.creator.${Date.now()}@meltingpot.dev`;
  await page.goto("/signup");
  await page.getByLabel("Display name").fill("E2E Creator");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("E2ePassword1");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/home/, { timeout: 15_000 });
  await expect(page.getByText("Join your first Pot")).toBeVisible();

  await page.getByRole("link", { name: "Create a Pot" }).first().click();
  await expect(page).toHaveURL(/\/pots\/new/);
  await page.getByLabel("Pot name").fill("History 7");
  await page
    .getByLabel("What is this Pot for? (optional)")
    .fill("Everything for seventh grade history.");
  await page.getByRole("button", { name: "Create Pot" }).click();

  await expect(page.getByText("Your Pot is ready")).toBeVisible();
  const codeBlock = page.locator("div.font-mono");
  await expect(codeBlock).toHaveText(/^[A-Z0-9]{6}$/);

  await page.getByRole("button", { name: "Copy code" }).click();
  await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();

  await page.getByRole("link", { name: "Open your Pot" }).click();
  await expect(page).toHaveURL(/\/p\//);
  await expect(page.getByRole("heading", { name: "History 7" })).toBeVisible();

  // A brand-new Pot greets its owner with the empty state.
  await expect(page.getByText("Nothing in the pot yet")).toBeVisible();
  await expect(
    page.getByText("Be the first. Write it however it comes to you."),
  ).toBeVisible();
});
