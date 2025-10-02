# Material API Documentation

This API provides endpoints for authentication and material fetching/processing functionality.

## Base URL
The API endpoints are deployed as AWS Lambda functions behind API Gateway.

## Authentication
The API uses AWS Cognito for authentication. All endpoints except authentication endpoints require a valid JWT token.

---

## Authentication Endpoints

### POST /auth/login
Authenticates a user and returns JWT tokens.

**Handler:** `auth-login.py`

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response (200):**
```json
{
  "accessToken": "string",
  "idToken": "string", 
  "refreshToken": "string",
  "expiresIn": "string",
  "tokenType": "string"
}
```

**Challenge Response (202):**
When new password is required:
```json
{
  "challenge": "NEW_PASSWORD_REQUIRED",
  "session": "string",
  "username": "string"
}
```

**Error Responses:**
- `400` - Missing username or password
- `401` - Invalid username or password 
- `403` - User not confirmed
- `404` - User not found
- `500` - Internal server error

**Features:**
- Logs out user from all other devices before login
- Handles new password required challenge
- Returns appropriate JWT tokens for authenticated sessions

---

### POST /auth/refresh
Refreshes access and ID tokens using a refresh token.

**Handler:** `auth-refresh.py`

**Request Body:**
```json
{
  "username": "string",
  "refreshToken": "string"
}
```

**Success Response (200):**
```json
{
  "accessToken": "string",
  "idToken": "string",
  "expiresIn": "string", 
  "tokenType": "string"
}
```

**Error Responses:**
- `400` - Missing username or refresh token
- `401` - Invalid or expired refresh token
- `500` - Internal server error

**Notes:**
- Does not return a new refresh token (refresh tokens are long-lived)
- Used to obtain new access/ID tokens when they expire

---

### POST /auth/reset
Responds to new password challenge during authentication flow.

**Handler:** `auth-reset.py`

**Request Body:**
```json
{
  "username": "string",
  "newPassword": "string",
  "session": "string"
}
```

**Success Response (200):**
```json
{
  "success": true
}
```

**Error Responses:**
- `400` - Missing username, new password, or session
- `401` - Invalid credentials
- `410` - Session expired
- `500` - Internal server error

**Notes:**
- Used when user needs to set a new password (first login or admin reset)
- Requires session token from initial login challenge response

---

## Material Processing Endpoints

### PUT /fetch/{job}/album/{filename}
Uploads an image to a job's album.

**Handler:** `album-put.py`

**Authentication:** Required (JWT token)

**Path Parameters:**
- `job` - Job identifier
- `filename` - Image filename

**Request Body:** Binary image data

**Headers:**
- `Content-Type` - MIME type of the image (optional, defaults to `application/octet-stream`)

**Success Response (200):** Empty response

**Error Responses:**
- `400` - Missing request body
- `500` - Internal server error

**Features:**
- Stores images in S3 bucket under path: `job/{username}/{job}/album/{filename}`
- Supports both base64 encoded and raw binary data
- Automatically detects content type from headers

---

### GET /fetch/{job}
Retrieves job reference data with presigned image URLs.

**Handler:** `fetch-get.py`

**Authentication:** Required (JWT token)

**Path Parameters:**
- `job` - Job identifier

**Success Response (200):**
```json
{
  "type": "tile",
  "material": "ceramic", 
  "length": 24,
  "width": 12,
  "thickness": null,
  "images": [
    "https://s3-presigned-url-1.com",
    "https://s3-presigned-url-2.com"
  ]
}
```

**Error Responses:**
- `500` - Internal server error

**Features:**
- Returns reference data stored for the job
- Converts image filenames to presigned S3 URLs (1 hour expiration)
- Scoped to authenticated user's jobs

---

### PUT /fetch/{job}
Processes reference materials and initiates dataset comparison.

**Handler:** `fetch-lambda-pre/app/main.py`

**Authentication:** Required (JWT token)

**Path Parameters:**
- `job` - Job identifier

**Request Body:**
```json
{
  "type": "tile",
  "material": "ceramic",
  "length": 24,
  "width": 12, 
  "thickness": null,
  "images": [
    "image1.jpg",
    "image2.jpg"
  ]
}
```

**Success Response (200):** Returns run ID as plain text

**Error Responses:**
- `500` - Internal server error with detailed traceback

**Features:**
- Processes reference material data and images
- Extracts color and pattern features from uploaded images
- Stores processed reference data in S3
- Initiates dataset comparison and returns a run ID
- Performs machine learning feature extraction and analysis

