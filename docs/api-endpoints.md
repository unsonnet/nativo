# K9 Application API Documentation

This document describes the REST API endpoints for the K9 application and their current implementation status.

## Authentication

All API endpoints (except authentication endpoints) require AWS Cognito authentication via the `Authorization` header:

```
Authorization: Bearer <cognito_id_token>
```

The application automatically handles token refresh when tokens are near expiry.

## Current Implementation Status

- ✅ **Implemented**: Fully working with real API calls
- 🔄 **Partial**: Infrastructure ready, needs backend implementation
- ❌ **Mock Only**: Currently using mock data only

## API Endpoints

### 1. Authentication (`/auth/*`)

**Status**: ✅ **Implemented**

#### Login
```
POST /auth/login
Content-Type: application/json

{
  "username": "string",
  "password": "string"
}

Response:
{
  "accessToken": "string",
  "idToken": "string", 
  "refreshToken": "string"
}
```

**Current Implementation**: `src/lib/auth/auth.ts` - `login()`
- **Location**: AWS Cognito integration
- **File**: `src/lib/auth/auth.ts`
- **Function**: `login(username, password)`

#### Token Refresh
```
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "string",
  "username": "string"
}

Response:
{
  "accessToken": "string",
  "idToken": "string"
}
```

**Current Implementation**: `src/lib/auth/auth.ts` - `refresh()`
- **Location**: AWS Cognito integration
- **File**: `src/lib/auth/auth.ts`
- **Function**: `refresh()`

### 2. User Profile (`/user/*`)

**Status**: 🔄 **Partial** - Infrastructure ready

#### Get User Profile
```
GET /user/profile
Authorization: Bearer <token>

Response:
{
  "id": "string",
  "name": "string",
  "email": "string",
  "avatarUrl": "string",
  "createdAt": "string",
  "updatedAt": "string",
  "preferences": {
    "defaultReportTitle": "string",
    "autoSaveFavorites": boolean,
    "exportFormat": "zip" | "pdf" | "excel"
  }
}
```

**Implementation Needed**:
- **API Service**: `src/lib/api/userApi.ts` - `UserApiService.getProfile()`
- **Backend**: Need to implement user profile endpoints
- **Usage**: Auth components to display user info

#### Update User Profile
```
PATCH /user/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "string",
  "email": "string", 
  "preferences": { ... }
}
```

**Implementation Needed**:
- **API Service**: `src/lib/api/userApi.ts` - `UserApiService.updateProfile()`
- **Backend**: Need to implement profile update endpoints

### 3. Reports Management (`/reports/*`)

**Status**: 🔄 **Partial** - Infrastructure ready, using mock data

#### List User Reports
```
GET /reports?limit=20&cursor=abc123
Authorization: Bearer <token>

Response:
{
  "reports": [
    {
      "id": "string",
      "title": "string",
      "author": "string", 
      "date": "string",
      "reference": ProductIndex,
      "favorites": ["productId1", "productId2"]
    }
  ],
  "total": number,
  "limit": number,
  "next_cursor": string | null,
  "has_more": boolean
}
```

**Cursor Pagination**: 
- Use `limit` to control page size (default: 20)
- Use `cursor` from previous response's `next_cursor` to get next page
- `has_more` indicates if there are additional results
- `total` shows the total count of all user reports

**Current Implementation**: 
- **API Service**: `src/lib/api/reportsApi.ts` - `ReportsApiService.listReports(limit, cursor)`
- **Bridge**: `src/lib/api/reports.ts` - `listReports(limit, cursor)` with cursor pagination
- **Usage**: Dashboard page, reports grid with infinite scroll

**Implementation Needed**:
- Set `NEXT_PUBLIC_USE_REAL_API=true` in environment
- Backend implementation of reports endpoints

#### Create New Report
```
POST /reports
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "string",
  "reference": Product
}

Response:
{
  "id": "string",
  "title": "string",
  "author": "string",
  "date": "string"
}
```

**Current Implementation**:
- **API Service**: `src/lib/api/reportsApi.ts` - `ReportsApiService.createReport()`
- **Bridge**: `src/lib/api/reports.ts` - `createReport()` (currently mock)
- **Usage**: New report form, image workspace

#### Get Full Report
```
GET /reports/:reportId
Authorization: Bearer <token>

Response:
{
  "id": "string",
  "title": "string", 
  "author": "string",
  "date": "string",
  "reference": Product,
  "favorites": ["productId1", "productId2"]
}
```

**Current Implementation**:
- **API Service**: `src/lib/api/reportsApi.ts` - `ReportsApiService.getReport()`
- **Bridge**: `src/lib/api/reports.ts` - `getReport()` (currently mock)
- **Usage**: Report pages, `useReportData` hook

### 4. Product Search (`/reports/:reportId/search`)

**Status**: 🔄 **Partial** - Infrastructure ready, using mock data

#### Search Products in Report
```
POST /reports/:reportId/search
Authorization: Bearer <token>
Content-Type: application/json

{
  "filters": {
    "category": {
      "type": "string",
      "material": "string",
      "look": "string",
      "texture": "string",
      "finish": "string",
      "edge": "string"
    },
    "brand": "string",
    "priceRange": {
      "min": number,
      "max": number
    },
    "similarity": {
      "threshold": number
    }
  },
  "page": number,
  "limit": number
}

Response:
{
  "products": [ProductIndex],
  "total": number,
  "page": number,
  "limit": number
}
```

