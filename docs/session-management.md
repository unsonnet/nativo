# Session Management Implementation

This document describes the automatic session management system implemented to prevent unexpected logouts and provide seamless user experience.

## Features

### 1. Activity Tracking
- Monitors user interactions (mouse clicks, keyboard input, scrolling, touch events)
- Tracks last activity timestamp to determine user engagement
- Configurable inactivity timeout (default: 30 minutes)

### 2. Automatic Token Refresh
- Checks token expiration every 5 minutes
- Refreshes tokens 10 minutes before they expire
- Only refreshes if user has been active recently
- Uses your existing `POST /auth/refresh` API endpoint

### 3. Session Expiry Handling
- Automatically logs out users after 30 minutes of inactivity
- Redirects to login page when session expires (no error messages)
- Clears all stored tokens on session expiry

### 4. Session Warning
- Shows a warning popup when session is about to expire (5 minutes before)
- Allows users to extend their session with a "Stay Logged In" button
- Displays countdown timer

## Implementation Details

### Files Modified/Created

1. **`src/lib/auth/sessionManager.ts`** - Core session management logic
2. **`src/lib/auth/AuthProvider.tsx`** - Updated to integrate session manager
3. **`src/lib/auth/auth.ts`** - Improved refresh logic and error handling
4. **`src/lib/auth/token.ts`** - Added username storage for refresh operations
5. **`src/lib/auth/types.ts`** - Updated AuthTokens type to include username
6. **`src/hooks/useSession.ts`** - React hook for session status
7. **`src/components/SessionWarning.tsx`** - Warning component for session expiry
8. **`src/app/layout.tsx`** - Added SessionWarning to main layout

### Configuration

The following constants can be adjusted in `sessionManager.ts`:

```typescript
const ACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes of inactivity
const REFRESH_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
const REFRESH_BEFORE_EXPIRY = 10 * 60 * 1000; // Refresh 10 minutes before expiry
```

### API Requirements

The system uses your existing authentication endpoints:

- **`POST /auth/refresh`** - Requires `username` and `refreshToken`
- Returns new `accessToken` and `idToken`
- Does not return new refresh token (as per your API spec)

## User Experience

### Before
- Users could be unexpectedly logged out
- Token expiry caused API errors
- Manual login required after brief inactivity

### After
- Seamless experience with automatic token refresh
- Users only logged out after true inactivity (30+ minutes)
- Warning system allows users to stay logged in
- Graceful redirect to login page when session expires
- No unexpected error messages

## Testing

To test the system:

1. **Activity Tracking**: Use the app normally - tokens should refresh automatically
2. **Inactivity Warning**: Don't interact for ~25 minutes - warning should appear
3. **Session Expiry**: Don't interact for 30+ minutes - should redirect to login
4. **Manual Refresh**: Use the "Stay Logged In" button when warning appears

## Error Handling

- Network errors during refresh are handled gracefully
- Invalid refresh tokens trigger immediate logout
- Failed refresh attempts redirect to login page
- All auth errors result in clean session termination