import { db } from "@test/db";
import { companyContractorsFactory } from "@test/factories/companyContractors";
import { companyContractorUpdateTasksFactory } from "@test/factories/companyContractorUpdateTasks";
import { endsOn, startsOn } from "@test/helpers/date";
import { eq } from "drizzle-orm";
import { companyContractors, companyContractorUpdates } from "@/db/schema";
import { assert } from "@/utils/assert";

export const companyContractorUpdatesFactory = {
  create: async (overrides: Partial<typeof companyContractorUpdates.$inferInsert> = {}) => {
    const periodStartsOn = overrides.periodStartsOn || startsOn(new Date()).toDateString();
    const contractor = overrides.companyContractorId
      ? await db.query.companyContractors.findFirst({
          where: eq(companyContractors.id, overrides.companyContractorId),
        })
      : (
          await companyContractorsFactory.create({
            ...(overrides.companyId ? { companyId: overrides.companyId } : {}),
          })
        ).companyContractor;
    assert(contractor !== undefined);

    const [update] = await db
      .insert(companyContractorUpdates)
      .values({
        companyContractorId: contractor.id,
        companyId: contractor.companyId,
        periodStartsOn,
        periodEndsOn: overrides.periodEndsOn || endsOn(new Date(periodStartsOn)).toDateString(),
        publishedAt: overrides.publishedAt || new Date(),
        ...overrides,
      })
      .returning();
    assert(update != null);

    return update;
  },

  createWithTasks: async (overrides: Partial<typeof companyContractorUpdates.$inferInsert> = {}) => {
    const update = await companyContractorUpdatesFactory.create(overrides);
    await companyContractorUpdateTasksFactory.create({ companyContractorUpdateId: update.id });
    await companyContractorUpdateTasksFactory.create({ companyContractorUpdateId: update.id });
    return update;
  },
};
