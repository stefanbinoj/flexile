import { eq } from "drizzle-orm";
import { db } from "@/db";
import { companyRoles } from "@/db/schema";
import ogImage from "../ogImage";
export const contentType = "image/png";

export default async function Image({ params }: { params: { slug: string; id: string } }) {
  const [_, roleId] = params.id.split(/-(?=[^-]*$)/u);
  if (!roleId) return new Response("Not found", { status: 404 });
  const role = await db.query.companyRoles.findFirst({
    where: eq(companyRoles.externalId, roleId),
    with: { company: true },
  });
  if (!role) return new Response("Not found", { status: 404 });

  return ogImage(
    role.company,
    <div tw="flex-col items-center" style={{ display: "flex" }}>
      <div tw="text-7xl mb-6 font-bold">{`${role.name} at ${role.company.name}`}</div>
      <div tw="rounded-full bg-black p-6 text-white text-2xl">Apply now</div>
    </div>,
  );
}
