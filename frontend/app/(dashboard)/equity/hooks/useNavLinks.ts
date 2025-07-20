import { usePathname } from "next/navigation";
import { navLinks } from "@/app/(dashboard)/equity";
import { useCurrentCompany, useCurrentUser } from "@/global";

export function useNavLinks() {
  const company = useCurrentCompany();
  const user = useCurrentUser();
  const pathname = usePathname();
  const currentLink = navLinks(user, company).find((link) => link.route === pathname);

  return {
    currentLink,
  };
}
