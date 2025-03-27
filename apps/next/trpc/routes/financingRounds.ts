import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { financingRounds } from "@/db/schema";
import { companyProcedure, createRouter } from "@/trpc";

export const financingRoundsRouter = createRouter({
  list: companyProcedure.query(async ({ ctx }) => {
    if (!ctx.company.financingRoundsEnabled || !(ctx.companyAdministrator || ctx.companyLawyer || ctx.companyInvestor))
      throw new TRPCError({ code: "FORBIDDEN" });

    return await db.query.financingRounds.findMany({
      columns: {
        name: true,
        issuedAt: true,
        sharesIssued: true,
        pricePerShareCents: true,
        amountRaisedCents: true,
        postMoneyValuationCents: true,
        investors: true,
      },
      where: eq(financingRounds.companyId, ctx.company.id),
      orderBy: [desc(financingRounds.issuedAt)],
    });
  }),
});