---

### POST /fetch/{job}
Fetches matching materials based on thresholds and filters.

**Handler:** `fetch-lambda-post/app/main.py`

**Authentication:** Required (JWT token)

**Path Parameters:**
- `job` - Job identifier

**Query Parameters:**
- `start` - Offset for pagination (default: 0)

**Request Body:**
```json
{
  "type_": {
    "type": 0.9,
    "material": 0.8,
    "missing": false
  },
  "shape": {
    "length": 0.7,
    "width": 0.6,
    "thickness": 0.8,
    "missing": false
  },
  "color": {
    "primary": 0.8,
    "secondary": 0.7,
    "tertiary": 0.6,
    "missing": false
  },
  "pattern": {
    "primary": 0.9,
    "secondary": 0.8,
    "tertiary": 0.7,
    "missing": false
  }
}
```

**Success Response (200):**
```json
[
  {
    "id": "material-123",
    "match": 0,
    "images": [
      "https://s3-presigned-url-1.com"
    ],
    "scores": {
      "shape": {
        "length": 24.5,
        "width": 12.2, 
        "thickness": null
      },
      "color": {
        "primary": 0.85,
        "secondary": 0.72,
        "tertiary": 0.68
      },
      "pattern": {
        "primary": 0.91,
        "secondary": 0.76,
        "tertiary": 0.69
      }
    }
  }
]
```

**Error Responses:**
- `500` - Internal server error with detailed traceback

**Features:**
- Searches material catalog based on similarity thresholds (0.0 to 1.0 scale)
- Supports filtering by type, material, shape dimensions, color components, and pattern components
- Each category can include a "missing" flag to include items with null/missing values
- Supports pagination with offset parameter
- Returns presigned URLs for material images
- Logs search queries with timestamps
- Provides similarity scores for shape, color, and pattern matching
- Returns up to MAX_RESULTS items per request

---

### GET /report
Retrieves all jobs for the authenticated user with their reference data and creation dates.

**Handler:** `report-get.py`

**Authentication:** Required (JWT token)

**Success Response (200):**
```json
[
  {
    "job": "kitchen-tiles-2024",
    "created": "2024-10-01",
    "reference": "https://s3-presigned-url-1.com"
  },
  {
    "job": "bathroom-renovation",
    "created": "2024-09-28",
    "reference": "https://s3-presigned-url-3.com"
  }
]
```

**Error Responses:**
- `500` - Internal server error

**Features:**
- Lists all jobs for the authenticated user
- Returns only the first reference image as a presigned URL (1 hour expiration) for optimal data transfer
- Includes creation date (YYYY-MM-DD format) based on reference.json file modification time
- Results sorted by creation date (newest first), then by job name
- Only includes jobs that have valid reference data with images
- Scoped to authenticated user's jobs only
- Lightweight response optimized for dashboard listing

---

### GET /report/{job}/favorites
Retrieves the list of favorite products with full details for a specific job.

**Handler:** `report-favorites-get.py`

**Authentication:** Required (JWT token)

**Path Parameters:**
- `job` - Job identifier

**Success Response (200):**
```json
[
  {
    "id": "material-123",
    "images": [
      "https://s3-presigned-url-1.com"
    ],
    "description": {
      "store": "TileStore",
      "name": "Premium Ceramic",
      "url": "https://store.com/product",
      "material": "ceramic",
      "length": 24.5,
      "width": 12.2,
      "thickness": 8.0
    }
  },
  {
    "id": "material-456",
    "images": [
      "https://s3-presigned-url-2.com"
    ],
    "description": {
      "store": "MaterialWorld",
      "name": "Luxury Porcelain",
      "url": "https://materialworld.com/luxury",
      "material": "porcelain",
      "length": 12.0,
      "width": 12.0,
      "thickness": 10.0
    }
  }
]
```

**Error Responses:**
- `500` - Internal server error

**Features:**
- Returns full product details for all favorite products
- Includes presigned image URLs (1 hour expiration)
- Returns empty array if no favorites exist
- Same product format as search results (without similarity scores)

---

### PUT /report/{job}/favorites
Replaces the entire list of favorite product IDs for a specific job.

**Handler:** `report-favorites-put.py`

**Authentication:** Required (JWT token)

**Path Parameters:**
- `job` - Job identifier

