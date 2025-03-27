import { clerk } from "@clerk/testing/playwright";
import { type Page } from "@playwright/test";
import { db } from "@test/db";
import { eq } from "drizzle-orm";
import { users } from "@/db/schema";

export const clerkTestId = "user_2rV0f8ymVAsk3S0V6EhfSiQcGbK";
export const clerkTestEmail = "hi1+clerk_test@example.com";
export const login = async (page: Page, user: typeof users.$inferSelect) => {
  await db.update(users).set({ clerkId: null });
  await db.update(users).set({ clerkId: clerkTestId }).where(eq(users.id, user.id));
  await page.goto("/login");

  await clerk.signIn({ page, signInParams: { strategy: "email_code", identifier: clerkTestEmail } });
  await page.waitForURL(/^(?!.*\/login$).*/u);
};
