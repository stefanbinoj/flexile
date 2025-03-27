import { db } from "@test/db";
import { companiesFactory } from "@test/factories/companies";
import { companyContractorsFactory } from "@test/factories/companyContractors";
import { addDays } from "date-fns";
import { companyContractorAbsences } from "@/db/schema";
import { assert } from "@/utils/assert";

export const companyContractorAbsencesFactory = {
  create: async (overrides: Partial<typeof companyContractorAbsences.$inferInsert> = {}) => {
    const today = new Date();
    const [absence] = await db
      .insert(companyContractorAbsences)
      .values({
        companyContractorId:
          overrides.companyContractorId || (await companyContractorsFactory.create()).companyContractor.id,
        companyId: overrides.companyId || (await companiesFactory.create()).company.id,
        startsOn: overrides.startsOn || today.toDateString(),
        endsOn: overrides.endsOn || addDays(today, 1).toDateString(),
        ...overrides,
      })
      .returning();
    assert(absence != null);

    return { absence };
  },
};
