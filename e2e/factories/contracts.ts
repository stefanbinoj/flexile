import { db } from "@test/db";
import { companyAdministratorsFactory } from "@test/factories/companyAdministrators";
import { companyContractorsFactory } from "@test/factories/companyContractors";
import { eq } from "drizzle-orm";
import { companyAdministrators, companyContractors, contracts, users } from "@/db/schema";
import { assert } from "@/utils/assert";

const CONSULTING_CONTRACT_NAME = "Consulting Agreement";

type CreateOptions = {
  signed?: boolean;
};

export const contractsFactory = {
  create: async (overrides: Partial<typeof contracts.$inferInsert> = {}, options: CreateOptions = {}) => {
    const administrator = overrides.companyAdministratorId
      ? await db.query.companyAdministrators.findFirst({
          where: eq(companyAdministrators.id, overrides.companyAdministratorId),
        })
      : (await companyAdministratorsFactory.create()).administrator;
    assert(administrator != null, "Administrator is required");

    const administratorUser = await db.query.users.findFirst({
      where: eq(users.id, administrator.userId),
    });
    assert(administratorUser !== undefined);

    const contractor = overrides.companyContractorId
      ? await db.query.companyContractors.findFirst({
          where: eq(companyContractors.id, overrides.companyContractorId),
        })
      : (await companyContractorsFactory.create({ companyId: administrator.companyId })).companyContractor;
    assert(contractor !== undefined);

    const contractorUser = await db.query.users.findFirst({
      where: eq(users.id, contractor.userId),
    });
    assert(contractorUser !== undefined);

    const [contract] = await db
      .insert(contracts)
      .values({
        companyAdministratorId: administrator.id,
        companyId: administrator.companyId,
        companyContractorId: contractor.id,
        userId: contractor.userId,
        name: CONSULTING_CONTRACT_NAME,
        signedAt: options.signed ? new Date() : null,
        administratorSignature: administratorUser.legalName ?? "",
        contractorSignature: options.signed ? contractorUser.legalName : null,
        ...overrides,
      })
      .returning();

    return { contract };
  },

  createSigned: async (
    overrides: Partial<typeof contracts.$inferInsert> = {},
    options: CreateOptions = { signed: true },
  ) => contractsFactory.create(overrides, options),

  createUnsigned: async (
    overrides: Partial<typeof contracts.$inferInsert> = {},
    options: CreateOptions = { signed: false },
  ) => contractsFactory.create(overrides, options),
};
