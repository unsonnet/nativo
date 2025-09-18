import type { Report } from "@/types/report";

export const reports: Report[] = [
  {
    id: "1",
    subject: "Office Building 2nd Floor",
    date: "2025-09-15",
    reference: {
      id: "p1",
      brand: "Acme",
      model: "X200",
      images: ["https://picsum.photos/seed/building/800/800"],
    },
  },
  {
    id: "2",
    subject: "Residential Layout Analysis",
    date: "2025-09-12",
    reference: {
      id: "p2",
      brand: "Acme",
      model: "Z150",
      images: ["https://picsum.photos/seed/layout/800/800"],
    },
  },
  {
    id: "3",
    subject: "Warehouse Floor Assessment",
    date: "2025-09-10",
    reference: {
      id: "p3",
      brand: "BuildCo",
      model: "W99",
      images: ["https://picsum.photos/seed/warehouse/800/800"],
    },
  },
  {
    id: "4",
    subject: "Corporate Headquarters",
    date: "2025-09-08",
    reference: {
      id: "p4",
      brand: "MegaCorp",
      model: "HQ1",
      images: ["https://picsum.photos/seed/headquarters/800/800"],
    },
  },
  {
    id: "5",
    subject: "Retail Space Configuration",
    date: "2025-09-05",
    reference: {
      id: "p5",
      brand: "Acme",
      model: "RetailX",
      images: ["https://picsum.photos/seed/retail/800/800"],
    },
  },
  {
    id: "6",
    subject: "Educational Facility Review",
    date: "2025-09-03",
    reference: {
      id: "p6",
      brand: "EduBuild",
      model: "CampusPro",
      images: ["https://picsum.photos/seed/school/800/800"],
    },
  },
];
