import { expect, test, type Page } from "@playwright/test";

// The coach is answered with a fixed read-back here, so the test is about the
// surface: three fixed groups, every item traced to its note, and no
// conversation affordances anywhere.

const READBACK = {
  covered: [{ point: "water follows solute", noteTitle: "Osmosis and tonicity" }],
  missed: [{ point: "the order of the phases", noteTitle: "Mitosis vs meiosis", where: "first half" }],
  wrong: [{ claim: "mitosis makes four", correction: "Mitosis makes two.", noteTitle: "Mitosis vs meiosis" }],
  engine: "test-engine",
};

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

test.describe("Blurting", () => {
  test("reads a blurt back into three fixed groups, with no chat", async ({ page }) => {
    await loginAs(page, "ava@meltingpot.dev");
    const id = await potId(page);

    let requested: { noteIds?: string[]; text?: string } | null = null;
    await page.route("**/api/ai/coach", async (route) => {
      const body = route.request().postDataJSON() as typeof requested;
      requested = body ?? null;
      await route.fulfill({ status: 200, json: READBACK });
    });

    await page.goto(`/p/${id}/study/blurt`);
    const notes = page.locator("fieldset").filter({ hasText: "Which notes" });
    await notes.getByRole("button").first().click();
    await page
      .getByLabel("Your blurt")
      .fill("Water follows solute. Mitosis makes four cells. Something about prophase.");
    await page.getByRole("button", { name: "Compare with the notes" }).click();

    await expect(page.getByText("What you covered")).toBeVisible();
    await expect(page.getByText("What you missed")).toBeVisible();
    await expect(page.getByText("What you had wrong")).toBeVisible();
    await expect(page.getByText("water follows solute")).toBeVisible();
    await expect(page.getByText("Mitosis makes two.")).toBeVisible();
    // The read-back names its engine, and nothing here is a conversation.
    await expect(page.getByText("test-engine")).toBeVisible();
    await expect(page.locator('[class*="chat"], [role="log"]')).toHaveCount(0);
    const sent = requested as { noteIds?: string[]; text?: string } | null;
    expect(sent?.noteIds).toHaveLength(1);
    expect(sent?.text).toContain("Mitosis makes four");
  });
});
