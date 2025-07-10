"use client";
import { useLayoutStore } from "@/components/layouts/LayoutStore";
import React, { useEffect } from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const setTitle = useLayoutStore((state) => state.setTitle);
  const setHeaderActions = useLayoutStore((state) => state.setHeaderActions);
  useEffect(() => {
    setTitle("Dividend");
    setHeaderActions(null);
  }, []);
  return children;
}
