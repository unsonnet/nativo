# Export Favorites Feature

## Overview

The export favorites feature allows users to download a ZIP file containing data and resources for all products they've marked as favorites within a specific report.

## How it Works

### Frontend Component
- **Location**: `src/components/report/SearchResults.tsx`
- **Button Visibility**: The export button is always visible in the search results header
- **Button State**: 
  - **Disabled** when:
    - Currently searching/loading (`isLoading` is true)
    - No favorite products exist (`favorites.length === 0`)
    - Currently exporting (`isExporting` is true)
  - **Enabled** when:
    - Not searching/loading
    - Has one or more favorite products
    - Not currently processing an export
- **Visual States**: 
  - Enabled: Primary button styling with full opacity
  - Disabled: Muted background, muted text color, reduced opacity (0.4)
  - Exporting: Shows "Exporting..." text, disabled state

### API Endpoint
- **Location**: `src/app/api/export/favorites/route.ts`
- **Method**: POST
- **Payload**: 
  ```json
  {
    "reportId": "string",
    "productIds": ["string", "string", ...]
  }
  ```

### User Experience
1. User adds products to favorites during their search session
2. Export button is always visible in the search results header
3. Button is disabled when searching or when no favorites exist
4. When enabled, user clicks "Export" button to download favorites
5. API call is made to generate and download ZIP file
6. Browser automatically downloads the file as `favorites-report-{reportId}.zip`

### Button States
- **Always Visible**: Export button appears in both "Results" and "Favorites" view modes
- **Disabled States**:
  - When searching: "Cannot export while searching" tooltip
  - When no favorites: "No favorites to export" tooltip  
  - When exporting: Button shows "Exporting..." and is disabled
- **Enabled State**: "Export favorites as ZIP" tooltip, primary button styling

## Implementation Status

### ✅ Completed
- Export button UI component
- CSS styling matching the existing design system
- Loading states and error handling
- API endpoint structure
- Integration with favorites system

### 🚧 To Be Implemented
- Actual ZIP file generation logic
- Product data fetching and formatting
- Image and document inclusion in ZIP
- Progress indicators for large exports

## API Implementation Guide

To complete the export functionality, implement the following in `/api/export/favorites/route.ts`:

```typescript
// 1. Fetch product details
const products = await fetchProductDetails(productIds);

// 2. Generate export content (images, data sheets, etc.)
const exportContent = await generateProductExportData(products);

// 3. Create ZIP file
const zipBuffer = await createZipFile(exportContent, reportId);

// 4. Return ZIP as download
return new NextResponse(zipBuffer, {
  headers: {
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="favorites-report-${reportId}.zip"`,
  },
});
```

## Security Considerations

- Validate user permissions for the reportId
- Rate limit export requests
- Sanitize file names and content
- Implement authentication/authorization as needed

## Testing

The current implementation includes a mock response that shows:
- Number of products being exported
- Report ID confirmation
- Simulated processing delay

This allows for UI testing before the full backend implementation is complete.