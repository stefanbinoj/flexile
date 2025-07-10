"use client";
import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import { navLinks } from ".";
import { useCurrentCompany, useCurrentUser } from "@/global";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useLayoutStore } from "@/components/layouts/LayoutStore";

const Layout = ({ children, headerActions }: { children: React.ReactNode; headerActions?: React.ReactNode }) => {
  const pathname = usePathname();
  const user = useCurrentUser();
  const company = useCurrentCompany();
  const currentLink = navLinks(user, company).find((link) => link.route === pathname);

  const title = (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>Equity</BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{currentLink?.label}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
  const setTitle = useLayoutStore((state) => state.setTitle);
  const setHeaderActions = useLayoutStore((state) => state.setHeaderActions);
  useEffect(() => {
    setTitle(title);
    setHeaderActions(headerActions);
  }, [title, headerActions]);

  return children;
};

export default Layout;
