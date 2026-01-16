'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Redirect based on role
        if (user.role === 'parent') {
          router.push('/dashboard');
        } else {
          router.push('/child');
        }
      } else {
        router.push('/login');
      }
    }
  }, [user, loading, router]);

  // Show loading spinner while checking auth
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-500">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
        <h1 className="text-3xl font-bold text-white mb-2">ParentPulse</h1>
        <p className="text-white/80">Loading...</p>
      </div>
    </div>
  );
}
