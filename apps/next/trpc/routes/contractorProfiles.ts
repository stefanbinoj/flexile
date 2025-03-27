import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { pick } from "lodash-es";
import { z } from "zod";
import { byExternalId, db } from "@/db";
import { companies, companyContractors, companyRoles, contractorProfiles, users } from "@/db/schema";
import { createRouter, protectedProcedure } from "@/trpc";

export const contractorProfilesRouter = createRouter({
  list: protectedProcedure.input(z.object({ excludeCompanyId: z.string().optional() })).query(async ({ input }) => {
    const sameCompanyContractor = alias(companyContractors, "same_company_contractor");
    return await db
      .select({
        ...pick(contractorProfiles, "availableHoursPerWeek", "description"),
        id: contractorProfiles.externalId,
        ...pick(users, "preferredName", "countryCode"),
        role: companyRoles.name,
        ...pick(companyContractors, "payRateInSubunits", "payRateType"),
      })
      .from(contractorProfiles)
      .innerJoin(users, eq(contractorProfiles.userId, users.id))
      .innerJoin(companyContractors, and(eq(users.id, companyContractors.userId), isNull(companyContractors.endedAt)))
      .innerJoin(companyRoles, eq(companyContractors.companyRoleId, companyRoles.id))
      .leftJoin(
        sameCompanyContractor,
        and(
          eq(users.id, sameCompanyContractor.userId),
          isNull(sameCompanyContractor.endedAt),
          eq(sameCompanyContractor.companyId, byExternalId(companies, input.excludeCompanyId ?? "")),
        ),
      )
      .where(
        and(eq(contractorProfiles.availableForHire, true), isNull(sameCompanyContractor.id).if(input.excludeCompanyId)),
      );
  }),

  get: protectedProcedure.input(z.object({ id: z.string().optional() })).query(async ({ ctx, input }) => {
    const [result] = await db
      .select({
        id: contractorProfiles.externalId,
        ...pick(contractorProfiles, "availableHoursPerWeek", "description", "availableForHire"),
        ...pick(users, "preferredName", "countryCode", "email"),
        role: companyRoles.name,
        ...pick(companyContractors, "payRateInSubunits", "payRateType"),
      })
      .from(contractorProfiles)
      .innerJoin(users, eq(contractorProfiles.userId, users.id))
      .innerJoin(companyContractors, eq(users.id, companyContractors.userId))
      .innerJoin(companyRoles, eq(companyContractors.companyRoleId, companyRoles.id))
      .where(
        input.id
          ? and(eq(contractorProfiles.externalId, input.id), eq(contractorProfiles.availableForHire, true))
          : eq(contractorProfiles.userId, BigInt(ctx.userId)),
      );

    if (!result) throw new TRPCError({ code: "NOT_FOUND" });
    return result;
  }),
});
