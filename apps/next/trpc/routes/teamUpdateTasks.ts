import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gt, inArray, lt, lte } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { companyContractorUpdates, companyContractorUpdateTasks, integrationRecords, invoices } from "@/db/schema";
import { companyProcedure, createRouter } from "@/trpc";

export const githubIntegrationJsonDataSchema = z
  .object({
    description: z.string(),
    resource_id: z.string(),
    url: z.string(),
  })
  .and(
    z.discriminatedUnion("resource_name", [
      z.object({ resource_name: z.literal("issues"), status: z.enum(["open", "closed"]) }),
      z.object({ resource_name: z.literal("pulls"), status: z.enum(["open", "closed", "merged", "draft"]) }),
    ]),
  );

export const teamUpdateTasksRouter = createRouter({
  listForInvoice: companyProcedure.input(z.object({ invoiceId: z.string() })).query(async ({ input, ctx }) => {
    if (!ctx.companyAdministrator) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const invoice = await db.query.invoices.findFirst({
      where: and(eq(invoices.externalId, input.invoiceId), eq(invoices.companyId, ctx.company.id)),
    });

    if (!invoice) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    const previousInvoice = await db.query.invoices.findFirst({
      where: and(
        eq(invoices.companyContractorId, invoice.companyContractorId),
        lt(invoices.invoiceDate, invoice.invoiceDate),
      ),
      orderBy: [desc(invoices.invoiceDate)],
    });

    const rows = await db.query.companyContractorUpdateTasks.findMany({
      columns: { id: true, name: true, completedAt: true, createdAt: true },
      where: and(
        inArray(
          companyContractorUpdateTasks.companyContractorUpdateId,
          db
            .select({ id: companyContractorUpdates.id })
            .from(companyContractorUpdates)
            .where(eq(companyContractorUpdates.companyContractorId, invoice.companyContractorId)),
        ),
        previousInvoice ? gt(companyContractorUpdateTasks.createdAt, new Date(previousInvoice.invoiceDate)) : undefined,
        lte(companyContractorUpdateTasks.createdAt, new Date(invoice.invoiceDate)),
      ),
      orderBy: [asc(companyContractorUpdateTasks.createdAt)],
    });
    const integrationsRows = await db.query.integrationRecords.findMany({
      with: { integration: true },
      where: and(
        eq(integrationRecords.integratableType, "CompanyWorkerUpdateTask"),
        inArray(
          integrationRecords.integratableId,
          rows.map((task) => task.id),
        ),
      ),
    });
    const integrations = new Map(integrationsRows.map((record) => [record.integratableId, record]));
    return rows.map((task) => {
      const integrationRecord = integrations.get(task.id);
      const jsonData = integrationRecord && githubIntegrationJsonDataSchema.parse(integrationRecord.jsonData);
      return {
        ...task,
        integrationRecord: jsonData
          ? { id: integrationRecord.id, external_id: integrationRecord.integrationExternalId, ...jsonData }
          : null,
      };
    });
  }),
});
