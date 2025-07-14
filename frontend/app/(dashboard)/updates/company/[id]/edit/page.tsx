"use client";
import { useParams } from "next/navigation";
import React from "react";
import { useCurrentCompany } from "@/global";
import { trpc } from "@/trpc/client";
import EditPage from "../../Edit";

export default function Edit() {
  const company = useCurrentCompany();
  const { id } = useParams<{ id: string }>();
  const [update] = trpc.companyUpdates.get.useSuspenseQuery({ companyId: company.id, id });

  return (
    <>
      <header className="pt-2 md:pt-4">
        <div className="grid gap-y-8">
          <div className="grid items-center justify-between gap-3 md:flex">
            <h1 className="text-sm font-bold">Edit company update</h1>
          </div>
        </div>
      </header>

      <EditPage update={update} />
    </>
  );
}
