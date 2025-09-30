# Quick Setup Guide: Integrating Your REST API

This guide will help you quickly integrate your REST API endpoints with the K9 application infrastructure.

## 🚀 Quick Start (5 minutes)

### 1. Set Environment Variables

Create a `.env.local` file in your project root:

```bash
# Copy from .env.example and update
cp .env.example .env.local

# Edit .env.local
NEXT_PUBLIC_USE_REAL_API=true
NEXT_PUBLIC_API_BASE_URL=https://your-api-server.com/v1
NEXT_PUBLIC_DEBUG_API=true  # Enable for debugging
```

### 2. Test API Connectivity

Add this test to any component to verify your API is reachable:

```typescript
import { apiClient } from '@/lib/api/client';

// Test in useEffect or button click
const testApi = async () => {
  const response = await apiClient.get('/health'); // or any endpoint
  console.log('API Status:', response.status);
  console.log('API Response:', response.body);
  console.log('API Error:', response.error);
};
```

### 3. Update Your Backend URLs

The application expects these endpoints on your backend:

```
Base URL: {NEXT_PUBLIC_API_BASE_URL}

Authentication (AWS Cognito):
✅ POST /auth/login          - Already implemented
✅ POST /auth/refresh        - Already implemented

Reports:
🔄 GET    /reports           - List user reports  
🔄 POST   /reports           - Create new report
🔄 GET    /reports/:id       - Get specific report
🔄 DELETE /reports/:id       - Delete report
🔄 PATCH  /reports/:id       - Update report

Search:
🔄 POST   /reports/:id/search - Search products in report

Products:
🔄 GET    /reports/:reportId/products/:productId - Get product details

Favorites:
🔄 PUT    /reports/:id/favorites/:productId      - Update single favorite
🔄 PUT    /reports/:id/favorites                 - Bulk update favorites

Export:
🔄 GET    /reports/:id/export                    - Export favorites as ZIP

User Profile:
🔄 GET    /user/profile      - Get user profile
🔄 PATCH  /user/profile      - Update profile
🔄 POST   /user/avatar       - Upload avatar
```

## 📝 Implementation Examples

### Example 1: List Reports

**Frontend Call (already implemented):**
```typescript
import { reportsApiService } from '@/lib/api/reportsApi';

const loadReports = async () => {
  const response = await reportsApiService.listReports(1, 20);
  if (response.status === 200) {
    setReports(response.body.reports);
  }
};
```

**Your Backend Should Return:**
```json
{
  "reports": [
    {
      "id": "report-123",
      "title": "Kitchen Flooring Report", 
      "author": "John Doe",
      "date": "2024-01-15T10:30:00Z",
      "reference": {
        "id": "product-456",
        "brand": "FloorCorp",
        "model": "Oak Classic",
        "image": "https://...",
        "analysis": { ... }
      },
      "favorites": ["prod-1", "prod-2"]
    }
  ],
  "total": 45,
  "page": 1, 
  "limit": 20
}
```

### Example 2: Create Report

**Frontend Call (already implemented):**
```typescript
const newReport = await reportsApiService.createReport({
  title: "My New Report",
  reference: productData  // Full Product object
});
```

**Your Backend Should Accept:**
```json
POST /reports
{
  "title": "My New Report",
  "reference": {
    "id": "product-789",
    "brand": "FloorCorp", 
    "model": "Oak Premium",
    "images": [...],
    "category": {...},
    "formats": [...],
    "analysis": {...}
  }
}
```

**Your Backend Should Return:**
```json
{
  "id": "report-999",
  "title": "My New Report", 
  "author": "John Doe",
  "date": "2024-01-15T10:30:00Z"
}
```

### Example 3: Search Products

**Frontend Call (already implemented):**
```typescript
const searchResults = await reportsApiService.searchProducts("report-123", {
  filters: {
    category: { type: "Hardwood", material: "Oak" },
    brand: "FloorCorp",
    priceRange: { min: 2.00, max: 8.00 }
  },
  page: 1,
  limit: 50
});
```

**Your Backend Should Return:**
```json
{
  "products": [
    {
      "id": "product-111",
      "brand": "FloorCorp",
      "model": "Oak Premium", 
      "image": "https://...",
      "analysis": {
        "similarity": 0.85,
        "color": {...},
        "pattern": {...}
      }
    }
  ],
  "total": 127,
  "page": 1,
  "limit": 50
}
```

## 🔧 Development Workflow

### Phase 1: Keep Mock Data (Recommended)
```bash
NEXT_PUBLIC_USE_REAL_API=false
```
- Develop and test your backend independently
- Frontend continues working with mock data
- No disruption to development

### Phase 2: Test Individual Endpoints
```bash
NEXT_PUBLIC_USE_REAL_API=true
NEXT_PUBLIC_DEBUG_API=true
```
- Switch to real API one endpoint at a time
- Check browser console for API call logs
- Verify request/response formats

### Phase 3: Full Integration
```bash
NEXT_PUBLIC_USE_REAL_API=true
NEXT_PUBLIC_DEBUG_API=false
```
- All endpoints working with real backend
- Production-ready configuration

## 🛠 Debugging Tools

### Check API Calls
```typescript
// Enable detailed logging
console.log('API Base URL:', process.env.NEXT_PUBLIC_API_BASE_URL);
console.log('Using Real API:', process.env.NEXT_PUBLIC_USE_REAL_API);

// Test specific endpoints
import { apiClient } from '@/lib/api/client';
const test = await apiClient.get('/reports');
console.log('Response:', test);
```

### Common Issues

**1. CORS Errors**
- Ensure your backend allows requests from your domain
- Add proper CORS headers for `OPTIONS` requests

**2. Authentication Errors** 
- Verify AWS Cognito tokens are being sent correctly
- Check `Authorization: Bearer <token>` header format

**3. 404 Errors**
- Verify `NEXT_PUBLIC_API_BASE_URL` is correct
- Check that your backend routes match the expected paths

**4. Type Errors**
- Ensure your API responses match the TypeScript interfaces
- Check `docs/api-endpoints.md` for exact schemas

## 📋 Backend Implementation Checklist

For each endpoint, ensure your backend:

- [ ] **Accepts** the exact request format shown in documentation
- [ ] **Returns** the exact response format with correct status codes
- [ ] **Validates** AWS Cognito tokens in `Authorization` header
- [ ] **Handles** errors gracefully with proper error messages
- [ ] **Supports** CORS for browser requests
- [ ] **Implements** proper HTTP status codes (200, 201, 400, 401, 404, 500)

## 🚦 Testing Your Integration

Use this checklist to verify each endpoint:

```typescript
// Test each endpoint manually
import { reportsApiService } from '@/lib/api/reportsApi';

// 1. List reports
const reports = await reportsApiService.listReports();
console.log('List reports:', reports.status === 200 ? '✅' : '❌');

// 2. Create report  
const newReport = await reportsApiService.createReport({...});
console.log('Create report:', newReport.status === 201 ? '✅' : '❌');

// 3. Get report
const report = await reportsApiService.getReport('report-id');
console.log('Get report:', report.status === 200 ? '✅' : '❌');

// Continue for each endpoint...
```

## 🎯 Next Steps

1. **Start with authentication** - Verify AWS Cognito integration
2. **Implement reports endpoints** - Most critical for basic functionality  
3. **Add search functionality** - For product discovery
4. **Implement favorites** - For user engagement
5. **Add export feature** - For data download

Need help? Check the complete API documentation at `docs/api-endpoints.md`!