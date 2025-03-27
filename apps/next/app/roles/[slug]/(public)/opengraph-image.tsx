import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { companies, companyRoles } from "@/db/schema";
import ogImage from "./ogImage";
export const contentType = "image/png";

export default async function Image({ params }: { params: { slug: string } }) {
  const [_, companyId] = params.slug.split(/-(?=[^-]*$)/u);
  if (!companyId) return new Response("Not found", { status: 404 });
  const company = await db.query.companies.findFirst({
    where: eq(companies.externalId, companyId),
    extras: {
      // using sql here to work around https://github.com/drizzle-team/drizzle-orm/issues/3564
      rolesCount: db.$count(companyRoles, eq(sql`company_id`, companies.id)).as("roles_count"),
    },
  });
  if (!company) return new Response("Not found", { status: 404 });

  return ogImage(
    company,
    <div tw="flex-col items-center" style={{ display: "flex" }}>
      <div tw="text-7xl mb-6 font-bold">
        {`${company.rolesCount} open ${company.rolesCount === 1 ? "role" : "roles"} at ${company.name}`}
      </div>
      <div tw="rounded-full bg-black p-6 text-white text-2xl">Explore jobs</div>
    </div>,
  );
}
