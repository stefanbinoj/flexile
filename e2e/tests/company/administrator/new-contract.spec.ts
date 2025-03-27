import { db } from "@test/db";
import { companiesFactory } from "@test/factories/companies";
import { companyAdministratorsFactory } from "@test/factories/companyAdministrators";
import { companyRolesFactory } from "@test/factories/companyRoles";
import { usersFactory } from "@test/factories/users";
import { login } from "@test/helpers/auth";
import { expect, type Page, test, withinModal, withIsolatedBrowserSessionPage } from "@test/index";
import { eq } from "drizzle-orm";
import { companies, users } from "@/db/schema";
import { assertDefined } from "@/utils/assert";

test.describe("New Contractor", () => {
  let company: typeof companies.$inferSelect;
  let user: typeof users.$inferSelect;

  test.beforeEach(async () => {
    // Setup company and admin user
    const result = await companiesFactory.create({
      name: "Gumroad",
      streetAddress: "548 Market Street",
      city: "San Francisco",
      state: "CA",
      zipCode: "94104-5401",
      countryCode: "US",
    });
    company = result.company;

    const userResult = await usersFactory.create({
      legalName: "Sahil Lavingia",
      email: "sahil@example.com",
    });
    user = userResult.user;

    await companyAdministratorsFactory.create({
      companyId: company.id,
      userId: user.id,
    });

    // Create roles
    await companyRolesFactory.create({ companyId: company.id, name: "Hourly Role 1" });
    await companyRolesFactory.createProjectBased({ companyId: company.id, name: "Project-based Role" });
    await companyRolesFactory.createSalaried({ companyId: company.id, name: "Salaried Role" });
    await Promise.all([
      companyRolesFactory.create({ companyId: company.id, name: "Hourly Role 2" }),
      companyRolesFactory.create({ companyId: company.id, name: "Hourly Role 3" }),
    ]);
  });

  const fillForm = async (
    page: Page,
    { projectBased = false, salaryBased = false, email = "flexy-bob@flexile.com" },
  ) => {
    await login(page, user);
    await page.getByRole("link", { name: "People" }).click();
    await page.getByRole("link", { name: "Invite contractor" }).click();
    await expect(page.getByText("Who's joining?")).toBeVisible();
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Start date").fill("2025-08-08");
    if (projectBased) {
      await page.getByLabel("Role").selectOption("Project-based Role");
    } else if (salaryBased) {
      await page.getByLabel("Role").selectOption("Salaried Role");
    } else {
      await page.getByLabel("Role").selectOption("Hourly Role 1");
      await page.getByLabel("Average hours").fill("25");
    }
    await page.getByLabel("Rate").fill(projectBased ? "1000" : salaryBased ? "120000" : "99");
  };

  test("allows inviting a contractor", async ({ page, browser }) => {
    await fillForm(page, {});

    await page.getByRole("button", { name: "Send invite" }).click();
    await withinModal(
      async (modal) => {
        await expect(modal.getByText("Hourly Role 1").first()).toBeVisible();
        await expect(modal.getByText("99 per hour")).toBeVisible();
        await expect(modal.getByText("Target annual hours")).toBeVisible();
        await expect(modal.getByText("Maximum fee payable")).toBeVisible();
        await modal.getByRole("button", { name: "Sign now" }).click();
        await modal.getByRole("link", { name: "Type" }).click();
        await modal.getByPlaceholder("Type signature here...").fill("Admin Admin");
        await modal.getByRole("button", { name: "Next" }).click();
        await expect(modal.getByPlaceholder("Type here...")).toHaveValue("Chief Executive Officer");
        await modal.getByRole("button", { name: "Complete" }).click();
      },
      { page },
    );

    const row = page.getByRole("row").filter({ hasText: "flexy-bob@flexile.com" });
    await expect(row).toContainText("flexy-bob@flexile.com");
    await expect(row).toContainText("Aug 8, 2025");
    await expect(row).toContainText("Hourly Role 1");
    await expect(row).toContainText("Invited");
    const [deletedUser] = await db.delete(users).where(eq(users.email, "flexy-bob@flexile.com")).returning();

    await withIsolatedBrowserSessionPage(
      async (isolatedPage) => {
        const { user } = await usersFactory.create({ id: assertDefined(deletedUser).id });
        await login(isolatedPage, user);
        await isolatedPage.getByRole("link", { name: "Review & sign" }).click();
        await expect(isolatedPage.getByText("Hourly role 1").first()).toBeVisible();
        await expect(isolatedPage.getByText(user.email, { exact: true }).first()).toBeVisible();
        await expect(isolatedPage.getByText(user.legalName ?? "").first()).toBeVisible();
        await isolatedPage.getByRole("button", { name: "Sign now" }).click();
        await isolatedPage.getByRole("link", { name: "Type" }).click();
        await isolatedPage.getByPlaceholder("Type signature here...").fill("Flexy Bob");
        await isolatedPage.getByRole("button", { name: "Next" }).click();
        await isolatedPage.getByPlaceholder("Type here...").fill("50");
        await isolatedPage.getByRole("button", { name: "Complete" }).click();
        await expect(isolatedPage.getByRole("heading", { name: "Invoicing" })).toBeVisible();
      },
      { browser },
    );
  });

  test("allows inviting a project-based contractor", async ({ page, browser }) => {
    await fillForm(page, { projectBased: true });

    await page.getByRole("button", { name: "Send invite" }).click();
    await withinModal(
      async (modal) => {
        await expect(modal.getByText("Project-based Role").first()).toBeVisible();
        await expect(modal.getByText("1,000 per project")).toBeVisible();
        await expect(modal.getByText("Target annual hours")).not.toBeVisible();
        await expect(modal.getByText("Maximum fee payable")).not.toBeVisible();
        await modal.getByRole("button", { name: "Sign now" }).click();
        await modal.getByRole("link", { name: "Type" }).click();
        await modal.getByPlaceholder("Type signature here...").fill("Admin Admin");
        await modal.getByRole("button", { name: "Next" }).click();
        await expect(modal.getByPlaceholder("Type here...")).toHaveValue("Chief Executive Officer");
        await modal.getByRole("button", { name: "Complete" }).click();
      },
      { page },
    );

    const row = page.getByRole("row").filter({ hasText: "flexy-bob@flexile.com" });
    await expect(row).toContainText("flexy-bob@flexile.com");
    await expect(row).toContainText("Aug 8, 2025");
    await expect(row).toContainText("Project-based Role");
    await expect(row).toContainText("Invited");
    const [deletedUser] = await db.delete(users).where(eq(users.email, "flexy-bob@flexile.com")).returning();

    await withIsolatedBrowserSessionPage(
      async (isolatedPage) => {
        const { user } = await usersFactory.create({ id: assertDefined(deletedUser).id });
        await login(isolatedPage, user);
        await isolatedPage.getByRole("link", { name: "Review & sign" }).click();
        await expect(isolatedPage.getByText("Project-based Role").first()).toBeVisible();
        await expect(isolatedPage.getByText("1,000 per project")).toBeVisible();
        await expect(isolatedPage.getByText(user.email, { exact: true }).first()).toBeVisible();
        await expect(isolatedPage.getByText(user.legalName ?? "").first()).toBeVisible();
        await isolatedPage.getByRole("button", { name: "Sign now" }).click();
        await isolatedPage.getByRole("link", { name: "Type" }).click();
        await isolatedPage.getByPlaceholder("Type signature here...").fill("Flexy Bob");
        await isolatedPage.getByRole("button", { name: "Next" }).click();
        await isolatedPage.getByPlaceholder("Type here...").fill("50");
        await isolatedPage.getByRole("button", { name: "Complete" }).click();
        await expect(isolatedPage.getByRole("heading", { name: "Invoicing" })).toBeVisible();
      },
      { browser },
    );
  });

  test("allows inviting a salary-based contractor", async ({ page }) => {
    await fillForm(page, { salaryBased: true });

    await page.getByRole("button", { name: "Send invite" }).click();

    const row = page.getByRole("row").filter({ hasText: "flexy-bob@flexile.com" });
    await expect(row).toContainText("flexy-bob@flexile.com");
    await expect(row).toContainText("Aug 8, 2025");
    await expect(row).toContainText("Role");
    await expect(row).toContainText("Invited");
  });

  // TODO: write these tests after the most important tests are done
  // TODO: write test - allows inviting a contractor and skipping trials if work trials are enabled
  // TODO: write test - allows reactivating an alumni contractor
  // TODO: write test - excludes equity paragraphs when equity compensation is disabled
  // TODO: write test - includes equity paragraphs when equity compensation is enabled
  // TODO: write test - pre-fills form with last-used hourly contractor values
  // TODO: write test - pre-fills form with last-used project-based contractor values
  // TODO: write test - allows creating a new hourly role ad-hoc
  // TODO: write test - allows creating a new project-based role ad-hoc
});
