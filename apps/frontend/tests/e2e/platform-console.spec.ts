import { test, expect } from "@playwright/test";

test.describe("Multi-Cloud Platform Console — E2E", () => {
  test("loads the Overview tab with live status and summary stats", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Multi-Cloud Platform Console" })).toBeVisible();
    await expect(page.getByTestId("summary-bar")).toBeVisible();
    await expect(page.locator(".live-dot")).toBeVisible();
  });

  test("tab navigation updates the URL and the breadcrumb", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: "Workstreams" }).click();
    await expect(page).toHaveURL(/\/workstreams$/);
    await expect(page.getByText("All workstreams")).toBeVisible();

    await page.getByRole("link", { name: "Analytics" }).click();
    await expect(page).toHaveURL(/\/analytics$/);
    await expect(page.getByText("Monthly cost by cloud")).toBeVisible();

    await page.getByRole("link", { name: "Reports" }).click();
    await expect(page).toHaveURL(/\/reports$/);
    await expect(page.getByText("Workstream summary report")).toBeVisible();

    await page.getByRole("link", { name: "Governance" }).click();
    await expect(page).toHaveURL(/\/governance$/);
    await expect(page.getByText("Active adapters")).toBeVisible();
  });

  test("the Workstreams grid can be filtered and sorted", async ({ page }) => {
    await page.goto("/workstreams");
    const filterBox = page.getByLabel("Filter workstreams");

    // Wait for the initial API fetch to resolve before taking the baseline
    // row count — otherwise this can race the loading state and capture 0.
    await expect(page.locator(".run-table tbody tr").first()).toBeVisible();
    const rowsBefore = await page.locator(".run-table tbody tr").count();
    expect(rowsBefore).toBeGreaterThan(0);

    await filterBox.fill("does-not-exist-xyz");
    await expect(page.getByText(/No workstreams match/)).toBeVisible();

    await filterBox.fill("");
    await expect(page.locator(".run-table tbody tr")).toHaveCount(rowsBefore);

    await page.getByRole("columnheader", { name: /Risk/ }).click();
    await expect(page.locator(".run-table tbody tr")).toHaveCount(rowsBefore);
  });

  test("approving an in-review workstream records a governance audit event", async ({ page }) => {
    await page.goto("/workstreams");
    const approveButton = page.getByRole("button", { name: "Approve" }).first();

    const hasPending = await approveButton.isVisible().catch(() => false);
    test.skip(!hasPending, "No workstream is currently in review (already approved by a prior run).");

    await approveButton.click();

    await page.getByRole("link", { name: "Governance" }).click();
    await expect(page.getByTestId("audit-table")).toContainText("workstream.approved");
  });
});
