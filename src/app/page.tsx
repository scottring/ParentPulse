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
      router.push(user ? '/workbook' : '/login');
    }
  }, [user, loading, router]);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background: 'linear-gradient(170deg, #FAF6F0 0%, #F0E8DD 30%, #E2D9CC 60%, #C8CFC5 100%)',
      }}
    >
      <div className="text-center">
        <div className="mb-8 flex justify-center">
          <Image
            src="/relish-logo-new.png"
            alt="Relish"
            width={120}
            height={80}
            className="object-contain"
            style={{
              filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.08))',
              animation: 'fadeInUp 0.6s ease-out',
            }}
            priority
          />
        </div>
        <div
          className="w-8 h-8 rounded-full mx-auto mb-4"
          style={{
            border: '2px solid rgba(124,144,130,0.2)',
            borderTopColor: '#7C9082',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p
          style={{
            fontFamily: 'var(--font-parent-body)',
            fontSize: '21px',
            color: '#6B6254',
          }}
        >
          Loading...
        </p>
      </div>
    </div>
  );
}
