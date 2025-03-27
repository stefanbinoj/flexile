import { db } from "@test/db";
import { companiesFactory } from "@test/factories/companies";
import { companyAdministratorsFactory } from "@test/factories/companyAdministrators";
import { companyContractorsFactory } from "@test/factories/companyContractors";
import { usersFactory } from "@test/factories/users";
import { login } from "@test/helpers/auth";
import { expect, test } from "@test/index";
import { addDays, format, formatISO } from "date-fns";
import { eq } from "drizzle-orm";
import { users } from "@/db/schema";
import { assert } from "@/utils/assert";

test.describe("End contract", () => {
  test("allows admin to end contractor's contract", async ({ page, sentEmails }) => {
    const { company } = await companiesFactory.create();
    const { user: admin } = await usersFactory.create();

    await companyAdministratorsFactory.create({
      companyId: company.id,
      userId: admin.id,
    });

    await login(page, admin);

    const { companyContractor } = await companyContractorsFactory.create({
      companyId: company.id,
    });
    const contractor = await db.query.users.findFirst({
      where: eq(users.id, companyContractor.userId),
    });
    assert(contractor != null, "Contractor is required");
    assert(contractor.preferredName != null, "Contractor preferred name is required");

    await page.getByRole("link", { name: "People" }).click();
    await page.getByRole("link", { name: contractor.preferredName }).click();
    await page.getByRole("button", { name: "End contract" }).click();

    const today = formatISO(new Date(), { representation: "date" });
    await expect(page.getByLabel("End date")).toHaveValue(today);

    await page.getByRole("button", { name: "Yes, end contract" }).click();

    await expect(page.getByText("Contractors will show up here.")).toBeVisible();
    await page.getByRole("tab", { name: "Alumni" }).click();
    await page.getByRole("link", { name: contractor.preferredName }).click();

    await expect(page.getByText(`Contract ended on ${format(new Date(), "MMM d, yyyy")}`)).toBeVisible();
    await expect(page.getByText("Alumni")).toBeVisible();
    await expect(page.getByRole("button", { name: "End contract" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Save changes" })).not.toBeVisible();
    expect(sentEmails).toEqual([
      expect.objectContaining({
        to: contractor.email,
        subject: `Your contract with ${company.name} has ended`,
        text: expect.stringContaining(
          `Your contract with ${company.name} has ended on ${format(new Date(), "MMMM d, yyyy")}`,
        ),
      }),
    ]);
  });

  test("allows admin to cancel contract end", async ({ page, sentEmails }) => {
    const { company } = await companiesFactory.create();
    const { user: admin } = await usersFactory.create();

    await companyAdministratorsFactory.create({
      companyId: company.id,
      userId: admin.id,
    });

    await login(page, admin);

    const futureDate = addDays(new Date(), 30);
    const { companyContractor } = await companyContractorsFactory.create({
      companyId: company.id,
      endedAt: futureDate,
    });
    const contractor = await db.query.users.findFirst({
      where: eq(users.id, companyContractor.userId),
    });
    assert(contractor != null, "Contractor is required");
    assert(contractor.preferredName != null, "Contractor preferred name is required");
    assert(companyContractor.endedAt != null, "Contractor ended at is required");

    await page.getByRole("link", { name: "People" }).click();
    await page.getByRole("link", { name: contractor.preferredName }).click();

    await expect(page.getByText(`Contract ends on ${format(futureDate, "MMM d, yyyy")}`)).toBeVisible();
    await page.getByRole("button", { name: "Cancel contract end" }).click();
    await page.getByRole("button", { name: "Yes, cancel contract end" }).click();

    await expect(page.getByText(`Contract ends on ${format(futureDate, "MMM d, yyyy")}`)).not.toBeVisible();
    await expect(page.getByRole("button", { name: "End contract" })).toBeVisible();

    const email = sentEmails[0];
    assert(email != null, "Email should be sent");
    expect(email.subject).toBe(`Your contract end with ${company.name} has been canceled`);
  });

  test("allows admin to end contractor's contract in the future", async ({ page, sentEmails }) => {
    const { company } = await companiesFactory.create();
    const { user: admin } = await usersFactory.create();

    await companyAdministratorsFactory.create({
      companyId: company.id,
      userId: admin.id,
    });

    await login(page, admin);

    const { companyContractor } = await companyContractorsFactory.create({
      companyId: company.id,
    });
    const contractor = await db.query.users.findFirst({
      where: eq(users.id, companyContractor.userId),
    });
    assert(contractor != null, "Contractor is required");
    assert(contractor.preferredName != null, "Contractor preferred name is required");

    const futureDate = addDays(new Date(), 30);
    const futureDateString = formatISO(futureDate, { representation: "date" });

    await page.getByRole("link", { name: "People" }).click();
    await page.getByRole("link", { name: contractor.preferredName }).click();
    await page.getByRole("button", { name: "End contract" }).click();

    await page.getByLabel("End date").fill(futureDateString);
    await page.getByRole("button", { name: "Yes, end contract" }).click();

    await page.getByRole("link", { name: contractor.preferredName }).click();
    await expect(page.getByText(`Contract ends on ${format(futureDate, "MMM d, yyyy")}`)).toBeVisible();
    await expect(page.getByRole("button", { name: "End contract" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save changes" })).not.toBeVisible();
    expect(sentEmails).toEqual([
      expect.objectContaining({
        to: contractor.email,
        subject: `Your contract with ${company.name} has ended`,
        text: expect.stringContaining(
          `Your contract with ${company.name} has ended on ${format(futureDate, "MMMM d, yyyy")}`,
        ),
      }),
    ]);
  });
});
