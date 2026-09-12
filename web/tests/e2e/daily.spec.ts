import { expect, test, type Page } from "@playwright/test";

// The daily quiz is driven by what the study route returns, so the route is
// answered with a fixed payload here. No generation is spent to run this.

const QUIZ = {
  title: "Today's quiz",
  questions: [
    {
      prompt: "How many cells does mitosis produce?",
      choices: ["One", "Two", "Three", "Four"],
      sourceNoteTitle: "Mitosis vs meiosis",
    },
    {
      prompt: "Which way does water move in osmosis?",
      choices: ["Toward lower solute", "Toward higher solute", "It does not move", "Only downward"],
      sourceNoteTitle: "Osmosis and tonicity",
    },
  ],
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

function mockRoute(page: Page, { takenAlready }: { takenAlready?: boolean }) {
  let built = false;
  void page.route("**/api/ai/study", async (route) => {
    const body = route.request().postDataJSON() as { peek?: boolean };
    if (body?.peek && !built) {
      await route.fulfill({ status: 404, json: { error: "not_generated" } });
      return;
    }
    built = true;
    await route.fulfill({
      status: 200,
      json: {
        result: QUIZ,
        cached: Boolean(body?.peek),
        generatedAt: "2026-09-12T10:00:00.000Z",
        studySetId: "00000000-0000-0000-0000-000000000004",
        secured: true,
      },
    });
  });
  return page.route("**/rest/v1/rpc/submit_daily_quiz", async (route) => {
    if (takenAlready) {
      await route.fulfill({ status: 400, json: { message: "already_taken", code: "P0001" } });
      return;
    }
    await route.fulfill({
      json: {
        firstPass: true,
        correct: 1,
        total: 2,
        replayed: false,
        marks: [
          { index: 0, choice: 1, correct: true, answerIndex: 1, explanation: "Two identical cells." },
          { index: 1, choice: 0, correct: false, answerIndex: 1, explanation: "Water follows solute." },
        ],
      },
    });
  });
}

async function sitQuiz(page: Page) {
  await page.getByRole("button", { name: "Take today's quiz" }).click();
  await page.getByRole("button", { name: "Start the test" }).click();
  await page.getByText("Two", { exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByText("Toward lower solute", { exact: true }).click();
  await page.getByRole("button", { name: "Review answers" }).click();
  await page.getByRole("button", { name: "Hand it in" }).click();
}

test.describe("The daily quiz", () => {
  test("is brought in once, taken once, and marked on the server", async ({ page }) => {
    await loginAs(page, "ava@meltingpot.dev");
    const id = await potId(page);
    mockRoute(page, {});

    await page.goto(`/p/${id}/study/daily`);
    await expect(page.getByText("Checking whether today's quiz is here.")).toBeHidden();
    await page.getByRole("button", { name: "Bring in today's quiz" }).click();
    await sitQuiz(page);

    await expect(page.getByText("50%")).toBeVisible();
    await expect(page.getByText("Water follows solute.")).toBeVisible();
  });

  test("refuses a second sitting of the same day", async ({ page }) => {
    await loginAs(page, "omar@meltingpot.dev");
    const id = await potId(page);
    mockRoute(page, { takenAlready: true });

    await page.goto(`/p/${id}/study/daily`);
    await page.getByRole("button", { name: "Bring in today's quiz" }).click();
    await sitQuiz(page);

    await expect(
      page.getByText("You have already taken today's quiz. It comes back tomorrow."),
    ).toBeVisible();
  });
});
