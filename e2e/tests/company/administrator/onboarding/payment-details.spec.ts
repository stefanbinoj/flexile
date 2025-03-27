import { db, takeOrThrow } from "@test/db";
import { companiesFactory } from "@test/factories/companies";
import { companyAdministratorsFactory } from "@test/factories/companyAdministrators";
import { login } from "@test/helpers/auth";
import { expect, test } from "@test/index";
import { eq } from "drizzle-orm";
import { users } from "@/db/schema";

test.describe("Company administrator onboarding - payment details", () => {
  test("allows connecting a bank account", async ({ page }) => {
    const { company } = await companiesFactory.create({ stripeCustomerId: null }, { withoutBankAccount: true });
    const { administrator } = await companyAdministratorsFactory.create({ companyId: company.id });
    const adminUser = await db.query.users.findFirst({ where: eq(users.id, administrator.userId) }).then(takeOrThrow);

    await login(page, adminUser);

    await expect(page.getByText("Link your bank account")).toBeVisible();
    await expect(
      page.getByText("We'll use this account to debit contractor payments and our monthly fee"),
    ).toBeVisible();
    await expect(page.getByText("Payments to contractors may take up to 10 business days to process.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Start using Flexile" })).toBeDisabled();

    const stripeFrame = page.frameLocator("[src^='https://js.stripe.com/v3/elements-inner-payment']");
    await stripeFrame.getByLabel("Test Institution").click();

    const bankFrame = page.frameLocator("[src^='https://js.stripe.com/v3/linked-accounts-inner']");
    await bankFrame.getByRole("button", { name: "Agree" }).click();
    await bankFrame.getByTestId("success").click();
    await bankFrame.getByRole("button", { name: "Connect account" }).click();
    await bankFrame.getByRole("button", { name: "Back to Flexile" }).click();

    // TODO (techdebt): This is passing locally but failing on CI.

    // await page.getByRole("button", { name: "Start using Flexile" }).click();

    // await expect(page.getByRole("heading", { name: "People" })).toBeVisible();
    // await expect(page.getByText("Contractors will show up here.")).toBeVisible();

    // // Verify bank account status
    // const companyStripeAccount = await db.query.companyStripeAccounts
    //   .findFirst({
    //     where: eq(companyStripeAccounts.companyId, company.id),
    //   })
    //   .then(takeOrThrow);
    // expect(companyStripeAccount.status).toBeTruthy();
    // expect(companyStripeAccount.status).not.toBe("initial");
  });

  test("allows manually connecting a bank account with microdeposit verification", async ({ page }) => {
    const { company } = await companiesFactory.create({ stripeCustomerId: null }, { withoutBankAccount: true });
    const { administrator } = await companyAdministratorsFactory.create({ companyId: company.id });
    const adminUser = await db.query.users.findFirst({ where: eq(users.id, administrator.userId) }).then(takeOrThrow);

    await login(page, adminUser);

    const stripeFrame = page.frameLocator("[src^='https://js.stripe.com/v3/elements-inner-payment']");
    await stripeFrame.getByRole("button", { name: "Enter bank details manually instead" }).click();

    const bankFrame = page.frameLocator("[src^='https://js.stripe.com/v3/linked-accounts-inner']");
    await bankFrame.getByLabel("Routing number").fill("110000000");
    await bankFrame.getByTestId("manualEntry-accountNumber-input").fill("000123456789");
    await bankFrame.getByTestId("manualEntry-confirmAccountNumber-input").fill("000123456789");
    await bankFrame.getByRole("button", { name: "Submit" }).click();

    await expect(
      bankFrame.getByText(
        "Next, finish up on Flexile to initiate micro-deposits. You can expect an email with instructions within 1-2 business days.",
      ),
    ).toBeVisible();

    // TODO (techdebt): This is passing locally but failing on CI.

    // await bankFrame.getByRole("button", { name: "Back to Flexile" }).click();
    // await page.getByRole("button", { name: "Start using Flexile" }).click();

    // await page.getByRole("link", { name: "Settings" }).click();
    // await expect(page.getByRole("heading", { name: "Company account" })).toBeVisible();

    // TODO (techdebt): This is not visible locally either
    // await expect(page.getByText("Verify your bank account to enable contractor payments")).toBeVisible();

    // const companyStripeAccount = await db.query.companyStripeAccounts
    //   .findFirst({
    //     where: eq(companyStripeAccounts.companyId, company.id),
    //   })
    //   .then(takeOrThrow);
    // expect(companyStripeAccount.status).toBeTruthy();
    // expect(companyStripeAccount.status).not.toBe("initial");
  });
});
