/**
 * Session Manager for automatic token refresh and activity tracking
 * Handles user activity detection, automatic token refresh, and session timeout
 */

import { tokenService } from './token';
import { refresh } from './auth';

const ACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes of inactivity
const REFRESH_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
const REFRESH_BEFORE_EXPIRY = 10 * 60 * 1000; // Refresh 10 minutes before expiry
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

export class SessionManager {
  private lastActivityTime: number = Date.now();
  private refreshTimer: NodeJS.Timeout | null = null;
  private onSessionExpired: (() => void) | null = null;
  private onRefreshError: (() => void) | null = null;
  private isInitialized = false;
  private isClient = typeof window !== 'undefined';

  /**
   * Initialize the session manager
   */
  initialize(onSessionExpired?: () => void, onRefreshError?: () => void) {
    if (!this.isClient || this.isInitialized) return;

    this.onSessionExpired = onSessionExpired || null;
    this.onRefreshError = onRefreshError || null;
    this.isInitialized = true;

    // Track user activity
    this.setupActivityTracking();

    // Start the refresh interval
    this.startRefreshTimer();

    console.log('SessionManager initialized');
  }

  /**
   * Cleanup timers and event listeners
   */
  cleanup() {
    if (!this.isClient) return;

    // Remove activity listeners
    ACTIVITY_EVENTS.forEach(event => {
      document.removeEventListener(event, this.updateActivity, true);
    });

    // Clear timers
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }

    this.isInitialized = false;
    console.log('SessionManager cleaned up');
  }

  /**
   * Setup activity tracking
   */
  private setupActivityTracking() {
    if (!this.isClient) return;

    // Update activity time on user interaction
    ACTIVITY_EVENTS.forEach(event => {
      document.addEventListener(event, this.updateActivity, true);
    });
  }

  /**
   * Update the last activity timestamp
   */
  private updateActivity = () => {
    this.lastActivityTime = Date.now();
  };

  /**
   * Check if the user has been inactive for too long
   */
  private isInactive(): boolean {
    return Date.now() - this.lastActivityTime > ACTIVITY_TIMEOUT;
  }

  /**
   * Check if the token needs to be refreshed
   */
  private needsRefresh(): boolean {
    const token = tokenService.accessToken;
    if (!token) return false;

    // Parse token to get expiry
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiryTime = payload.exp * 1000; // Convert to milliseconds
      const timeUntilExpiry = expiryTime - Date.now();
      
      // Refresh if token expires in less than REFRESH_BEFORE_EXPIRY
      return timeUntilExpiry < REFRESH_BEFORE_EXPIRY;
    } catch {
      return false;
    }
  }

  /**
   * Start the automatic refresh timer
   */
  private startRefreshTimer() {
    if (!this.isClient) return;

    this.refreshTimer = setInterval(async () => {
      await this.checkAndRefreshSession();
    }, REFRESH_INTERVAL);
  }

  /**
   * Check session status and refresh if needed
   */
  private async checkAndRefreshSession() {
    try {
      // Don't do anything if no tokens exist
      if (!tokenService.accessToken || !tokenService.refreshToken) {
        return;
      }

      // Check if user has been inactive for too long
      if (this.isInactive()) {
        console.log('User inactive for too long, ending session');
        this.endSession();
        return;
      }

      // Check if token is expired or about to expire
      if (tokenService.expired || this.needsRefresh()) {
        console.log('Token needs refresh, attempting refresh...');
        
        const result = await refresh();
        
        if (!result.body) {
          console.log('Token refresh failed');
          this.handleRefreshError();
          return;
        }

        console.log('Token refreshed successfully');
      }
    } catch (error) {
      console.error('Error during session check:', error);
      this.handleRefreshError();
    }
  }

  /**
   * Handle refresh errors
   */
  private handleRefreshError() {
    if (this.onRefreshError) {
      this.onRefreshError();
    } else {
      // Default behavior: end session
      this.endSession();
    }
  }

  /**
   * End the current session
   */
  private endSession() {
    tokenService.clear();
    
    if (this.onSessionExpired) {
      this.onSessionExpired();
    }
  }

  /**
   * Manually refresh the session (can be called from components)
   */
  async manualRefresh(): Promise<boolean> {
    try {
      if (!tokenService.refreshToken) {
        return false;
      }

      const result = await refresh();
      return !!result.body;
    } catch (error) {
      console.error('Manual refresh failed:', error);
      return false;
    }
  }

  /**
   * Reset activity timer (useful when navigating to new pages)
   */
  resetActivity() {
    this.lastActivityTime = Date.now();
  }

  /**
   * Get time until session expires due to inactivity
   */
  getTimeUntilInactive(): number {
    return Math.max(0, ACTIVITY_TIMEOUT - (Date.now() - this.lastActivityTime));
  }

  /**
   * Check if session is currently active
   */
  isSessionActive(): boolean {
    return !this.isInactive() && !tokenService.expired && !!tokenService.accessToken;
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();