/**
 * User API Service - Updated to use Original API Adapter
 * 
 * The original API only provides authentication endpoints, so most user profile
 * functionality needs to be implemented in the backend.
 */

import type { User, K9Response } from '@/lib/auth/types';

export interface UserProfile extends User {
  createdAt: string;
  updatedAt: string;
  preferences?: {
    defaultReportTitle?: string;
    autoSaveFavorites?: boolean;
    exportFormat?: 'zip' | 'pdf' | 'excel';
  };
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  avatarUrl?: string;
  preferences?: UserProfile['preferences'];
}

export class UserApiService {
  /**
   * Get current user profile
   * NOTE: Original API doesn't have user profile endpoints
   * TODO: Implement backend user profile storage and retrieval
   */
  static async getProfile(): Promise<K9Response<UserProfile>> {
    // TODO: Implement backend user profile endpoint
    console.warn('[API] getProfile not implemented - need backend user profile storage');
    
    // For now, return a default profile based on auth context
    return {
      status: 200,
      body: {
        id: 'current-user', // TODO: Get from JWT token
        name: 'Current User', // TODO: Get from JWT token or profile storage
        email: 'user@example.com', // TODO: Get from JWT token
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        preferences: {
          defaultReportTitle: 'New Material Search',
          autoSaveFavorites: true,
          exportFormat: 'zip'
        }
      },
      error: undefined
    };
  }

  /**
   * Update user profile
   * NOTE: Original API doesn't have user profile endpoints
   * TODO: Implement backend user profile storage and updates
   */
  static async updateProfile(updates: UpdateProfileRequest): Promise<K9Response<UserProfile>> {
    // TODO: Implement backend user profile update endpoint
    console.warn('[API] updateProfile not implemented - need backend user profile storage');
    
    // For now, return success but no actual update
    return {
      status: 200,
      body: {
        id: 'current-user',
        name: updates.name || 'Current User',
        email: updates.email || 'user@example.com',
        avatarUrl: updates.avatarUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        preferences: updates.preferences || {
          defaultReportTitle: 'New Material Search',
          autoSaveFavorites: true,
          exportFormat: 'zip'
        }
      },
      error: undefined
    };
  }

  /**
   * Upload user avatar
   * NOTE: Original API doesn't have user profile endpoints
   * TODO: Implement backend user avatar storage
   */
  static async uploadAvatar(_file: File): Promise<K9Response<{ avatarUrl: string }>> {
    // TODO: Implement backend avatar upload (could use S3 like the album images)
    console.warn('[API] uploadAvatar not implemented - need backend avatar storage');
    
    return {
      status: 501,
      body: { avatarUrl: '' },
      error: 'Avatar upload not implemented'
    };
  }

  /**
   * Delete user account
   * NOTE: Original API doesn't have account management endpoints
   * TODO: Implement backend account deletion
   */
  static async deleteAccount(): Promise<K9Response<{ success: boolean }>> {
    // TODO: Implement backend account deletion (would need to clean up Cognito user too)
    console.warn('[API] deleteAccount not implemented - need backend account management');
    
    return {
      status: 501,
      body: { success: false },
      error: 'Account deletion not implemented'
    };
  }
}

export const userApiService = UserApiService;