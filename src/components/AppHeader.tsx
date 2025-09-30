"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { reportsApi } from "@/lib/api/reports";

export function AppHeader() {
  const { user, loading, signInWithDummy, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [reportTitle, setReportTitle] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Track hydration to ensure consistent rendering
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Handle clicking outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showUserMenu]);

  // Fetch report title when on report page
  useEffect(() => {
    if (pathname.startsWith('/report')) {
      const getReportTitle = async () => {
        try {
          // Get report ID from URL hash or search params
          // Only access window.location on the client side
          const hashId = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
          const paramId = searchParams.get('id');
          const reportId = hashId || paramId;
          
          if (reportId) {
            const report = await reportsApi.getFullReport(reportId);
            setReportTitle(report?.title || null);
          }
        } catch (error) {
          console.error('Failed to fetch report title:', error);
          setReportTitle(null);
        }
      };
      
      getReportTitle();
    } else {
      setReportTitle(null);
    }
  }, [pathname, searchParams]);

  const shouldShowBackButton = () => {
    console.log('Checking back button for pathname:', pathname);
    const shouldShow = pathname !== '/dashboard' && pathname !== '/dashboard/' && pathname !== '/';
    console.log('Should show back button:', shouldShow);
    return shouldShow;
  };

  const handleBackClick = () => {
    if (pathname === '/create' || pathname.startsWith('/report')) {
      router.push('/dashboard');
    } else {
      router.back();
    }
  };

  const getPageTitle = () => {
    // Debug logging to see what pathname we're getting
    console.log('Current pathname:', pathname);
    
    if (pathname === '/dashboard' || pathname === '/dashboard/' || pathname === '/') {
      console.log('Dashboard detected!');
      return 'Dashboard';
    }
    if (pathname === '/create' || pathname === '/create/') {
      console.log('Create page detected!');
      return 'Create Report';
    }
    if (pathname.startsWith('/report')) {
      console.log('Report page detected!');
      return reportTitle ? (
        <>
          <span>Report:</span>
          <span className="app-header-universal__subtitle">{reportTitle}</span>
        </>
      ) : 'Report';
    }
    if (pathname.startsWith('/edit')) return 'Edit Report';
    
    console.log('Fallback to FloorPlan Reports');
    return 'FloorPlan Reports';
  };

  return (
    <header className="app-header-universal">
      <div className="app-header-universal__left">
        {shouldShowBackButton() ? (
          <button
            onClick={handleBackClick}
            className="app-header-universal__back-btn"
            title="Go back"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        ) : (
          <div className="app-header-universal__back-btn-spacer" />
        )}
        
        <div className="app-header-universal__logo">
          <div className="app-header-universal__logo-icon">
            {/* Company logo placeholder - replace with actual logo */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M9 9h6v6H9z" fill="currentColor"/>
            </svg>
          </div>
          <h1 className="app-header-universal__title">{getPageTitle()}</h1>
        </div>
      </div>

      <div className="app-header-universal__right">
        {!isHydrated || loading ? (
          <div className="app-header-universal__user">
            <span className="app-header-universal__username">Loading...</span>
            <div className="app-header-universal__avatar skeleton" />
          </div>
        ) : user ? (
          <div className="app-header-universal__user">
            <div className="app-header-universal__user-menu" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="app-header-universal__user-button"
                title="User menu"
              >
                <span className="app-header-universal__username">{user.name}</span>
                <div className="app-header-universal__avatar">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              </button>
              
              {showUserMenu && (
                <div className="app-header-universal__user-menu-dropdown">
                  <div className="app-header-universal__user-info">
                    <strong>{user.name}</strong>
                    <span>{user.email || 'No email'}</span>
                  </div>
                  <hr className="app-header-universal__user-menu-divider" />
                  <button
                    onClick={() => {
                      // TODO: Navigate to settings
                      setShowUserMenu(false);
                    }}
                    className="app-header-universal__user-menu-item"
                  >
                    Settings
                  </button>
                  <button
                    onClick={() => {
                      signOut();
                      setShowUserMenu(false);
                    }}
                    className="app-header-universal__user-menu-item app-header-universal__user-menu-item--danger"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="app-header-universal__user">
            <span className="app-header-universal__username">Guest</span>
            <button
              onClick={() => signInWithDummy()}
              className="app-header-universal__avatar app-header-universal__avatar--guest"
              title="Sign in"
            >
              ?
            </button>
          </div>
        )}
        {/* Right spacer for symmetry */}
        <div className="app-header-universal__right-spacer" />
      </div>
    </header>
  );
}