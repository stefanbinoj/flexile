import { TRPCError } from "@trpc/server";
import { endOfWeek, formatISO } from "date-fns";
import { and, asc, desc, eq, inArray, isNotNull, notInArray } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { byExternalId, db } from "@/db";
import {
  companyContractors,
  companyContractorUpdates,
  companyContractorUpdateTasks,
  integrationRecords,
} from "@/db/schema";
import { companyProcedure, createRouter } from "@/trpc";
import { assert } from "@/utils/assert";
import { isActive } from "./contractors";
import { companyIntegration as companyGithubIntegration } from "./github";
import { githubIntegrationJsonDataSchema } from "./teamUpdateTasks";

export const teamUpdatesRouter = createRouter({
  list: companyProcedure
    .input(z.object({ contractorId: z.string().optional(), period: z.array(z.string()).optional() }))
    .query(async ({ input, ctx }) => {
      if (!ctx.companyAdministrator && !isActive(ctx.companyContractor)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return await getUpdateList({ companyId: ctx.company.id, contractorId: input.contractorId, period: input.period });
    }),
  set: companyProcedure
    .input(
      z.object({
        periodStartsOn: z.string(),
        tasks: z.array(
          createInsertSchema(companyContractorUpdateTasks)
            .pick({ name: true, completedAt: true })
            .extend({
              id: z.bigint().nullable(),
              integrationRecord: githubIntegrationJsonDataSchema
                .and(z.object({ id: z.bigint().nullable(), external_id: z.string() }))
                .nullable(),
            }),
        ),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await db.transaction(async (tx) => {
        if (!isActive(ctx.companyContractor)) throw new TRPCError({ code: "FORBIDDEN" });
        const [update] = await tx
          .insert(companyContractorUpdates)
          .values({
            companyId: ctx.company.id,
            periodStartsOn: input.periodStartsOn,
            periodEndsOn: formatISO(endOfWeek(input.periodStartsOn), { representation: "date" }),
            companyContractorId: ctx.companyContractor.id,
            publishedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [companyContractorUpdates.companyContractorId, companyContractorUpdates.periodStartsOn],
            set: { publishedAt: new Date() },
          })
          .returning();
        if (!update) throw new TRPCError({ code: "FORBIDDEN" });
        const deleted = await tx
          .delete(companyContractorUpdateTasks)
          .where(
            and(
              eq(companyContractorUpdateTasks.companyContractorUpdateId, update.id),
              notInArray(
                companyContractorUpdateTasks.id,
                input.tasks.flatMap((task) => task.id ?? []),
              ),
            ),
          )
          .returning();
        await tx
          .delete(integrationRecords)
          .where(
            and(
              eq(integrationRecords.integratableType, "CompanyWorkerUpdateTask"),
              inArray(
                integrationRecords.integratableId,
                deleted
                  .map((task) => task.id)
                  .concat(input.tasks.flatMap((task) => (task.id && !task.integrationRecord ? task.id : []))),
              ),
            ),
          );
        const githubIntegration = await tx.query.integrations.findFirst({
          columns: { id: true },
          where: companyGithubIntegration(ctx.company.id),
        });
        for (const [index, task] of input.tasks.entries()) {
          const data = {
            position: index,
            name: task.name,
            completedAt: task.completedAt,
          };
          let taskId = task.id;
          if (taskId) {
            const [updated] = await tx
              .update(companyContractorUpdateTasks)
              .set(data)
              .where(
                and(
                  eq(companyContractorUpdateTasks.id, taskId),
                  eq(companyContractorUpdateTasks.companyContractorUpdateId, update.id),
                ),
              )
              .returning();
            if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
          } else {
            const [inserted] = await tx
              .insert(companyContractorUpdateTasks)
              .values({ companyContractorUpdateId: update.id, ...data })
              .returning();
            assert(inserted != null);
            taskId = inserted.id;
          }
          if (githubIntegration && task.integrationRecord) {
            const { id, ...integrationRecord } = task.integrationRecord;
            if (id) {
              const [updated] = await tx
                .update(integrationRecords)
                .set({ integrationExternalId: integrationRecord.external_id, jsonData: integrationRecord })
                .where(
                  and(
                    eq(integrationRecords.integratableType, "CompanyWorkerUpdateTask"),
                    eq(integrationRecords.integratableId, taskId),
                    eq(integrationRecords.id, id),
                  ),
                )
                .returning();
              if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
            } else {
              await tx.insert(integrationRecords).values({
                integrationId: githubIntegration.id,
                integrationExternalId: integrationRecord.external_id,
                integratableType: "CompanyWorkerUpdateTask",
                integratableId: taskId,
                jsonData: integrationRecord,
              });
            }
          }
        }
      });
    }),
});

export const getUpdateList = async ({
  companyId,
  contractorId,
  period,
}: {
  companyId: bigint;
  contractorId?: string | undefined;
  period: string[] | undefined;
}) => {
  const rows = await db.query.companyContractorUpdates.findMany({
    columns: { id: true, periodStartsOn: true, periodEndsOn: true, publishedAt: true, companyContractorId: true },
    with: {
      tasks: {
        columns: { id: true, name: true, completedAt: true },
        orderBy: [asc(companyContractorUpdateTasks.position)],
      },
    },
    where: and(
      isNotNull(companyContractorUpdates.publishedAt),
      eq(companyContractorUpdates.companyId, companyId),
      period ? inArray(companyContractorUpdates.periodStartsOn, period) : undefined,
      contractorId
        ? eq(companyContractorUpdates.companyContractorId, byExternalId(companyContractors, contractorId))
        : undefined,
    ),
    orderBy: [desc(companyContractorUpdates.publishedAt)],
  });
  const integrationsRows = await db.query.integrationRecords.findMany({
    with: { integration: true },
    where: and(
      eq(integrationRecords.integratableType, "CompanyWorkerUpdateTask"),
      inArray(
        integrationRecords.integratableId,
        rows.flatMap((update) => update.tasks.map((task) => task.id)),
      ),
    ),
  });
  const integrations = new Map(integrationsRows.map((record) => [record.integratableId, record]));
  return rows.map((update) => ({
    ...update,
    tasks: update.tasks.map((task) => {
      const integrationRecord = integrations.get(task.id);
      const jsonData = integrationRecord && githubIntegrationJsonDataSchema.parse(integrationRecord.jsonData);
      return {
        ...task,
        integrationRecord: jsonData
          ? { id: integrationRecord.id, external_id: integrationRecord.integrationExternalId, ...jsonData }
          : null,
      };
    }),
  }));
};
