"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import React from "react";
import DividendStatusIndicator from "@/app/(dashboard)/equity/DividendStatusIndicator";
import DataTable, { createColumnHelper, useTable } from "@/components/DataTable";
import { useCurrentCompany } from "@/global";
import type { RouterOutput } from "@/trpc";
import { trpc } from "@/trpc/client";
import { formatMoneyFromCents } from "@/utils/formatMoney";

type Dividend = RouterOutput["dividends"]["list"][number];
const rowLink = (row: Dividend) => `/people/${row.investor.user.id}?tab=dividends` as const;
const columnHelper = createColumnHelper<Dividend>();
const columns = [
  columnHelper.accessor("investor.user.name", {
    header: "Recipient",
    cell: (info) => (
      <Link href={rowLink(info.row.original)} className="no-underline">
        <strong>{info.getValue()}</strong>
      </Link>
    ),
  }),
  columnHelper.simple("numberOfShares", "Shares", (value) => value?.toLocaleString(), "numeric"),
  columnHelper.simple("totalAmountInCents", "Amount", formatMoneyFromCents, "numeric"),
  columnHelper.accessor("status", {
    header: "Status",
    cell: (info) => <DividendStatusIndicator dividend={info.row.original} />,
  }),
];

export default function DividendRound() {
  const { id } = useParams<{ id: string }>();
  const company = useCurrentCompany();
  const router = useRouter();
  const [data] = trpc.dividends.list.useSuspenseQuery({
    companyId: company.id,
    dividendRoundId: Number(id),
  });

  const table = useTable({ columns, data });

  return (
    <>
      <header className="pt-2 md:pt-4">
        <div className="grid gap-y-8">
          <div className="grid items-center justify-between gap-3 md:flex">
            <h1 className="text-sm font-bold">Dividends</h1>
          </div>
        </div>
      </header>
      <DataTable table={table} onRowClicked={(row) => router.push(rowLink(row))} />
    </>
  );
}
