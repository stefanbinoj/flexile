import { faker } from "@faker-js/faker";
import { db } from "@test/db";
import { companyContractorUpdatesFactory } from "@test/factories/companyContractorUpdates";
import { merge } from "lodash-es";
import { companyContractorUpdateTasks, integrationRecords } from "@/db/schema";
import { assert } from "@/utils/assert";

export const companyContractorUpdateTasksFactory = {
  create: async (overrides: Partial<typeof companyContractorUpdateTasks.$inferInsert> = {}) => {
    const [updateTask] = await db
      .insert(companyContractorUpdateTasks)
      .values({
        name: faker.person.jobTitle(),
        companyContractorUpdateId:
          overrides.companyContractorUpdateId || (await companyContractorUpdatesFactory.create()).id,
        position: 0,
        ...overrides,
      })
      .returning();
    assert(updateTask != null);

    return updateTask;
  },
  createCompleted: async (overrides: Partial<typeof companyContractorUpdateTasks.$inferInsert> = {}) =>
    companyContractorUpdateTasksFactory.create({
      completedAt: new Date(),
      ...overrides,
    }),
};

export const githubIntegrationRecordForTaskFactory = {
  create: async (
    task: typeof companyContractorUpdateTasks.$inferSelect,
    overrides: Partial<typeof integrationRecords.$inferInsert> = {},
  ) => {
    assert(!!task);

    const [integrationRecord] = await db
      .insert(integrationRecords)
      .values(
        merge(
          {
            integrationId: 1n,
            integrationExternalId: "fake_external_id",
            integratableType: "CompanyWorkerUpdateTask",
            integratableId: task.id,
            jsonData: {
              url: "https://github.com/anti-work-test/flexile/pull/8",
              status: "merged",
              description: "Merged PR",
              external_id: "PR_kwDONtYg7s6IghR6",
              resource_id: "8",
              resource_name: "pulls",
            },
          },
          overrides,
        ),
      )
      .returning();
    assert(integrationRecord != null);

    return integrationRecord;
  },
};
