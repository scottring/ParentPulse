'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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
        router.push('/landing');
      }
    }
  }, [user, loading, router]);

  // Show loading spinner while checking auth
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-500">
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <Image
            src="/Relish-logo.png"
            alt="Relish"
            width={100}
            height={100}
            className="object-contain animate-pulse"
            priority
          />
        </div>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-white/80">Loading...</p>
      </div>
    </div>
  );
}
