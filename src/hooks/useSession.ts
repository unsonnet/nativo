/**
 * Hook for accessing session status and management functions
 */

import { useEffect, useState } from 'react';
import { sessionManager } from '@/lib/auth/sessionManager';

export interface SessionStatus {
  isActive: boolean;
  timeUntilInactive: number;
  lastActivity: Date;
}

export function useSession() {
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>({
    isActive: true,
    timeUntilInactive: 30 * 60 * 1000, // 30 minutes
    lastActivity: new Date(),
  });

  useEffect(() => {
    const updateStatus = () => {
      setSessionStatus({
        isActive: sessionManager.isSessionActive(),
        timeUntilInactive: sessionManager.getTimeUntilInactive(),
        lastActivity: new Date(),
      });
    };

    // Update immediately
    updateStatus();

    // Update every minute
    const interval = setInterval(updateStatus, 60000);

    return () => clearInterval(interval);
  }, []);

  const refreshSession = async () => {
    const success = await sessionManager.manualRefresh();
    if (success) {
      sessionManager.resetActivity();
    }
    return success;
  };

  const resetActivity = () => {
    sessionManager.resetActivity();
  };

  return {
    ...sessionStatus,
    refreshSession,
    resetActivity,
  };
}