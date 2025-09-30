# Product Comparison Feature

## Overview

The product comparison page allows users to compare a selected product from search results with the reference product from a report. This provides detailed side-by-side analysis including similarity scores, product specifications, vendor information, and image comparison.

## URL Structure

The product comparison page uses hash-based routing for static site compatibility:

```
/report/product#<reportId>-<productId>
```

Example: `/report/product#1-search_result_1`

## Navigation

### From Search Results

When viewing search results in a report, clicking on any product card will automatically navigate to the product comparison page with the correct report and product IDs.

### Direct Navigation

You can also navigate directly by constructing the URL:
- Report ID: The ID of the report containing the reference product
- Product ID: The ID of the product you want to compare (from search results)

## Features

### Left Panel - Product Information

The left panel displays comprehensive product details in collapsible sections:

1. **Product Information**: Basic details (brand, series, model)
2. **Similarity Analysis**: 
   - Overall similarity percentage
   - Color similarity scores with progress bars
   - Pattern similarity scores with progress bars
3. **Category & Material**: Product specifications and characteristics
4. **Available Formats**: Multiple size options with vendor pricing and links
5. **vs Reference Product**: Quick comparison with reference product specs

### Right Panel - Image Comparison

The right panel provides side-by-side image comparison:

- Selected product images on the left
- Reference product images on the right
- Image navigation controls (thumbnails, arrows)
- Zoom functionality
- Full-screen viewing capability

## Similarity Scores

The similarity scores are calculated during the search process and displayed as:
- Overall similarity percentage
- Individual feature similarity scores (color, pattern)
- Visual progress bars with color coding:
  - Green: 90%+ similarity
  - Yellow: 75-89% similarity  
  - Red: Below 75% similarity

## Technical Implementation

### URL Handling

The page uses client-side hash routing to parse the report and product IDs:

```typescript
// Parse URL hash: reportId-productId
const hashValue = window.location.hash.slice(1);
const [reportId, productId] = hashValue.split('-');
```

### Data Structure

Product analysis now includes similarity scores in the embedding objects:

```typescript
type Embedding = {
  vector: number[];
  similarity?: number; // Percent similarity
};

type MiniEmbedding = {
  vector: [number, number];
  similarity?: number; // Percent similarity
};
```

### Components

- `ProductComparisonContainer`: Main container component
- `ProductInfoPanel`: Left panel with product details and similarity scores
- `ImageComparisonPanel`: Right panel with side-by-side image comparison

## Usage Example

1. Open a report (e.g., `/report#1`)
2. Perform a search to get product results
3. Click on any product card in the search results
4. The page will navigate to `/report/product#1-<productId>`
5. View detailed comparison between selected product and reference product

## Future Enhancements

- Interactive similarity threshold adjustment
- Advanced filtering based on similarity scores
- Export comparison results
- Product bookmarking and comparison history
- Multiple product comparison (3+ products)