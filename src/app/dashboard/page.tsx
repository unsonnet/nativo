"use client";

import { FloatingAddButton } from "@/components/FloatingAddButton";
import { ReportsGrid } from "@/components/ReportsGrid";

export default function DashboardPage() {
  return (
    <div className="dashboard">
      <main className="dashboard__main">
        <ReportsGrid />
      </main>
      <FloatingAddButton />
    </div>
  );
}
