"use client";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import React from "react";
import DataTable, { createColumnHelper, useTable } from "@/components/DataTable";
import Placeholder from "@/components/Placeholder";
import { useCurrentCompany, useCurrentUser } from "@/global";
import type { RouterOutput } from "@/trpc";
import { trpc } from "@/trpc/client";
import { formatMoney, formatMoneyFromCents } from "@/utils/formatMoney";
import { formatDate } from "@/utils/time";
import { usePathname } from "next/navigation";
import { navLinks } from "@/app/(dashboard)/equity";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const columnHelper = createColumnHelper<RouterOutput["shareHoldings"]["list"][number]>();
const columns = [
  columnHelper.simple("issuedAt", "Issue date", formatDate),
  columnHelper.simple("shareClassName", "Type"),
  columnHelper.simple("numberOfShares", "Number of shares", (value) => value.toLocaleString(), "numeric"),
  columnHelper.simple("sharePriceUsd", "Share price", (value) => formatMoney(value, { precise: true }), "numeric"),
  columnHelper.simple("totalAmountInCents", "Cost", formatMoneyFromCents, "numeric"),
];

export default function Shares() {
  const company = useCurrentCompany();
  const user = useCurrentUser();
  const pathname = usePathname();
  const [shareHoldings] = trpc.shareHoldings.list.useSuspenseQuery({
    companyId: company.id,
    investorId: user.roles.investor?.id ?? "",
  });

  const table = useTable({ data: shareHoldings, columns });
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

      {shareHoldings.length > 0 ? (
        <DataTable table={table} />
      ) : (
        <Placeholder icon={CheckCircleIcon}>You do not hold any shares.</Placeholder>
      )}
    </>
  );
}
