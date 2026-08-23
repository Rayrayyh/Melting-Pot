import { expect, test, type Page } from "@playwright/test";

async function loginAs(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("MeltingPot-dev1");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/home/, { timeout: 15_000 });
}

async function openComposer(page: Page) {
  await page.getByRole("main").getByRole("link", { name: "Biology 101", exact: true }).click();
  await expect(page).toHaveURL(/\/p\//, { timeout: 15_000 });
  await page.getByRole("link", { name: "Add contribution" }).first().click();
  await expect(page.getByRole("heading", { name: "Write anything" })).toBeVisible();
}

test.describe("contribution loop", () => {
  test("write anything, organize, review, share: the note lands in the feed", async ({
    page,
  }) => {
    await loginAs(page, "priya@meltingpot.dev");
    await openComposer(page);

    const raw =
      "enzymes lower activation energy so reactions go faster. they are proteins and they are not consumed by the reaction. " +
      "remember the shape of the active site decides what substrate fits, thats the lock and key idea. " +
      "denaturation = when heat or ph changes the enzyme shape so it stops working.";
    await page.getByLabel("Your contribution").fill(raw);
    await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Optional section step: skipping via "Not sure" is a first-class path.
    await expect(
      page.getByRole("heading", { name: "Where might this belong?" }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Not sure where it belongs/ }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Honest progress, never a chatbot. The wait is a live region rather than a
    // heading: it covers the screen for a few seconds and then goes, and an
    // h1 that appears and disappears over a page that already has one reads
    // worse to a screen reader than a status does.
    await expect(page.getByRole("status")).toContainText("Organizing your note");
    await expect(
      page.getByText("Your original is saved. Nothing has been shared yet."),
    ).toBeVisible();

    // Review: both versions visible, contributor edits the title.
    await expect(page.getByText("Review required")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Original preserved")).toBeVisible();
    await expect(page.getByText(/lock and key/).first()).toBeVisible();
    await expect(page.getByText("Only you can approve what gets shared.")).toBeVisible();

    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page.getByLabel("Title").fill("Enzymes and activation energy");
    await page.getByRole("button", { name: "Done editing" }).click();

    await page.getByRole("button", { name: "Share with class" }).click();
    await expect(page.getByRole("heading", { name: "Shared with the class" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("credited to you")).toBeVisible();

    await page.getByRole("link", { name: "View in class notes" }).click();
    await expect(
      page.getByRole("heading", { name: "Enzymes and activation energy" }),
    ).toBeVisible();
    await expect(page.getByText("Priya Patel").first()).toBeVisible();

    // The verbatim original stayed intact through the whole loop.
    await page.getByRole("tab", { name: "Original" }).click();
    await expect(page.getByText(/thats the lock and key idea/)).toBeVisible();

    // And the feed carries it immediately.
    await page.getByRole("link", { name: "Feed", exact: true }).click();
    await expect(page).toHaveURL(/\/p\/[^/]+$/);
    await expect(
      page.getByRole("link", { name: "Enzymes and activation energy" }).first(),
    ).toBeVisible();
  });

  test("drafts autosave and resume exactly where the student left off", async ({
    page,
  }) => {
    await loginAs(page, "omar@meltingpot.dev");
    await openComposer(page);

    const marker = `krebs cycle rough thought ${Date.now()}`;
    await page.getByLabel("Your contribution").fill(`${marker} makes ATP in the matrix`);
    await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 10_000 });

    await page.goto("/me/contributions?tab=drafts");
    const draft = page.getByText(new RegExp(marker));
    await expect(draft).toBeVisible();
    await draft.click();
    await expect(page.getByLabel("Your contribution")).toHaveValue(
      new RegExp(marker),
      { timeout: 10_000 },
    );
  });

  test("a draft that reached review resumes at review, not re-organized", async ({
    page,
  }) => {
    await loginAs(page, "omar@meltingpot.dev");
    await openComposer(page);

    const marker = `photosynthesis review resume ${Date.now()}`;
    await page
      .getByLabel("Your contribution")
      .fill(
        `${marker}: light reactions in the thylakoid make ATP and NADPH, the calvin cycle fixes carbon.`,
      );
    await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("button", { name: /Not sure where it belongs/ }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.getByText("Review required")).toBeVisible({ timeout: 20_000 });

    // Leave from review (save draft), then reopen it: it must come back at
    // review with the organized version intact, not restart at write.
    const url = page.url();
    const contributionId = url.split("/contribute/")[1] ?? "";
    await page.goto("/me/contributions?tab=drafts");
    await page.getByText(new RegExp(marker)).first().click();
    await expect(page.getByText("Review required")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Original preserved")).toBeVisible();
    expect(page.url()).toContain(contributionId || "/contribute/");
  });

  test("organization failure keeps the draft safe with all three exits", async ({
    page,
  }) => {
    await loginAs(page, "omar@meltingpot.dev");
    await openComposer(page);

    const raw = "real biology content that will not organize [[fail-organize]] because the test says so";
    await page.getByLabel("Your contribution").fill(raw);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("button", { name: /Not sure where it belongs/ }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    await expect(
      page.getByText("We couldn't organize this contribution"),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText("Your original draft is safe. You can try again or edit it manually."),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Save draft" })).toBeVisible();

    // Edit manually returns to the composer with nothing lost.
    await page.getByRole("button", { name: "Edit manually" }).click();
    await expect(page.getByLabel("Your contribution")).toHaveValue(raw);
  });

  test("a link attachment stays connected through sharing", async ({ page }) => {
    await loginAs(page, "maya@meltingpot.dev");
    await openComposer(page);

    await page
      .getByLabel("Your contribution")
      .fill(
        "atp synthase is the enzyme that makes atp when protons flow through it. remember it sits in the inner mitochondrial membrane.",
      );
    await page.getByRole("button", { name: "Add link" }).click();
    await page.getByLabel("Link URL").fill("https://www.khanacademy.org/science/biology");
    await page.getByRole("button", { name: "Attach", exact: true }).click();
    await expect(page.getByText(/khanacademy\.org/)).toBeVisible();

    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("button", { name: /Not sure where it belongs/ }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.getByText("Review required")).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "Share with class" }).click();
    await expect(page.getByRole("heading", { name: "Shared with the class" })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole("link", { name: "View in class notes" }).click();
    await expect(page.getByText("Attachments")).toBeVisible();
    await expect(page.getByText(/khanacademy\.org/)).toBeVisible();
  });

  test("a file upload with a unicode name survives to the shared note and downloads", async ({
    page,
  }) => {
    await loginAs(page, "priya@meltingpot.dev");
    await openComposer(page);

    await page
      .getByLabel("Your contribution")
      .fill(
        "membrane transport summary: passive transport needs no energy, active transport uses ATP to move against the gradient.",
      );
    await expect(page.getByText("Saved", { exact: true })).toBeVisible({ timeout: 10_000 });

    // A tiny valid PNG with a non-ASCII file name, the case phone uploads hit.
    const pngBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    await page.getByLabel("Attach file").setInputFiles({
      name: "ملاحظات الخلية.png",
      mimeType: "image/png",
      buffer: Buffer.from(pngBase64, "base64"),
    });
    await expect(page.getByText(/ملاحظات الخلية\.png/)).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("button", { name: /Not sure where it belongs/ }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.getByText("Review required")).toBeVisible({ timeout: 20_000 });
    // The review step lists the attachment before approval.
    await expect(page.getByText(/ملاحظات الخلية\.png/)).toBeVisible();
    await page.getByRole("button", { name: "Share with class" }).click();
    await expect(page.getByRole("heading", { name: "Shared with the class" })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole("link", { name: "View in class notes" }).click();
    await expect(page.getByText("Attachments")).toBeVisible();
    const attachmentLink = page.getByRole("link", { name: /ملاحظات الخلية\.png/ });
    await expect(attachmentLink).toBeVisible();

    // The download route streams the bytes back with the viewer's session.
    const href = await attachmentLink.getAttribute("href");
    expect(href).toContain("/api/attachments/");
    const response = await page.request.get(href!);
    expect(response.status()).toBe(200);
    expect((await response.body()).length).toBeGreaterThan(50);
  });
});
