'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Toaster } from '@/components/ui/toaster';

/**
 * Dashboard Layout
 *
 * Best Practices:
 * - Protected route wrapper
 * - Authentication check on mount
 * - Consistent layout for all dashboard pages
 * - Responsive design with fixed sidebar
 * - Toast notifications provider
 *
 * Security:
 * - Redirects to login if not authenticated
 * - SSR-safe auth check
 */

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, user, _hasHydrated } = useAuthStore();

  useEffect(() => {
    console.log('Dashboard layout - Auth check:', {
      _hasHydrated,
      isAuthenticated,
      hasUser: !!user,
    });

    // Only check authentication after store has hydrated
    if (_hasHydrated && (!isAuthenticated || !user)) {
      console.log('Not authenticated, redirecting to login...');
      router.replace('/auth/login');
    }
  }, [isAuthenticated, user, _hasHydrated, router]);

  // Show loading while hydrating
  if (!_hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Don't render dashboard if not authenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="relative min-h-screen bg-background">
      {/* Sidebar - Fixed left */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="ml-64">
        {/* Header - Fixed top */}
        <Header />

        {/* Page Content - Scrollable */}
        <main className="mt-16 min-h-[calc(100vh-4rem)] p-6">
          {children}
        </main>
      </div>

      {/* Toast Notifications */}
      <Toaster />
    </div>
  );
}
