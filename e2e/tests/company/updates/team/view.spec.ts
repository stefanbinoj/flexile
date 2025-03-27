import { db } from "@test/db";
import { companiesFactory } from "@test/factories/companies";
import { companyAdministratorsFactory } from "@test/factories/companyAdministrators";
import { companyContractorAbsencesFactory } from "@test/factories/companyContractorAbsences";
import { companyContractorsFactory } from "@test/factories/companyContractors";
import { companyContractorUpdatesFactory } from "@test/factories/companyContractorUpdates";
import { usersFactory } from "@test/factories/users";
import { login } from "@test/helpers/auth";
import { endsOn, startsOn } from "@test/helpers/date";
import { expect, test } from "@test/index";
import { addDays, format, subDays, subWeeks } from "date-fns";
import { desc, eq } from "drizzle-orm";
import { companies, companyContractorUpdateTasks, users } from "@/db/schema";

test.describe("Team member updates page", () => {
  let company: typeof companies.$inferSelect;
  let adminUser: typeof users.$inferSelect;

  test.beforeEach(async ({ page }) => {
    company = (await companiesFactory.create({ teamUpdatesEnabled: true })).company;
    adminUser = (await usersFactory.create()).user;
    await companyAdministratorsFactory.create({ companyId: company.id, userId: adminUser.id });
    await login(page, adminUser);
  });

  test("view team updates", async ({ page }) => {
    // Create contractors
    const contractorUser1 = (await usersFactory.create({ preferredName: "John" })).user;
    const contractor1 = await companyContractorsFactory.create({ companyId: company.id, userId: contractorUser1.id });

    // Create periods
    const twoWeeksAgo = subWeeks(new Date(), 2);
    const lastWeek = subWeeks(new Date(), 1);
    const thisWeek = new Date();

    // Create updates for different periods
    // Two weeks ago
    const twoWeeksAgoUpdate = await companyContractorUpdatesFactory.createWithTasks({
      companyContractorId: contractor1.companyContractor.id,
      companyId: company.id,
      periodStartsOn: startsOn(twoWeeksAgo).toDateString(),
      periodEndsOn: endsOn(twoWeeksAgo).toDateString(),
      publishedAt: twoWeeksAgo,
    });
    const twoWeeksAgoTasks = await db.query.companyContractorUpdateTasks.findMany({
      where: eq(companyContractorUpdateTasks.companyContractorUpdateId, twoWeeksAgoUpdate.id),
      orderBy: desc(companyContractorUpdateTasks.position),
    });

    // Last week
    const lastWeekUpdate = await companyContractorUpdatesFactory.createWithTasks({
      companyContractorId: contractor1.companyContractor.id,
      companyId: company.id,
      periodStartsOn: startsOn(lastWeek).toDateString(),
      periodEndsOn: endsOn(lastWeek).toDateString(),
      publishedAt: new Date("2024-09-10"),
    });
    const lastWeekTasks = await db.query.companyContractorUpdateTasks.findMany({
      where: eq(companyContractorUpdateTasks.companyContractorUpdateId, lastWeekUpdate.id),
      orderBy: desc(companyContractorUpdateTasks.position),
    });

    // This week
    const thisWeekUpdate = await companyContractorUpdatesFactory.createWithTasks({
      companyContractorId: contractor1.companyContractor.id,
      companyId: company.id,
      periodStartsOn: startsOn(thisWeek).toDateString(),
      periodEndsOn: endsOn(thisWeek).toDateString(),
      publishedAt: new Date("2024-09-20"),
    });
    const thisWeekTasks = await db.query.companyContractorUpdateTasks.findMany({
      where: eq(companyContractorUpdateTasks.companyContractorUpdateId, thisWeekUpdate.id),
      orderBy: desc(companyContractorUpdateTasks.position),
    });

    // Create absences
    const absence1 = (
      await companyContractorAbsencesFactory.create({
        companyId: company.id,
        companyContractorId: contractor1.companyContractor.id,
        startsOn: startsOn(thisWeek).toDateString(),
        endsOn: addDays(startsOn(thisWeek), 1).toDateString(),
      })
    ).absence;
    const absence2 = (
      await companyContractorAbsencesFactory.create({
        companyId: company.id,
        companyContractorId: contractor1.companyContractor.id,
        startsOn: subDays(endsOn(thisWeek), 1).toDateString(),
        endsOn: addDays(endsOn(thisWeek), 1).toDateString(),
      })
    ).absence;

    // Login and visit page
    await page.getByRole("link", { name: "Updates" }).click();
    await expect(page.getByText("This week:", { exact: true })).toBeVisible();

    // Check absences are initially hidden
    await expect(page.getByText("Off this week: John")).toBeVisible();
    await expect(page.getByText(startsOn(thisWeek).toDateString())).not.toBeVisible();

    // Show absences and updates
    const subheader = page.locator("main header+div");
    await subheader.getByText("John").click();
    await expect(
      page.getByText(`${format(absence1.startsOn, "EEE, MMM d")} - ${format(absence1.endsOn, "EEE, MMM d")}`),
    ).toBeVisible();
    await expect(
      page.getByText(`${format(absence2.startsOn, "EEE, MMM d")} - ${format(absence2.endsOn, "EEE, MMM d")}`),
    ).toBeVisible();
    await expect(page.getByText(thisWeekTasks[0]?.name ?? "")).toBeVisible();
    await expect(page.getByText(thisWeekTasks[1]?.name ?? "")).toBeVisible();

    // Navigate to previous weeks
    await page.getByRole("link", { name: "Previous period" }).click();
    await expect(page.getByRole("link", { name: "Next period" })).toBeVisible();
    await expect(page.locator("header").getByText("Last week:")).toBeVisible();
    await expect(page.getByText("Off this week")).not.toBeVisible();
    await expect(page.getByText(lastWeekTasks[0]?.name ?? "")).toBeVisible();
    await expect(page.getByText(lastWeekTasks[1]?.name ?? "")).toBeVisible();

    await page.getByRole("link", { name: "Previous period" }).click();
    await expect(page.locator("header").getByText("Week:", { exact: true })).toBeVisible();
    await expect(page.getByText(twoWeeksAgoTasks[0]?.name ?? "")).toBeVisible();
    await expect(page.getByText(twoWeeksAgoTasks[1]?.name ?? "")).toBeVisible();

    // Navigate to empty week
    await page.getByRole("link", { name: "Previous period" }).click();
    await expect(page.getByText("No team updates to display.")).toBeVisible();

    // Navigate back to current week
    await page.getByRole("link", { name: "Next period" }).click();
    await expect(page.getByText("Week:", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Next period" }).click();
    await expect(page.getByText("Last week:")).toBeVisible();
    await page.getByRole("link", { name: "Next period" }).click();
    await expect(page.getByText("This week:", { exact: true })).toBeVisible();

    // Test period_starts_on parameter
    await page.goto(`/updates/team?period=${format(startsOn(twoWeeksAgo), "yyyy-MM-dd")}`);
    await expect(page.getByText("Week:", { exact: true })).toBeVisible();
    await expect(page.getByText(twoWeeksAgoTasks[0]?.name ?? "")).toBeVisible();
    await expect(page.getByText(twoWeeksAgoTasks[1]?.name ?? "")).toBeVisible();
  });

  test("doesn't show workers taking the week off in missing updates", async ({ page }) => {
    const thisWeek = new Date();

    const missingUpdateUser = (await usersFactory.create({ preferredName: "Missing User" })).user;
    await companyContractorsFactory.create({ companyId: company.id, userId: missingUpdateUser.id });

    const absentUser = (await usersFactory.create({ preferredName: "Absent User" })).user;
    const absentContractor = await companyContractorsFactory.create({ companyId: company.id, userId: absentUser.id });

    const updateUser = (await usersFactory.create({ preferredName: "Update User" })).user;
    const updateContractor = await companyContractorsFactory.create({ companyId: company.id, userId: updateUser.id });

    await companyContractorUpdatesFactory.createWithTasks({
      companyContractorId: updateContractor.companyContractor.id,
      companyId: company.id,
      periodStartsOn: startsOn(thisWeek).toDateString(),
      periodEndsOn: endsOn(thisWeek).toDateString(),
      publishedAt: new Date(),
    });
    await companyContractorAbsencesFactory.create({
      companyId: company.id,
      companyContractorId: absentContractor.companyContractor.id,
      startsOn: startsOn(thisWeek).toDateString(),
      endsOn: endsOn(thisWeek).toDateString(),
    });

    await page.getByRole("link", { name: "Updates" }).click();

    await expect(page.getByText("Off this week: Absent User")).toBeVisible();
    await expect(page.getByText("Missing updates: Missing User")).not.toContainText("Absent User");
  });

  // TODO (techdebt): Add a test for the GitHub integration
});
