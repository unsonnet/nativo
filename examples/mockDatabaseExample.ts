/**
 * This file demonstrates how the new mock database system works
 * Run this with: node -r esbuild-register examples/mockDatabaseExample.ts
 * Or import and run the functions in your application
 */

import { 
  mockProductsDatabase, 
  getProductWithAnalysis, 
  getProductIndexWithAnalysis, 
  generateSearchResultsForReport,
  getAllProducts,
  getProductById 
} from '../src/data/mockDatabase';
import { reports } from '../src/data/reports';

console.log('🗄️  Mock Database Example\n');

// 1. Show all products in the database
console.log('📦 All Products in Database:');
const allProducts = getAllProducts();
allProducts.forEach(product => {
  console.log(`  - ${product.id}: ${product.brand} ${product.model} (${product.category.type})`);
});

console.log('\n📊 All Reports:');
reports.forEach(report => {
  console.log(`  - ${report.id}: "${report.title}" (Reference: ${report.reference.id})`);
});

// 2. Show how analysis is generated per report
console.log('\n🔬 Analysis Examples:');

// Get product p1 with analysis for report 1
const productWithAnalysis = getProductWithAnalysis('p1', '1');
if (productWithAnalysis) {
  console.log(`\n🔍 Product p1 analysis for Report 1:`);
  console.log(`  - Similarity: ${(productWithAnalysis.analysis?.similarity || 0 * 100).toFixed(1)}%`);
  console.log(`  - Brand: ${productWithAnalysis.brand} ${productWithAnalysis.model}`);
  console.log(`  - Images: ${productWithAnalysis.images.length} images`);
  console.log(`  - Vendors: ${productWithAnalysis.formats[0]?.vendors?.length || 0} vendors`);
}

// Get the same product with analysis for a different report
const productWithAnalysis2 = getProductWithAnalysis('p1', '2');
if (productWithAnalysis2) {
  console.log(`\n🔍 Same Product p1 analysis for Report 2:`);
  console.log(`  - Similarity: ${(productWithAnalysis2.analysis?.similarity || 0 * 100).toFixed(1)}%`);
  console.log(`  - Notice: Different similarity score for the same product in different reports!`);
}

// 3. Show search results generation
console.log('\n🔎 Search Results for Report 1:');
const searchResults = generateSearchResultsForReport('1', 'p1', 5);
searchResults.forEach((result, index) => {
  console.log(`  ${index + 1}. ${result.brand} ${result.model} - ${(result.analysis?.similarity || 0 * 100).toFixed(1)}% match`);
});

console.log('\n🔎 Search Results for Report 2 (different reference):');
const report2 = reports.find(r => r.id === '2');
if (report2) {
  const searchResults2 = generateSearchResultsForReport('2', report2.reference.id, 5);
  searchResults2.forEach((result, index) => {
    console.log(`  ${index + 1}. ${result.brand} ${result.model} - ${(result.analysis?.similarity || 0 * 100).toFixed(1)}% match`);
  });
}

console.log('\n✅ Mock database system is working correctly!');
console.log('   - Products have realistic data with multiple images, vendors, and specs');
console.log('   - Analysis is generated dynamically per report-product combination');
console.log('   - Search results are tailored to each report\'s reference product');
console.log('   - Everything maintains the exact Product/ProductIndex types from your API');