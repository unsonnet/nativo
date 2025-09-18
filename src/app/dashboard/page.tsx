"use client";

import { FloatingAddButton } from "@/components/FloatingAddButton";
import { Header } from "@/components/Header";
import { ReportsGrid } from "@/components/ReportsGrid";

export default function DashboardPage() {
  return (
    <div className="dashboard">
      <Header />
      <main className="dashboard__main">
        <ReportsGrid />
      </main>
      <FloatingAddButton />
    </div>
  );
}
