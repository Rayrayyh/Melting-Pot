import { expect, test, type Browser, type Page } from "@playwright/test";

async function loginAs(browser: Browser, email: string): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("MeltingPot-dev1");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/home/, { timeout: 15_000 });
  return page;
}

async function openNote(page: Page, noteTitle: string) {
  await page.getByRole("main").getByRole("link", { name: "Biology 101", exact: true }).click();
  await expect(page).toHaveURL(/\/p\//, { timeout: 15_000 });
  await page.getByRole("link", { name: noteTitle }).first().click();
  await expect(page.getByRole("heading", { name: noteTitle })).toBeVisible();
}

test.describe("correction loop", () => {
  test("propose, maintainer accepts, both contributors credited", async ({ browser }) => {
    // Priya proposes a correction from the shared note.
    const priya = await loginAs(browser, "priya@meltingpot.dev");
    await openNote(priya, "The scientific method, laws, and theories");
    await priya.getByRole("link", { name: "Suggest correction" }).click();
    await expect(
      priya.getByRole("heading", { name: "Suggest a correction" }),
    ).toBeVisible();

    await priya
      .getByRole("button", { name: /A law describes what happens under given conditions\./ })
      .click();
    await expect(priya.getByText("Selected", { exact: true })).toBeVisible();
    await priya.getByRole("button", { name: "Incomplete" }).click();
    await priya
      .getByLabel("Your correction")
      .fill("A law describes what happens under given conditions without explaining the cause.");
    await priya
      .getByLabel("Why this is more accurate (optional)")
      .fill("The distinction from a theory is the missing why.");
    await priya
      .getByLabel("Supporting source (optional)")
      .fill("Lecture 1 slides, slide 9");
    await priya.getByText("A maintainer approves changes").isVisible();
    await priya.getByRole("button", { name: "Continue", exact: true }).click();

    // Before and after with the difference made explicit.
    await expect(priya.getByRole("heading", { name: "Show the change" })).toBeVisible();
    await expect(priya.getByText("Before", { exact: true })).toBeVisible();
    await expect(priya.getByText("After", { exact: true })).toBeVisible();
    await expect(priya.getByText(/This correction adds \d+ word/).first()).toBeVisible();
    await priya.getByRole("button", { name: "Send to maintainer" }).click();

    await expect(priya).toHaveURL(/\/proposals\//, { timeout: 15_000 });
    await expect(priya.getByText("Waiting on maintainer")).toBeVisible();

    // Maya reviews from her dashboard queue and accepts.
    const maya = await loginAs(browser, "maya@meltingpot.dev");
    await maya
      .getByRole("link", { name: /The scientific method, laws, and theories.*Priya Patel/s })
      .first()
      .click();
    await expect(maya).toHaveURL(/\/review\//, { timeout: 15_000 });
    await expect(maya.getByText("Waiting on your review")).toBeVisible();
    await expect(maya.getByText("Current version", { exact: true })).toBeVisible();
    await expect(maya.getByText("Suggested version", { exact: true })).toBeVisible();
    await expect(
      maya.getByText("AI cannot publish this change. A maintainer must decide."),
    ).toBeVisible();
    await maya.getByRole("button", { name: "Accept changes" }).click();
    await expect(maya.getByText("Accepted. The shared note is updated.")).toBeVisible({
      timeout: 15_000,
    });

    // Priya sees the outcome and the updated, dual-credited note.
    await priya.reload();
    await expect(priya.getByText("Accepted. The shared note is updated.")).toBeVisible();
    await priya.getByRole("link", { name: "View updated note" }).click();
    await expect(priya.getByText("Version 2")).toBeVisible();
    await expect(priya.getByText("corrected by Priya Patel")).toBeVisible();
    await expect(
      priya.getByText(/without explaining the cause/).first(),
    ).toBeVisible();
  });

  test("revision requested, resubmitted, then declined with reason preserved", async ({
    browser,
  }) => {
    const omar = await loginAs(browser, "omar@meltingpot.dev");
    await openNote(omar, "Organelles and what they do");
    await omar.getByRole("link", { name: "Suggest correction" }).click();
    await omar.getByRole("button", { name: /Lysosomes: digest waste\./ }).click();
    await omar.getByRole("button", { name: "Incomplete" }).click();
    await omar
      .getByLabel("Your correction")
      .fill("Lysosomes: digest waste using hydrolytic enzymes.");
    await omar.getByRole("button", { name: "Continue", exact: true }).click();
    await omar.getByRole("button", { name: "Send to maintainer" }).click();
    await expect(omar).toHaveURL(/\/proposals\//, { timeout: 15_000 });
    const proposalUrl = omar.url();

    // Maya asks for a revision with required feedback.
    const maya = await loginAs(browser, "maya@meltingpot.dev");
    await maya
      .getByRole("link", { name: /Organelles and what they do.*Omar Haddad/s })
      .first()
      .click();
    await expect(maya).toHaveURL(/\/review\//, { timeout: 15_000 });
    await maya.getByRole("button", { name: "Request revisions" }).click();
    await maya
      .getByLabel("What should they improve?")
      .fill("Name the enzyme type from a source so the class can check it.");
    await maya.getByRole("button", { name: "Request revisions" }).click();
    await expect(maya.getByText("Revision requested").first()).toBeVisible({
      timeout: 15_000,
    });

    // Omar edits the SAME proposal and resubmits.
    await omar.goto(proposalUrl);
    await expect(omar.getByText("Revision requested").first()).toBeVisible();
    await expect(
      omar.getByText("Name the enzyme type from a source so the class can check it.").first(),
    ).toBeVisible();
    await omar.getByRole("button", { name: "Edit this proposal" }).click();
    await omar
      .getByLabel("Your correction")
      .fill("Lysosomes: digest waste using hydrolytic enzymes such as proteases.");
    await omar
      .getByLabel("Supporting source (optional)")
      .fill("OpenStax Biology, section 4.4");
    await omar.getByRole("button", { name: "Resubmit to maintainer" }).click();
    await expect(omar.getByText("Waiting on maintainer")).toBeVisible({ timeout: 15_000 });
    await expect(omar.getByText("resubmitted after feedback")).toBeVisible();

    // Maya declines with a reason; everything stays visible.
    await maya.goto("/home");
    await maya
      .getByRole("link", { name: /Organelles and what they do.*Omar Haddad/s })
      .first()
      .click();
    await maya.getByRole("button", { name: "Decline", exact: true }).click();
    await maya
      .getByLabel("Why are you declining?")
      .fill("The appendix already covers enzyme classes; the bullet stays short.");
    await maya.getByRole("button", { name: "Decline proposal" }).click();
    await expect(
      maya.getByText("Declined. This proposal won't change the note."),
    ).toBeVisible({ timeout: 15_000 });

    await omar.goto(proposalUrl);
    await expect(
      omar.getByText("Declined. This proposal won't change the note."),
    ).toBeVisible();
    await expect(
      omar.getByText("The appendix already covers enzyme classes; the bullet stays short.").first(),
    ).toBeVisible();
    await expect(omar.getByText("declined the proposal")).toBeVisible();
    await expect(omar.getByText("resubmitted after feedback")).toBeVisible();
  });
});
