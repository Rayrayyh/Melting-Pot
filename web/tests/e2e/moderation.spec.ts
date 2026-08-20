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

test.describe("Maintainer moderation", () => {
  test("takes a note out of the Pot with a reason, then puts it back", async ({ page }) => {
    // Maya owns Biology 101; a plain member has none of this.
    await loginAs(page, "maya@meltingpot.dev");
    await openBiologyPot(page);
    await page.getByText("The cell cycle and its checkpoints").click();
    await expect(
      page.getByRole("heading", { name: "The cell cycle and its checkpoints" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Remove from the Pot" }).click();
    await page.getByLabel("Why").fill("Duplicate of an earlier note.");
    await page.getByRole("button", { name: "Remove", exact: true }).click();

    // The note says what happened, to everyone who opens it.
    await expect(page.getByText("Removed from the Pot")).toBeVisible();
    await expect(page.getByText("Duplicate of an earlier note.").first()).toBeVisible();
    // Nothing to correct while it is out.
    await expect(page.getByRole("link", { name: "Suggest correction" })).toHaveCount(0);

    // It is gone from the feed.
    await page.getByRole("link", { name: "Biology 101" }).first().click();
    await expect(page.getByText("The cell cycle and its checkpoints")).toHaveCount(0);

    // And gone from search.
    await page.goto("/search?q=checkpoints");
    await expect(page.getByText("The cell cycle and its checkpoints")).toHaveCount(0);

    // Settings lists it, and puts it back.
    await openBiologyPot(page);
    await page.getByRole("link", { name: "Settings", exact: true }).click();
    await expect(page.getByText("Removed notes")).toBeVisible();
    await expect(page.getByText("Duplicate of an earlier note.")).toBeVisible();
    await page.getByRole("button", { name: "Put it back" }).first().click();
    await expect(page.getByText("Duplicate of an earlier note.")).toHaveCount(0);

    // Inside the Pot the way back to the feed is the nav, not the Pot list.
    await page.getByRole("link", { name: "Feed", exact: true }).click();
    await expect(page.getByText("The cell cycle and its checkpoints")).toBeVisible();
  });

  test("a member has no removal control", async ({ page }) => {
    await loginAs(page, "priya@meltingpot.dev");
    await openBiologyPot(page);
    await page.getByText("Osmosis and tonicity").click();
    await expect(page.getByRole("heading", { name: "Osmosis and tonicity" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Remove from the Pot" })).toHaveCount(0);
  });
});

test.describe("Notes as study material", () => {
  test("highlights the terms the note defines", async ({ page }) => {
    await loginAs(page, "ava@meltingpot.dev");
    await openBiologyPot(page);
    await page.getByText("Osmosis and tonicity").click();
    await expect(page.getByRole("heading", { name: "Osmosis and tonicity" })).toBeVisible();
    // The definition block names Osmosis, so the body marks it where it recurs.
    await expect(page.locator("mark").first()).toBeVisible();
  });

  test("turns a selected passage into a card that belongs to its writer", async ({ page }) => {
    await loginAs(page, "ava@meltingpot.dev");
    await openBiologyPot(page);
    await page.getByText("Osmosis and tonicity").click();
    const passage = page.getByText("Salt on a slug pulls water out", { exact: false });
    await expect(passage).toBeVisible();

    // Select the passage the way a reader would, by dragging across it.
    await passage.evaluate((node) => {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(node);
      selection?.removeAllRanges();
      selection?.addRange(range);
      document.dispatchEvent(new Event("selectionchange"));
      document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    });

    await page.getByRole("button", { name: "Make a flashcard" }).click();
    await page.getByLabel("Question").fill("Why is salt bad for a slug?");
    await page.getByLabel("Tags").fill("osmosis, transport");
    await page.getByRole("button", { name: "Save card" }).click();
    await expect(page.getByText("Card saved.")).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click();

    await expect(page.getByText("Cards from this note")).toBeVisible();
    await expect(page.getByText("Why is salt bad for a slug?")).toBeVisible();
    await expect(page.getByText("Written by you")).toBeVisible();

    // It is findable, and it can be taken away again by the person who wrote it.
    await page.goto("/search?q=slug");
    await expect(page.getByText("Why is salt bad for a slug?")).toBeVisible();

    await page.goBack();
    await page.getByRole("button", { name: 'Delete the card "Why is salt bad for a slug?"' }).click();
    await expect(page.getByText("Why is salt bad for a slug?")).toHaveCount(0);
  });
});

test.describe("Search", () => {
  test("finds notes across a Pot and narrows by kind", async ({ page }) => {
    await loginAs(page, "ava@meltingpot.dev");
    await page.goto("/search");
    // The page's own search box, not the one in the top bar.
    const form = page.getByRole("search");
    await form.getByLabel("Search").fill("osmosis");
    await form.getByRole("button", { name: "Search" }).click();

    await expect(page).toHaveURL(/q=osmosis/);
    await expect(page.getByText("Osmosis and tonicity").first()).toBeVisible();
    await expect(page.getByText("What exam 1 covers").first()).toBeVisible();

    // Narrowing to flashcards drops the notes, and says so.
    await page.getByRole("link", { name: /^Flashcards/ }).click();
    await expect(page).toHaveURL(/type=flashcard/);
    await expect(page.getByText("Osmosis and tonicity")).toHaveCount(0);
    await expect(page.getByText("No matches yet")).toBeVisible();

    await page.getByRole("link", { name: "Clear filters" }).click();
    await expect(page.getByText("Osmosis and tonicity").first()).toBeVisible();
  });

  test("finds a note by who shared it", async ({ page }) => {
    await loginAs(page, "ava@meltingpot.dev");
    await page.goto("/search?q=Priya");
    await expect(
      page.getByText("The scientific method, laws, and theories").first(),
    ).toBeVisible();
  });
});