**Request Body:**
```json
{
  "product_ids": [
    "material-123",
    "material-456",
    "material-789"
  ]
}
```

**Success Response (200):**
```json
{
  "product_ids": [
    "material-123",
    "material-456",
    "material-789"
  ]
}
```

**Error Responses:**
- `400` - Invalid request body (product_ids must be an array)
- `500` - Internal server error

---

### POST /report/{job}/favorites
Toggles a single product ID in the favorites list (adds if not present, removes if present).

**Handler:** `report-favorites-post.py`

**Authentication:** Required (JWT token)

**Path Parameters:**
- `job` - Job identifier

**Request Body:**
```json
{
  "product_id": "material-123"
}
```

**Success Response (200):**
```json
{
  "product_ids": [
    "material-456",
    "material-789"
  ]
}
```

**Error Responses:**
- `400` - Missing product_id in request body
- `500` - Internal server error

**Features:**
- If product_id exists in favorites, it will be removed
- If product_id doesn't exist in favorites, it will be added
- Returns the updated complete list of favorite product IDs

---

## Data Schemas

### Reference Material Schema
```json
{
  "type": "string",        // "tile", etc.
  "material": "string",    // "ceramic", etc.
  "length": "number",      // Length in units
  "width": "number",       // Width in units  
  "thickness": "number|null", // Thickness in units (optional)
  "images": ["string"]     // Array of image filenames
}
```

### Search Thresholds Schema
```json
{
  "type_": {
    "type": "number",        // 0.0 to 1.0 threshold for type matching
    "material": "number",    // 0.0 to 1.0 threshold for material matching  
    "missing": "boolean"     // Include items with missing type/material data
  },
  "shape": {
    "length": "number",      // 0.0 to 1.0 threshold for length similarity
    "width": "number",       // 0.0 to 1.0 threshold for width similarity
    "thickness": "number",   // 0.0 to 1.0 threshold for thickness similarity
    "missing": "boolean"     // Include items with missing shape data
  },
  "color": {
    "primary": "number",     // 0.0 to 1.0 threshold for primary color similarity
    "secondary": "number",   // 0.0 to 1.0 threshold for secondary color similarity
    "tertiary": "number",    // 0.0 to 1.0 threshold for tertiary color similarity
    "missing": "boolean"     // Include items with missing color data
  },
  "pattern": {
    "primary": "number",     // 0.0 to 1.0 threshold for primary pattern similarity
    "secondary": "number",   // 0.0 to 1.0 threshold for secondary pattern similarity
    "tertiary": "number",    // 0.0 to 1.0 threshold for tertiary pattern similarity
    "missing": "boolean"     // Include items with missing pattern data
  }
}
```

### Material Result Schema
```json
{
  "id": "string",           // Unique material identifier
  "match": "number",        // Match score
  "images": ["string"],     // Array of presigned image URLs
  "scores": {
    "shape": {
      "length": "number|null",
      "width": "number|null",
      "thickness": "number|null"
    },
    "color": {
      "primary": "number|null",
      "secondary": "number|null", 
      "tertiary": "number|null"
    },
    "pattern": {
      "primary": "number|null",
      "secondary": "number|null",
      "tertiary": "number|null"
    }
  }
}
```

### Dashboard Job Schema
```json
{
  "job": "string",          // Job identifier/name
  "created": "string",      // Creation date in YYYY-MM-DD format
  "reference": "string"     // Presigned URL of first reference image
}
```

### Favorites Schema
```json
{
  "product_ids": ["string"] // Array of product identifiers
}
```

## Error Handling

All endpoints return errors in a consistent format:

**Error Response Headers:**
- `Error-Message` - Human readable error description
- `Access-Control-Allow-Origin: *`
- `Content-Type: application/json` or `text/plain`

**Common HTTP Status Codes:**
- `200` - Success
- `202` - Accepted (for challenges)
- `400` - Bad Request (missing or invalid parameters)
- `401` - Unauthorized (invalid credentials/tokens)
- `403` - Forbidden (user not confirmed)
- `404` - Not Found (user/resource not found)
- `410` - Gone (session expired)
- `500` - Internal Server Error

## Security Notes

- All endpoints use CORS headers allowing any origin
- Authentication endpoints use AWS Cognito with HMAC secret hashing
- Protected endpoints require valid JWT tokens in request context
- User data is scoped by username from JWT claims
- Images and data are stored in S3 with user-specific prefixes
- Presigned URLs expire after 1 hour for security