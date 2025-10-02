# Backend Implementation TODO for Original API Integration

This document outlines the backend endpoints that need to be implemented to fully support the React app functionality while using the existing original API as the foundation.

## Overview

The React app now uses adapter functions to translate between its expected API interface and your original API endpoints. With the new `/report` endpoints, most functionality is now working!

## ✅ Already Working (Using Original API)

These features work now using the original API through adapters:

- **Authentication** - Login, logout, refresh, password reset (`/auth/*` endpoints)
- **Report Creation** - Creates jobs in original API (`PUT /fetch/{job}`)
- **Material Search** - Searches similar materials (`POST /fetch/{job}`)
- **Report Retrieval** - Gets job reference data (`GET /fetch/{job}`)
- **Image Upload** - Uploads images to job album (`PUT /fetch/{job}/album/{filename}`)
- **🆕 Reports Management** - Lists all user reports (`GET /report`)
- **🆕 Favorites System** - Get, update, and toggle favorites (`/report/{job}/favorites`)
- **🆕 Product Details** - Get full product details from favorites

## ❌ Still Missing Functionality (Needs Backend Implementation)

### 1. Report Deletion
**Current Issue:** Original API doesn't have delete functionality
**What's needed:**
```
DELETE /report/{job}
- Delete a user's report/job
- Clean up associated S3 data and favorites
```

### 2. Report Metadata Updates  
**Current Issue:** Original API jobs can't be updated after creation
**What's needed:**
```
PATCH /report/{job}
- Update report title and other metadata
- Version control for report changes
```

### 3. User Profile Management
**Current Issue:** Original API only handles authentication, no user profiles
**What's needed:**
```
GET /user/profile
- Get user profile information
- Return user preferences, creation date, etc.

PATCH /user/profile
- Update user profile information
- Update user preferences

POST /user/avatar
- Upload user avatar image
- Store in S3 and return URL
```

### 4. Export Functionality
**Current Issue:** No export functionality in original API
**What's needed:**
```
GET /report/{job}/export
- Export favorited materials as ZIP file
- Include images, specs, pricing info
```

## 🎉 Major Progress Made!

With the new `/report` endpoints, we've gone from ~40% functionality to ~85% functionality:

### ✅ Now Working:
- **List Reports** - `GET /report` provides all user's jobs with metadata
- **Get Report Details** - Full report data including creation dates and favorites
- **Favorites Management** - Complete CRUD operations for favorites
- **Product Details** - Full product information from favorites data

### 🔄 Updated Adapters:
The adapter functions now handle:
- **Job List Transformation** - Original API jobs → React app Reports
- **Favorites Integration** - Original API favorites → React app Product format
- **Date Handling** - YYYY-MM-DD → ISO string conversion
- **Type Safety** - Proper Embedding → MiniEmbedding conversion for list views

## 🔧 Implementation Strategies

### Option 1: Extend Original API (Recommended)
Add new Lambda functions that work alongside the existing ones:

```
/user/reports -> New Lambda that queries DynamoDB for user's jobs
/user/profile -> New Lambda for user profile management
/favorites/* -> New Lambda functions for favorites storage
```

**Pros:**
- Leverages existing infrastructure
- Minimal changes to original API
- Can reuse authentication and S3 storage

**Cons:**
- More Lambda functions to maintain

### Option 2: Create Middleware API
Build a new API layer that wraps the original API:

```
New API (/v2/*) -> Middleware Layer -> Original API (/fetch/*)
```

**Pros:**
- Clean separation of concerns
- Can add caching, analytics, etc.
- Easier to version and update

**Cons:**
- More complex architecture
- Additional latency

### Option 3: Database-First Approach
Store all app data in DynamoDB and use original API only for ML processing:

```
React App -> New REST API -> DynamoDB + Original API for ML
```

**Pros:**
- Full control over data model
- Better performance for app features
- Can add complex queries and relationships

**Cons:**
- Most work required
- Need to duplicate some original API functionality

## 📋 Recommended Implementation Order

1. **Reports Management** - Essential for basic app functionality
2. **Favorites System** - Core user feature
3. **User Profiles** - User experience enhancement
4. **Export Functionality** - Value-added feature
5. **Product Details** - Enhanced material information
6. **Report Updates** - Advanced editing capabilities

## 🔑 Database Schema Suggestions

### Users Table
```
PK: user_id (from Cognito)
attributes: {
  profile: { name, email, avatar_url, preferences },
  created_at, updated_at
}
```

### Reports Table
```
PK: user_id
SK: report_id
attributes: {
  title, job_id (original API), created_at, updated_at,
  reference_material: { type, material, dimensions, images }
}
```

### Favorites Table
```
PK: user_id#report_id
SK: material_id
attributes: {
  added_at, material_data: { ... }
}
```

## 🚀 Quick Start Implementation

To get basic functionality working quickly, implement these minimal endpoints:

1. **GET /user/reports** - Return empty array for now, log that it's called
2. **PUT /reports/{reportId}/favorites** - Store in DynamoDB, return success
3. **GET /user/profile** - Return basic profile from JWT token data

This will allow the app to run without errors while you build out full functionality.

## 🔗 Environment Configuration

Update your `.env.local` file:
```
NEXT_PUBLIC_API_BASE_URL=https://your-api-gateway-url.amazonaws.com/stage
NEXT_PUBLIC_USE_REAL_API=true
```

The adapter functions will handle the translation between React app expectations and original API format.