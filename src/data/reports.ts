import type { Report, ProductIndex } from "@/types/report";
import { getProductIndexWithAnalysis } from "./mockDatabase";

// Define the base reports structure
const baseReports = [
  {
    id: "1",
    title: "Office Building 2nd Floor",
    author: "dashboard.user",
    date: "2025-09-15",
    referenceProductId: "p1", // TimberCraft Classic Oak Heritage
  },
  {
    id: "2", 
    title: "Residential Layout Analysis",
    author: "dashboard.user",
    date: "2025-09-12",
    referenceProductId: "p2", // WoodWorks Rustic Oak Plank
  },
  {
    id: "3",
    title: "Warehouse Floor Assessment", 
    author: "dashboard.user",
    date: "2025-09-10",
    referenceProductId: "p7", // BuildCorp Commercial Oak
  },
  {
    id: "4",
    title: "Corporate Headquarters",
    author: "dashboard.user", 
    date: "2025-09-08",
    referenceProductId: "p5", // Premier European Oak Classic
  },
  {
    id: "5",
    title: "Retail Space Configuration",
    author: "dashboard.user",
    date: "2025-09-05", 
    referenceProductId: "p3", // FloorMaster Golden Oak Select
  },
  {
    id: "6",
    title: "Educational Facility Review",
    author: "dashboard.user",
    date: "2025-09-03",
    referenceProductId: "p6", // Luxury Contemporary Oak
  },
  {
    id: "7",
    title: "Artisan Showroom Display",
    author: "dashboard.user",
    date: "2025-09-01",
    referenceProductId: "p8", // ArtisanCraft Handcrafted Oak Elite
  },
  {
    id: "8", 
    title: "Heritage Home Restoration",
    author: "dashboard.user",
    date: "2025-08-28",
    referenceProductId: "p4", // NaturalCraft Antique Oak Wide Plank
  },
];

// Generate reports with ProductIndex references that include analysis
export const reports: Report<ProductIndex>[] = baseReports.map(baseReport => {
  const reference = getProductIndexWithAnalysis(baseReport.referenceProductId, baseReport.id);
  
  if (!reference) {
    throw new Error(`Could not find product ${baseReport.referenceProductId} for report ${baseReport.id}`);
  }

  // Add some mock favorites for testing (these would come from the database)
  let mockFavorites: string[] = [];
  if (baseReport.id === '1') {
    // Report 1 has some favorited products
    mockFavorites = ['p2', 'p5']; // WoodWorks and Premier Flooring
  } else if (baseReport.id === '3') {
    // Report 3 has one favorite
    mockFavorites = ['p1']; // TimberCraft
  }
  
  return {
    id: baseReport.id,
    title: baseReport.title,
    author: baseReport.author,
    date: baseReport.date,
    reference,
    favorites: mockFavorites, // This would come from your database
  };
});
