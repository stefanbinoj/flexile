"use client";
import { useUserStore } from "@/global";
import logo from "@/images/flexile-logo.svg";
import Image from "next/image";
import { redirect, RedirectType, usePathname, useSearchParams } from "next/navigation";
import React, { useEffect } from "react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = useUserStore((state) => state.user);
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const isValidRedirectUrl = (url: string) => url.startsWith("/") && !url.startsWith("//");
  const showHeader = pathname === "/login";
  useEffect(() => {
    if (user) {
      const redirectUrl = searchParams.get("redirect_url");
      const targetUrl = redirectUrl && isValidRedirectUrl(redirectUrl) ? redirectUrl : "/dashboard";
      throw redirect(targetUrl, RedirectType.replace);
    }
  }, [user, searchParams]);

  return (
    <div className="flex h-full flex-col">
      {!showHeader && (
        <header className="flex w-full items-center justify-center bg-black p-6 text-white print:hidden">
          <a href="https://flexile.com/" className="invert">
            <Image src={logo} alt="Flexile" />
          </a>
        </header>
      )}
      <main className="flex flex-1 flex-col items-center overflow-y-auto px-3 py-3">
        <div className="my-auto grid w-full max-w-md gap-4 print:my-0 print:max-w-full">{children}</div>
      </main>
    </div>
  );
}
