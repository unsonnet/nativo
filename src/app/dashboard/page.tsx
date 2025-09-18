"use client";

import { Header } from "@/components/Header";
import { ReportsGrid } from "@/components/ReportsGrid";
import { FloatingAddButton } from "@/components/FloatingAddButton";

export default function DashboardPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <Header />
      <main className="flex-1">
        <ReportsGrid />
      </main>
      <FloatingAddButton />
    </div>
  );
}
