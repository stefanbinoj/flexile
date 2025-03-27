import { faker } from "@faker-js/faker";
import { db } from "@test/db";
import { usersFactory } from "@test/factories/users";
import { contractorProfiles } from "@/db/schema";

export const contractorProfilesFactory = {
  create: async (overrides: Partial<typeof contractorProfiles.$inferInsert> = {}) => {
    const [contractorProfile] = await db
      .insert(contractorProfiles)
      .values({
        userId: overrides.userId || (await usersFactory.create()).user.id,
        availableForHire: true,
        availableHoursPerWeek: faker.number.int({ min: 1, max: 35 }),
        description: faker.lorem.sentence(),
        ...overrides,
      })
      .returning();

    return { contractorProfile };
  },
};
