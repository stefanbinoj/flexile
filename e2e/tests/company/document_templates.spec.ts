import { db } from "@test/db";
import { companiesFactory } from "@test/factories/companies";
import { companyAdministratorsFactory } from "@test/factories/companyAdministrators";
import { usersFactory } from "@test/factories/users";
import { login } from "@test/helpers/auth";
import { expect, test } from "@test/index";
import { assertDefined } from "@/utils/assert";

test.describe("Document templates", () => {
  test("allows viewing and managing document templates", async ({ page }) => {
    const { company } = await companiesFactory.createCompletedOnboarding();
    const documentTemplate = assertDefined(await db.query.documentTemplates.findFirst({}));
    const { user: adminUser } = await usersFactory.create();
    await companyAdministratorsFactory.create({
      companyId: company.id,
      userId: adminUser.id,
    });

    await login(page, adminUser);
    await page.goto("/document_templates");
    await expect(page.getByText("No document templates yet.")).not.toBeVisible();
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await expect(page.getByRole("cell", { name: documentTemplate.name })).toBeVisible();

    await page.getByRole("link", { name: documentTemplate.name }).click();
    await expect(
      page.getByText("This is our default template. Replace it with your own to fully customize it."),
    ).toBeVisible();
    await expect(page.locator("#title_container").getByText("Default Consulting Agreement")).toBeVisible();
    await page.getByRole("button", { name: "Replace default template" }).click();
    await page.getByRole("link", { name: "Back to templates" }).click();
    await expect(page.locator("tbody tr")).toHaveCount(1);

    // Create new equity grant template
    await page.getByRole("button", { name: "New template" }).click();
    await expect(
      page.getByText(
        "By creating a custom document template, you acknowledge that Flexile shall not be liable for any claims, liabilities, or damages arising from or related to such documents. See our Terms of Service for more details.",
      ),
    ).toBeVisible();
    await page.getByRole("button", { name: "Equity grant contract" }).click();

    await expect(page.locator("#title_container").getByText("Equity grant contract")).toBeVisible();
    await page.getByRole("link", { name: "Back to templates" }).click();

    await expect(page.locator("tbody tr")).toHaveCount(2);
  });
});
