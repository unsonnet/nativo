/**
 * User API Service
 * Handles user profile and account-related REST API calls
 */

import { apiClient } from './client';
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
   * GET /api/user/profile
   */
  static async getProfile(): Promise<K9Response<UserProfile>> {
    return apiClient.get<UserProfile>('/user/profile');
  }

  /**
   * Update user profile
   * PATCH /api/user/profile
   */
  static async updateProfile(updates: UpdateProfileRequest): Promise<K9Response<UserProfile>> {
    return apiClient.patch<UserProfile>('/user/profile', updates);
  }

  /**
   * Upload user avatar
   * POST /api/user/avatar
   */
  static async uploadAvatar(file: File): Promise<K9Response<{ avatarUrl: string }>> {
    const formData = new FormData();
    formData.append('avatar', file);
    return apiClient.upload<{ avatarUrl: string }>('/user/avatar', formData);
  }

  /**
   * Delete user account
   * DELETE /api/user/account
   */
  static async deleteAccount(): Promise<K9Response<{ success: boolean }>> {
    return apiClient.delete<{ success: boolean }>('/user/account');
  }
}

export const userApiService = UserApiService;