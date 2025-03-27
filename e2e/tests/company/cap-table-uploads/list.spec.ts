import type { Page } from "@playwright/test";
import { db } from "@test/db";
import { companiesFactory } from "@test/factories/companies";
import { companyAdministratorsFactory } from "@test/factories/companyAdministrators";
import { usersFactory } from "@test/factories/users";
import { login } from "@test/helpers/auth";
import { findRequiredTableRow } from "@test/helpers/matchers";
import { expect, test } from "@test/index";
import { format } from "date-fns";
import { capTableUploads } from "@/db/schema";

test.describe("Cap table uploads list", () => {
  const setupCompany = async () => {
    const { company } = await companiesFactory.createCompletedOnboarding();
    const { user } = await usersFactory.create({ teamMember: true });
    await companyAdministratorsFactory.create({ companyId: company.id, userId: user.id });
    return { company, user };
  };

  test("shows empty state when no uploads exist", async ({ page }: { page: Page }) => {
    const { user } = await setupCompany();

    await login(page, user);
    await page.goto("/cap_table_uploads");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("No cap table uploads yet")).toBeVisible();
    await expect(page.getByRole("table")).not.toBeVisible();
  });

  test("shows list of uploads with different statuses", async ({ page }: { page: Page }) => {
    const { user: adminUser } = await setupCompany();
    const { user: uploader } = await usersFactory.createCompanyAdmin();
    const { administrator } = await companyAdministratorsFactory.create({ userId: uploader.id });

    // Create test data for different statuses
    const statuses = ["submitted", "processing", "failed"] as const;
    const uploads = await Promise.all(
      statuses.map(async (status) => {
        const [upload] = await db
          .insert(capTableUploads)
          .values({
            companyId: administrator.companyId,
            userId: uploader.id,
            status,
            uploadedAt: new Date(),
          })
          .returning();
        if (!upload) throw new Error(`Failed to create test upload with status ${status}`);
        return upload;
      }),
    );

    await login(page, adminUser);
    await page.goto("/cap_table_uploads");
    await page.waitForLoadState("networkidle");

    // Test list view shows all uploads
    for (const upload of uploads) {
      const row = await findRequiredTableRow(page, {
        Date: format(upload.uploadedAt, "MMM d, yyyy"),
      });
      await expect(row).toBeVisible();
    }

    // Verify all uploads are shown
    const rows = await page.locator("tbody tr").all();
    expect(rows.length).toBe(uploads.length);
  });
});
