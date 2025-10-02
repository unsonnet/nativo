/**
 * SessionWarning component that shows a warning when session is about to expire
 */

"use client";

import React, { useEffect, useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { useAuth } from '@/hooks/useAuth';

interface SessionWarningProps {
  warningThreshold?: number; // Show warning when less than this many milliseconds remain
  className?: string;
}

export function SessionWarning({ 
  warningThreshold = 5 * 60 * 1000, // 5 minutes default
  className = ''
}: SessionWarningProps) {
  const { user } = useAuth();
  const { timeUntilInactive, refreshSession } = useSession();
  const [showWarning, setShowWarning] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!user) {
      setShowWarning(false);
      return;
    }

    setShowWarning(timeUntilInactive > 0 && timeUntilInactive < warningThreshold);
  }, [timeUntilInactive, warningThreshold, user]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshSession();
      setShowWarning(false);
    } catch (error) {
      console.error('Failed to refresh session:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!showWarning || !user) {
    return null;
  }

  return (
    <div className={`session-warning ${className}`} style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: 'var(--warning-bg, #fff3cd)',
      border: '1px solid var(--warning-border, #ffeeba)',
      color: 'var(--warning-text, #856404)',
      padding: '16px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      zIndex: 1000,
      maxWidth: '300px',
      fontSize: '14px'
    }}>
      <div style={{ fontWeight: '600', marginBottom: '8px' }}>
        Session Expiring Soon
      </div>
      <div style={{ marginBottom: '12px' }}>
        Your session will expire in {formatTime(timeUntilInactive)} due to inactivity.
      </div>
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        style={{
          background: 'var(--primary-color, #007bff)',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '4px',
          cursor: isRefreshing ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          opacity: isRefreshing ? 0.6 : 1
        }}
      >
        {isRefreshing ? 'Refreshing...' : 'Stay Logged In'}
      </button>
    </div>
  );
}