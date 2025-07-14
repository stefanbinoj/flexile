"use client";
import React from "react";
import EditPage from "../Edit";

export default function New() {
  return (
    <>
      <header className="pt-2 md:pt-4">
        <div className="grid gap-y-8">
          <div className="grid items-center justify-between gap-3 md:flex">
            <h1 className="text-sm font-bold">New company update</h1>
          </div>
        </div>
      </header>

      <EditPage />
    </>
  );
}
