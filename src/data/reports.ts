import type { Report } from "@/types/report";

export const reports: Report[] = [
  {
    id: "1",
    title: "Office Building 2nd Floor",
    author: "dashboard.user",
    date: "2025-09-15",
    reference: {
      id: "p1",
      brand: "Acme",
      series: "",
      model: "X200",
      image: "https://picsum.photos/seed/building/800/800",
    },
  },
  {
    id: "2",
    title: "Residential Layout Analysis",
    author: "dashboard.user",
    date: "2025-09-12",
    reference: {
      id: "p2",
      brand: "Acme",
      series: "",
      model: "Z150",
      image: "https://picsum.photos/seed/layout/800/800",
    },
  },
  {
    id: "3",
    title: "Warehouse Floor Assessment",
    author: "dashboard.user",
    date: "2025-09-10",
    reference: {
      id: "p3",
      brand: "BuildCo",
      series: "",
      model: "W99",
      image: "https://picsum.photos/seed/warehouse/800/800",
    },
  },
  {
    id: "4",
    title: "Corporate Headquarters",
    author: "dashboard.user",
    date: "2025-09-08",
    reference: {
      id: "p4",
      brand: "MegaCorp",
      series: "",
      model: "HQ1",
      image: "https://picsum.photos/seed/headquarters/800/800",
    },
  },
  {
    id: "5",
    title: "Retail Space Configuration",
    author: "dashboard.user",
    date: "2025-09-05",
    reference: {
      id: "p5",
      brand: "Acme",
      series: "",
      model: "RetailX",
      image: "https://picsum.photos/seed/retail/800/800",
    },
  },
  {
    id: "6",
    title: "Educational Facility Review",
    author: "dashboard.user",
    date: "2025-09-03",
    reference: {
      id: "p6",
      brand: "EduBuild",
      series: "",
      model: "CampusPro",
      image: "https://picsum.photos/seed/school/800/800",
    },
  },
];
