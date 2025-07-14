"use client";
import { CircleCheck } from "lucide-react";
import React from "react";
import DataTable, { createColumnHelper, useTable } from "@/components/DataTable";
import Placeholder from "@/components/Placeholder";
import { Progress } from "@/components/ui/progress";
import { useCurrentCompany, useCurrentUser } from "@/global";
import type { RouterOutput } from "@/trpc";
import { trpc } from "@/trpc/client";
import { usePathname } from "next/navigation";
import { navLinks } from "@/app/(dashboard)/equity";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type OptionPool = RouterOutput["optionPools"]["list"][number];

const columnHelper = createColumnHelper<OptionPool>();
const columns = [
  columnHelper.simple("name", "Name", (value) => <strong>{value}</strong>),
  columnHelper.simple("authorizedShares", "Authorized shares", (value) => value.toLocaleString(), "numeric"),
  columnHelper.simple("issuedShares", "Issued shares", (value) => value.toLocaleString(), "numeric"),
  columnHelper.display({
    id: "progress",
    cell: (info) => (
      <Progress max={Number(info.row.original.authorizedShares)} value={Number(info.row.original.issuedShares)} />
    ),
  }),
  columnHelper.simple("availableShares", "Available shares", (value) => value.toLocaleString(), "numeric"),
];

export default function OptionPools() {
  const company = useCurrentCompany();
  const user = useCurrentUser();
  const pathname = usePathname();
  const [data] = trpc.optionPools.list.useSuspenseQuery({ companyId: company.id });

  const table = useTable({ columns, data });
  const currentLink = navLinks(user, company).find((link) => link.route === pathname);

  return (
    <>
      {!!currentLink && (
        <header className="pt-2 md:pt-4">
          <div className="grid gap-y-8">
            <div className="grid items-center justify-between gap-3 md:flex">
              <h1 className="text-sm font-bold">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>Equity</BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{currentLink.label}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </h1>
            </div>
          </div>
        </header>
      )}
      {data.length > 0 ? (
        <DataTable table={table} />
      ) : (
        <Placeholder icon={CircleCheck}>The company does not have any option pools.</Placeholder>
      )}
    </>
  );
}
