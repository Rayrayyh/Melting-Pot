import { expect, test, type Page } from "@playwright/test";

async function loginAs(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("MeltingPot-dev1");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/home/, { timeout: 15_000 });
}

test.describe("search and settings", () => {
  test("search finds notes by content, sections by name, with excerpts", async ({
    page,
  }) => {
    await loginAs(page, "ava@meltingpot.dev");

    await page.goto("/search?q=slug");
    await expect(page.getByText("Osmosis and tonicity")).toBeVisible();
    await expect(page.getByText(/Salt on a slug/).first()).toBeVisible();

    await page.goto("/search?q=falsifiable");
    await expect(
      page.getByText("The scientific method, laws, and theories"),
    ).toBeVisible();

    await page.goto("/search?q=Exam review");
    await expect(page.getByText(/^Section · /).first()).toBeVisible();

    await page.goto("/search?q=zzzznothing");
    await expect(page.getByText("No matches yet")).toBeVisible();
  });

  test("members see the code but no owner controls, and can leave", async ({ page }) => {
    await loginAs(page, "ava@meltingpot.dev");
    await page.getByRole("main").getByRole("link", { name: "Biology 101", exact: true }).click();
    await page.getByRole("link", { name: "Settings", exact: true }).click();

    await expect(page.locator("span.font-mono").first()).toHaveText(/^[A-Z0-9]{6}$/);
    await expect(page.getByRole("button", { name: "Copy code" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save changes" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Regenerate code" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Delete Pot" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Leave this Pot" })).toBeVisible();

    // Integrations exist as quiet, disabled hooks only.
    await expect(
      page.getByRole("button", { name: "Connect Google Classroom" }),
    ).toBeDisabled();

    // Members manage nobody.
    await page.getByRole("link", { name: "Members", exact: true }).click();
    await expect(page).toHaveURL(/\/members/, { timeout: 15_000 });
    await expect(page.getByText("Maya Chen").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Make maintainer" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Remove", exact: true })).toHaveCount(0);
  });

  test("the owner renames, promotes, and regenerates the code which kills the old one", async ({
    page,
  }) => {
    await loginAs(page, "maya@meltingpot.dev");
    await page.getByRole("main").getByRole("link", { name: "Biology 101", exact: true }).click();

    // Reset any maintainers from earlier runs, then promote Priya.
    await page.getByRole("link", { name: "Members", exact: true }).click();
    await expect(page).toHaveURL(/\/members/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Members" })).toBeVisible();
    while ((await page.getByRole("button", { name: "Make member" }).count()) > 0) {
      await page.getByRole("button", { name: "Make member" }).first().click();
      await page.waitForTimeout(600);
    }
    await expect(page.getByText("Priya Patel").first()).toBeVisible();
    const promoteButtons = page.getByRole("button", { name: "Make maintainer" });
    await promoteButtons.first().waitFor();
    const before = await promoteButtons.count();
    await promoteButtons.last().click();
    await expect(promoteButtons).toHaveCount(before - 1, { timeout: 10_000 });
    await expect(page.getByText("Maintainer", { exact: true }).first()).toBeVisible();

    // Rename the Pot.
    await page.getByRole("link", { name: "Settings", exact: true }).click();
    await page.getByLabel("Pot name").fill("Biology 101H");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();

    // Regenerate the class code; the old code stops resolving.
    const oldCode = await page.locator("span.font-mono").first().innerText();
    await page.getByRole("button", { name: "Regenerate code" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Regenerate code" })
      .click();
    await expect(page.locator("span.font-mono").first()).not.toHaveText(oldCode, {
      timeout: 10_000,
    });
    const newCode = await page.locator("span.font-mono").first().innerText();
    expect(newCode).toMatch(/^[A-Z0-9]{6}$/);
    expect(newCode).not.toBe(oldCode);

    // Old code now fails at the landing lookup.
    const anon = await page.context().browser()!.newContext();
    const visitor = await anon.newPage();
    await visitor.goto("/");
    await visitor.getByLabel("Enter class code").fill(oldCode);
    await visitor.getByRole("button", { name: "Join Pot" }).click();
    await expect(
      visitor.getByText("We couldn't find that Pot. Check the code and try again."),
    ).toBeVisible();

    // The new code resolves to the renamed Pot.
    await visitor.getByLabel("Enter class code").fill(newCode);
    await visitor.getByRole("button", { name: "Join Pot" }).click();
    await expect(visitor).toHaveURL(new RegExp(`/join/${newCode}`));
    await expect(visitor.getByRole("heading", { name: "Biology 101H" })).toBeVisible();
    await anon.close();
  });
});