**Current Implementation**:
- **API Service**: `src/lib/api/reportsApi.ts` - `ReportsApiService.searchProducts()`
- **Bridge**: `src/components/report/useReportData.ts` - `handleSearch()` (currently mock)
- **Usage**: Report search interface, search results

### 5. Product Details (`/reports/:reportId/products/:productId`)

**Status**: 🔄 **Partial** - Infrastructure ready

#### Get Full Product Details  
```
GET /reports/:reportId/products/:productId
Authorization: Bearer <token>

Response: Product
```

**Current Implementation**:
- **API Service**: `src/lib/api/reportsApi.ts` - `ReportsApiService.getProduct()`
- **Usage**: Product detail views, product comparison

### 6. Favorites Management (`/reports/:reportId/favorites/*`)

**Status**: 🔄 **Partial** - Infrastructure ready, session-based

#### Update Single Favorite
```
PUT /reports/:reportId/favorites/:productId
Authorization: Bearer <token>
Content-Type: application/json

{
  "isFavorite": boolean
}

Response:
{
  "success": boolean
}
```

**Current Implementation**:
- **API Service**: `src/lib/api/reportsApi.ts` - `ReportsApiService.updateFavoriteStatus()`
- **Bridge**: `src/lib/utils/favorites.ts` - `FavoritesApiService.updateFavoriteStatus()`
- **Usage**: `useFavorites` hook, favorite toggles

#### Bulk Update Favorites
```
PUT /reports/:reportId/favorites
Authorization: Bearer <token>
Content-Type: application/json

{
  "favorites": ["productId1", "productId2"]
}

Response:
{
  "success": boolean
}
```

**Current Implementation**:
- **API Service**: `src/lib/api/reportsApi.ts` - `ReportsApiService.syncFavorites()`
- **Bridge**: `src/lib/utils/favorites.ts` - `FavoritesApiService.syncFavoritesToDatabase()`
- **Usage**: Automatic sync when favorites change

### 7. Export Favorites (`/reports/:reportId/export`)

**Status**: 🔄 **Partial** - Infrastructure ready

#### Export Favorited Products as ZIP
```
GET /reports/:reportId/export
Authorization: Bearer <token>

Response: Blob (application/zip)
Content-Disposition: attachment; filename="favorites-report-{reportId}.zip"
```

**Current Implementation**:
- **API Service**: `src/lib/api/reportsApi.ts` - `ReportsApiService.exportFavorites()`
- **Usage**: Export functionality in favorites

**Implementation Needed**:
- Backend implementation of export endpoint (GitHub Pages doesn't support API routes)
- Set `NEXT_PUBLIC_USE_REAL_API=true` when backend is ready

## Environment Configuration

Control API behavior with environment variables:

```bash
# .env.local
NEXT_PUBLIC_USE_REAL_API=false          # Set to 'true' to use real API
NEXT_PUBLIC_API_BASE_URL=https://api.yourapp.com/v1
NEXT_PUBLIC_DEBUG_API=false             # Enable API debugging
```

## Implementation Checklist

### To Enable Real API Usage:

1. **Set up backend API server** with the endpoints described above
2. **Update environment variables**:
   ```bash
   NEXT_PUBLIC_USE_REAL_API=true
   NEXT_PUBLIC_API_BASE_URL=https://your-api-server.com/v1
   ```
3. **Test authentication flow** with your AWS Cognito setup
4. **Verify API client** is working with `apiClient` from `src/lib/api/client.ts`

### Ready-to-Use Infrastructure:

- ✅ **API Client**: `src/lib/api/client.ts` - Handles auth, errors, retries
- ✅ **Service Classes**: `src/lib/api/reportsApi.ts`, `src/lib/api/userApi.ts`
- ✅ **Auth Integration**: Automatic token refresh and headers
- ✅ **Error Handling**: Consistent error responses and logging
- ✅ **Type Safety**: Full TypeScript support for all endpoints

### Mock Data Fallbacks:

- All endpoints have mock implementations that can be toggled off
- Session storage maintains favorites for immediate UI feedback
- Mock data generators create realistic test scenarios

## Usage Examples

### Switching to Real API:

```typescript
// In your environment file
NEXT_PUBLIC_USE_REAL_API=true

// The application will automatically start using real API calls
// All mock implementations will be bypassed
```

### Custom API Calls:

```typescript
import { apiClient } from '@/lib/api/client';

// Make authenticated API calls
const response = await apiClient.get('/custom-endpoint');
if (response.status === 200) {
  console.log('Data:', response.body);
} else {
  console.error('Error:', response.error);
}
```

### Error Handling:

```typescript
import { reportsApiService } from '@/lib/api/reportsApi';

try {
  const response = await reportsApiService.listReports();
  if (response.status === 200) {
    setReports(response.body.reports);
  } else {
    setError(response.error || 'Failed to load reports');
  }
} catch (error) {
  setError('Network error');
}
```