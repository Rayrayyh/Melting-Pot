import { expect, test, type Page } from "@playwright/test";

async function loginAs(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("MeltingPot-dev1");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/home/, { timeout: 15_000 });
}

async function openBiologyPot(page: Page) {
  await page.getByRole("link", { name: "Biology 101" }).first().click();
  await expect(page).toHaveURL(/\/p\//, { timeout: 15_000 });
}

test.describe("Pot feed", () => {
  test("shows vitals, cards, and section filtering", async ({ page }) => {
    await loginAs(page, "ava@meltingpot.dev");
    await openBiologyPot(page);

    // Vitals row.
    await expect(page.getByText("Contributors")).toBeVisible();
    await expect(page.getByText("Shared notes", { exact: true })).toBeVisible();
    await expect(page.getByText("BIO101")).toBeVisible();

    await expect(page.getByRole("link", { name: /Raw Notes/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Summary/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Flashcards/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Practice/ })).toBeVisible();

    // All six seeded notes, newest first.
    const cards = page.getByRole("link", { name: "Open", exact: true });
    expect(await cards.count()).toBeGreaterThanOrEqual(6);
    await expect(page.getByText("Mitosis vs meiosis")).toBeVisible();
    await expect(page.getByText("What exam 1 covers")).toBeVisible();

    // The corrected note carries a version pill.
    await expect(page.getByText("v2", { exact: true }).first()).toBeVisible();

    // Section filter narrows the feed.
    await page.getByRole("link", { name: "Week 2: Cell structure" }).first().click();
    await expect(page).toHaveURL(/\/s\//);
    await expect(page.getByText("Osmosis and tonicity")).toBeVisible();
    await expect(page.getByText("Organelles and what they do")).toBeVisible();
    await expect(page.getByText("Mitosis vs meiosis")).toHaveCount(0);
  });

  test("note detail shows organized content with the original a tab away", async ({
    page,
  }) => {
    await loginAs(page, "ava@meltingpot.dev");
    await openBiologyPot(page);

    await page.getByText("Osmosis and tonicity").click();
    await expect(
      page.getByRole("heading", { name: "Osmosis and tonicity" }),
    ).toBeVisible();

    // Organized view: definition block, example block, takeaways, attribution.
    await expect(page.getByText("The movement of water across a selectively")).toBeVisible();
    await expect(page.getByText("Key takeaways")).toBeVisible();
    await expect(page.getByText("Water follows solute.")).toBeVisible();
    await expect(page.getByText("Omar Haddad")).toBeVisible();

    // The verbatim original, one tab away.
    await page.getByRole("tab", { name: "Original" }).click();
    await expect(page.getByText("thats why salt on a slug is bad")).toBeVisible();
    await expect(
      page.getByText("exactly as it was written", { exact: false }),
    ).toBeVisible();

    // Back to organized.
    await page.getByRole("tab", { name: "Organized" }).click();
    await expect(page.getByText("Key takeaways")).toBeVisible();
  });

  test("corrected note credits both contributors", async ({ page }) => {
    await loginAs(page, "omar@meltingpot.dev");
    await openBiologyPot(page);
    await page.getByText("Mitosis vs meiosis").click();
    await expect(page.getByText("Version 2")).toBeVisible();
    await expect(page.getByText("corrected by Omar Haddad")).toBeVisible();
    await expect(
      page.getByText("growth, repair, and replacing worn-out cells", { exact: false }),
    ).toBeVisible();
  });
});
