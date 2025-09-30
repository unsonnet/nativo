import type { ProductIndex } from '@/types/report';
import { generateSearchResultsForReport } from './mockDatabase';

/**
 * Mock search results for development and testing
 * In production, this would be replaced with actual API calls
 * 
 * This function generates search results for a given report ID,
 * simulating analysis against the reference product in that report
 */
export function getMockSearchResults(reportId: string, referenceProductId: string): ProductIndex[] {
  return generateSearchResultsForReport(reportId, referenceProductId, 20);
}

/**
 * Default search results for backward compatibility
 * Uses report "1" with reference product "p1" as default
 */
export const mockSearchResults: ProductIndex[] = getMockSearchResults("1", "p1");

/**
 * Simulate API delay for realistic development experience
 */
export const simulateApiDelay = (ms: number = 1000): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};