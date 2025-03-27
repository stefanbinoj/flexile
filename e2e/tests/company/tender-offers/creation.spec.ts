import { db, takeOrThrow } from "@test/db";
import { companiesFactory } from "@test/factories/companies";
import { companyAdministratorsFactory } from "@test/factories/companyAdministrators";
import { login } from "@test/helpers/auth";
import { expect, test } from "@test/index";
import { eq } from "drizzle-orm";
import { users } from "@/db/schema";

test.describe("Tender offer creation", () => {
  test("allows creating a new tender offer", async ({ page }) => {
    const { company } = await companiesFactory.create({
      tenderOffersEnabled: true,
      capTableEnabled: true,
    });

    const { administrator } = await companyAdministratorsFactory.create({
      companyId: company.id,
    });
    const user = await db.query.users
      .findFirst({
        where: eq(users.id, administrator.userId),
      })
      .then(takeOrThrow);

    await login(page, user);

    await page.getByRole("link", { name: "Equity" }).click();
    await page.getByRole("tab", { name: "Tender offers" }).click();
    await page.getByRole("link", { name: "New tender offer" }).click();

    await page.getByLabel("Minimum valuation").fill("100000000");
    await page.getByLabel("Start date").fill("2022-08-08");
    await page.getByLabel("End date").fill("2022-09-09");
    await page.getByLabel("Attachment").setInputFiles("e2e/samples/sample.zip");

    await page.getByRole("button", { name: "Create tender offer" }).click();
    await expect(page.getByText("There are no tender offers yet.")).toBeVisible();
    await page.reload();

    await expect(
      page.getByRole("row", {
        name: /Aug 8, 2022.*Sep 9, 2022.*\$100,000,000/u,
      }),
    ).toBeVisible();
  });
});
