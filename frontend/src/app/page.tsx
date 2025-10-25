'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  useEffect(() => {
    // Only redirect once after store has hydrated
    if (_hasHydrated) {
      console.log('Root page - redirecting based on auth:', isAuthenticated);
      if (isAuthenticated) {
        router.replace('/dashboard');
      } else {
        router.replace('/auth/login');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_hasHydrated]); // Only depend on hydration to prevent loops, read isAuthenticated value once

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Loading...</p>
    </div>
  );
}
