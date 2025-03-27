import { db } from "@test/db";
import { companiesFactory } from "@test/factories/companies";
import { integrations } from "@/db/schema";
import { assert } from "@/utils/assert";

export const githubIntegrationsFactory = {
  create: async (overrides: Partial<typeof integrations.$inferInsert> = {}) => {
    const [integration] = await db
      .insert(integrations)
      .values({
        type: "GithubIntegration",
        accountId: "1855287",
        companyId: overrides.companyId || (await companiesFactory.create()).company.id,
        configuration: {
          access_token: "gho_aGogSNKXswlREuTd3NLISAMPLE",
          organizations: ["antiwork"],
          webhooks: [{ id: "1234567890", organization: "antiwork" }],
        },
        ...overrides,
      })
      .returning();
    assert(integration != null);

    return { integration };
  },
};
