import { expect, test, type Page } from "@playwright/test";

// The study workspaces are driven entirely by what the study route returns, so
// the route is answered with a fixed set here. That keeps these tests about the
// learning flow (turning cards, marking them, sitting a test, being marked)
// rather than about what a model happened to write, and it means no generation
// is spent to run them.

const DECK = {
  cards: [
    { front: "What is osmosis?", back: "Water moving toward higher solute.", sourceNoteTitle: "Osmosis and tonicity", tags: ["transport"] },
    { front: "What does hypertonic mean?", back: "More solute outside; the cell shrivels.", sourceNoteTitle: "Osmosis and tonicity", tags: ["transport"] },
    { front: "How many cells does mitosis make?", back: "Two identical cells.", sourceNoteTitle: "Mitosis vs meiosis", tags: ["division"] },
  ],
};

const TEST = {
  title: "Cells and division",
  questions: [
    {
      prompt: "How many cells does mitosis produce?",
      choices: ["One", "Two", "Three", "Four"],
      answerIndex: 1,
      explanation: "One division gives two identical daughter cells.",
      sourceNoteTitle: "Mitosis vs meiosis",
    },
    {
      prompt: "Which way does water move in osmosis?",
      choices: [
        "Toward lower solute",
        "Toward higher solute",
        "It does not move",
        "Only downward",
      ],
      answerIndex: 1,
      explanation: "Water follows solute across the membrane.",
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

/** Answers the study route with `payload`, or 404s when nothing is stored yet. */
async function serveStudy(
  page: Page,
  payload: unknown,
  { storedOnPeek }: { storedOnPeek: boolean },
) {
  await page.route("**/api/ai/study", async (route) => {
    const body = route.request().postDataJSON() as { peek?: boolean };
    if (body?.peek && !storedOnPeek) {
      await route.fulfill({ status: 404, json: { error: "not_generated" } });
      return;
    }
    await route.fulfill({
      status: 200,
      json: {
        result: payload,
        cached: Boolean(body?.peek),
        generatedAt: "2026-08-20T10:00:00.000Z",
        studySetId: "00000000-0000-0000-0000-000000000001",
      },
    });
  });
}

test.describe("Flashcards", () => {
  test("turns one card at a time and ends on a round summary", async ({ page }) => {
    await loginAs(page, "ava@meltingpot.dev");
    const id = await potId(page);
    await serveStudy(page, DECK, { storedOnPeek: true });
    await page.goto(`/p/${id}/study/flashcards`);

    // The card is one object with two faces, so both are mounted and the one
    // turned away is the one taken out of the accessibility tree. Asserting on
    // that is asserting on what a reader can actually reach.
    const front = page.locator('[data-face="front"]');
    const back = page.locator('[data-face="back"]');

    // One card, front first, with the deck's position on show.
    await expect(page.getByText("1 / 3")).toBeVisible();
    await expect(front).toContainText("What is osmosis?");
    await expect(front).not.toHaveAttribute("aria-hidden", "true");
    await expect(back).toContainText("Water moving toward higher solute.");
    await expect(back).toHaveAttribute("aria-hidden", "true");
    await expect(page.getByText("From Osmosis and tonicity", { exact: false })).toBeVisible();

    // Clicking the card turns it over, and clicking again turns it back.
    await page.getByRole("button", { name: "Show the answer" }).click();
    await expect(back).not.toHaveAttribute("aria-hidden", "true");
    await expect(front).toHaveAttribute("aria-hidden", "true");
    await page.getByRole("button", { name: "Show the question" }).click();
    await expect(front).not.toHaveAttribute("aria-hidden", "true");

    // Space turns it too, and the arrow keys walk the deck.
    await page.keyboard.press("Space");
    await expect(back).not.toHaveAttribute("aria-hidden", "true");
    await page.keyboard.press("ArrowRight");
    await expect(page.getByText("2 / 3")).toBeVisible();
    await expect(front).toContainText("What does hypertonic mean?");
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByText("1 / 3")).toBeVisible();

    // Marking moves on and keeps score.
    await page.getByRole("button", { name: "Know it" }).click();
    await expect(page.getByText("1 know it · 0 still learning")).toBeVisible();
    await page.getByRole("button", { name: "Still learning" }).click();
    await page.getByRole("button", { name: "Know it" }).click();

    // The round ends on its own summary, offering the hard ones again.
    await expect(page.getByText("You knew 2 of 3")).toBeVisible();
    await expect(page.getByText("67% of this round, this time through.")).toBeVisible();
    await page.getByRole("button", { name: "Study the 1 still learning" }).click();
    await expect(page.getByText("1 / 1")).toBeVisible();
    await expect(page.locator('[data-face="front"]')).toContainText("What does hypertonic mean?");
  });

  test("filters the deck by tag", async ({ page }) => {
    await loginAs(page, "ava@meltingpot.dev");
    const id = await potId(page);
    await serveStudy(page, DECK, { storedOnPeek: true });
    await page.goto(`/p/${id}/study/flashcards`);

    await page.getByRole("button", { name: /^division/ }).click();
    await expect(page.getByText("1 / 1")).toBeVisible();
    await expect(page.locator('[data-face="front"]')).toContainText(
      "How many cells does mitosis make?",
    );

    await page.getByRole("button", { name: /^All 3/ }).click();
    await expect(page.getByText("1 / 3")).toBeVisible();
  });
});

test.describe("Practice test", () => {
  test("is configured, sat, and marked", async ({ page }) => {
    await loginAs(page, "ava@meltingpot.dev");
    const id = await potId(page);
    await serveStudy(page, TEST, { storedOnPeek: false });
    await page.goto(`/p/${id}/study/practice`);

    // The setup comes first: length, difficulty, which parts, and a focus.
    await expect(page.getByText("Set up the test")).toBeVisible();
    await page.getByRole("button", { name: "20", exact: true }).click();
    await page.getByRole("button", { name: "Demanding" }).click();
    await page.getByRole("button", { name: "Week 2: Cell structure" }).click();
    await page.getByLabel("Anything to concentrate on").fill("osmosis problems");

    // What was asked for reaches the route. The watcher is armed before the
    // click, because a request that has already been made cannot be waited for.
    const generation = page.waitForRequest(
      (candidate) =>
        candidate.url().includes("/api/ai/study") &&
        candidate.postDataJSON()?.regenerate === true,
    );
    await page.getByRole("button", { name: "Write the test" }).click();
    const request = await generation;
    expect(request.postDataJSON().options).toMatchObject({
      questionCount: 20,
      difficulty: "demanding",
      emphasis: "osmosis problems",
    });
    expect(request.postDataJSON().options.sectionIds).toHaveLength(1);

    // A start screen, then one question at a time.
    await expect(page.getByRole("heading", { name: "Cells and division" })).toBeVisible();
    await expect(page.getByText("2 min")).toBeVisible();
    await page.getByRole("button", { name: "Start the test" }).click();
    await expect(page.getByText("Question 1 of 2")).toBeVisible();

    // Nothing says right or wrong while the test is open.
    await page.getByText("Two", { exact: true }).click();
    await expect(page.getByText("Correct answer")).toHaveCount(0);
    await expect(page.getByText("1 answered")).toBeVisible();

    // An answer can be changed, and it survives moving away and back.
    await page.getByText("Three", { exact: true }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByText("Question 2 of 2")).toBeVisible();
    await page.getByRole("button", { name: "Previous" }).click();
    await expect(page.getByRole("radio", { checked: true })).toHaveCount(1);
    await page.getByText("Two", { exact: true }).click();

    // The navigator jumps straight to the other question.
    await page.getByRole("button", { name: "Question 2, not answered" }).click();
    await expect(page.getByText("Question 2 of 2")).toBeVisible();
    await page.getByText("Toward higher solute", { exact: true }).click();

    // Review before handing it in.
    await page.getByRole("button", { name: "Review answers" }).click();
    await expect(page.getByText("2 of 2 answered")).toBeVisible();
    await page.getByRole("button", { name: "Hand it in" }).click();

    // Marked, with the score, the explanation, and where each question came from.
    await expect(page.getByText("100%")).toBeVisible();
    await expect(page.getByText("One division gives two identical daughter cells.")).toBeVisible();
    await expect(page.getByText("From Mitosis vs meiosis")).toBeVisible();
    await expect(page.getByRole("button", { name: "Take it again" })).toBeVisible();
  });

  test("offers the missed questions again", async ({ page }) => {
    await loginAs(page, "ava@meltingpot.dev");
    const id = await potId(page);
    await serveStudy(page, TEST, { storedOnPeek: true });
    await page.goto(`/p/${id}/study/practice`);

    await page.getByRole("button", { name: "Open the saved test" }).click();
    await page.getByRole("button", { name: "Start the test" }).click();
    await page.getByText("One", { exact: true }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.getByText("Toward higher solute", { exact: true }).click();
    await page.getByRole("button", { name: "Review answers" }).click();
    await page.getByRole("button", { name: "Hand it in" }).click();

    await expect(page.getByText("50%")).toBeVisible();
    await expect(page.getByText("Two", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Try the 1 you missed" }).click();
    await expect(page.getByText("Question 1 of 1")).toBeVisible();
  });
});
