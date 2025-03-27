import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { expenseCards, users } from "@/db/schema";
import { stripe, STRIPE_API_VERSION } from "@/lib/stripe";
import { companyProcedure, createRouter } from "@/trpc";
import { policies } from "@/trpc/access";
import { assertDefined } from "@/utils/assert";
import { expenseCardChargesRouter } from "./charges";

export const expenseCardsRouter = createRouter({
  getActive: companyProcedure.query(async ({ ctx }) => {
    if (!ctx.companyContractor || !ctx.company.expenseCardsEnabled) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const card = await db.query.expenseCards.findFirst({
      columns: {
        processorReference: true,
        processor: true,
        cardLast4: true,
        cardExpMonth: true,
        cardExpYear: true,
        cardBrand: true,
      },
      where: and(eq(expenseCards.companyContractorId, ctx.companyContractor.id), eq(expenseCards.active, true)),
    });

    return { card };
  }),

  create: companyProcedure.mutation(async ({ ctx }) => {
    if (!ctx.companyContractor || !policies["expenseCards.create"](ctx)) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const activeCardRow = await db.query.expenseCards.findFirst({
      where: and(eq(expenseCards.companyContractorId, ctx.companyContractor.id), eq(expenseCards.active, true)),
    });
    if (activeCardRow) throw new TRPCError({ code: "FORBIDDEN" });

    const cardHolderId = await createOrGetCardholder(ctx.user, ctx.ipAddress, ctx.userAgent);
    const spendingLimitCents = ctx.companyContractor.role.expenseCardSpendingLimitCents;
    const stripeCard = await stripe.issuing.cards.create({
      cardholder: cardHolderId,
      currency: "usd",
      type: "virtual",
      status: "active",
      spending_controls: {
        spending_limits: spendingLimitCents ? [{ amount: Number(spendingLimitCents), interval: "monthly" }] : [],
      },
      metadata: { company_contractor_id: Number(ctx.companyContractor.id) },
    });

    await db.insert(expenseCards).values({
      companyContractorId: ctx.companyContractor.id,
      companyRoleId: ctx.companyContractor.companyRoleId,
      processorReference: stripeCard.id,
      processor: "stripe",
      cardLast4: stripeCard.last4,
      cardExpMonth: stripeCard.exp_month.toString(),
      cardExpYear: stripeCard.exp_year.toString(),
      cardBrand: stripeCard.brand,
      active: true,
    });
  }),

  createStripeEphemeralKey: companyProcedure
    .input(z.object({ nonce: z.string(), processorReference: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.companyContractor || !ctx.company.expenseCardsEnabled) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const cardRow = await db.query.expenseCards.findFirst({
        where: and(
          eq(expenseCards.companyContractorId, ctx.companyContractor.id),
          eq(expenseCards.processorReference, input.processorReference),
          eq(expenseCards.processor, "stripe"),
        ),
      });

      if (!cardRow) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const { secret } = await stripe.ephemeralKeys.create(
        {
          issuing_card: input.processorReference,
          nonce: input.nonce,
        },
        { apiVersion: STRIPE_API_VERSION },
      );
      return { secret };
    }),
  charges: expenseCardChargesRouter,
});

async function createOrGetCardholder(userRow: typeof users.$inferSelect, ipAddress: string, userAgent: string) {
  const existingCardholders = await stripe.issuing.cardholders.list({
    email: userRow.email,
    status: "active",
    limit: 1,
  });

  if (existingCardholders.data[0]) {
    return existingCardholders.data[0].id;
  }

  const [firstName, ...lastNameParts] = assertDefined(userRow.legalName).split(" ");
  const lastName = lastNameParts.join(" ");

  const newCardholder = await stripe.issuing.cardholders.create({
    type: "individual",
    name: assertDefined(userRow.legalName),
    email: userRow.email,
    status: "active",
    individual: {
      first_name: assertDefined(firstName),
      last_name: lastName,
      card_issuing: {
        user_terms_acceptance: {
          date: Math.floor(Date.now() / 1000),
          ip: ipAddress,
          user_agent: userAgent,
        },
      },
    },
    billing: {
      address: {
        line1: assertDefined(userRow.streetAddress),
        city: assertDefined(userRow.city),
        state: assertDefined(userRow.state),
        postal_code: assertDefined(userRow.zipCode),
        country: assertDefined(userRow.countryCode),
      },
    },
  });

  return newCardholder.id;
}
