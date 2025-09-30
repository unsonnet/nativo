/**
 * Example demonstrating the new API-synced favorites system
 * This shows how favorites are scoped to individual reports and sync with the database
 */

import { reports } from '../src/data/reports';
import { generateSearchResultsForReport } from '../src/data/mockDatabase';

console.log('🎯 Favorites System Example\n');

// Show reports and their initial favorites from database
console.log('📊 Reports with Database Favorites:');
reports.forEach(report => {
  const favCount = report.favorites?.length || 0;
  console.log(`  - ${report.id}: "${report.title}" (${favCount} favorites)`);
  if (report.favorites && report.favorites.length > 0) {
    console.log(`    Favorited products: ${report.favorites.join(', ')}`);
  }
});

console.log('\n🔄 How the Favorites System Works:');
console.log('1. When a report loads, favorites are loaded from the database');
console.log('2. InitializeFavoritesFromReport() sets up session storage with DB favorites');
console.log('3. When user toggles favorites, it updates session storage immediately (fast UI)');
console.log('4. Then syncs to database via API call (persistent storage)');
console.log('5. Session storage is cleared when leaving the report (scoped to report)');

console.log('\n💾 Storage Strategy:');
console.log('- Database: Persistent favorites per report (Report.favorites[])');
console.log('- Session Storage: Temporary working copy for current report only');
console.log('- No localStorage: Prevents favorites persisting across reports');

// Example search results for a report
const exampleReport = reports[0]; // Report 1 with some favorites
const searchResults = generateSearchResultsForReport(exampleReport.id, exampleReport.reference.id, 5);

console.log(`\n🔍 Example for ${exampleReport.title}:`);
console.log(`  Reference Product: ${exampleReport.reference.brand} ${exampleReport.reference.model}`);
console.log(`  Database Favorites: ${exampleReport.favorites?.join(', ') || 'none'}`);
console.log(`  Search Results: ${searchResults.length} products`);
searchResults.slice(0, 3).forEach((result, i) => {
  const isFavorited = exampleReport.favorites?.includes(result.id) ? '❤️' : '🤍';
  console.log(`    ${i + 1}. ${result.brand} ${result.model} ${isFavorited}`);
});

console.log('\n✅ Benefits of New System:');
console.log('- Favorites are properly scoped to individual reports');
console.log('- Fast UI updates with session storage + background API sync');  
console.log('- Database persistence ensures favorites survive page refreshes');
console.log('- Session cleanup prevents favorites leaking between reports');
console.log('- Multi-tab sync via storage events');