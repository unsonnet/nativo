"use client";

import { useCallback, useState } from "react";

import { FloatingAddButton } from "@/components/FloatingAddButton";
import { Header } from "@/components/Header";
import { NewReportModal } from "@/components/NewReportModal";
import { ReportsGrid } from "@/components/ReportsGrid";

export default function DashboardPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpen = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <Header />
      <main className="flex flex-1 flex-col">
        <ReportsGrid />
      </main>
      <FloatingAddButton onClick={handleOpen} />
      <NewReportModal isOpen={isModalOpen} onClose={handleClose} />
    </div>
  );
}
