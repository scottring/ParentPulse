'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { usePerson } from '@/hooks/usePerson';
import MainLayout from '@/components/layout/MainLayout';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { people, loading: peopleLoading } = usePerson();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || peopleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFF8F0' }}>
        <div className="text-center">
          <div className="manual-spinner"></div>
          <p className="mt-4 font-mono text-sm text-slate-600">LOADING DOCUMENTATION...</p>
        </div>
        <style jsx>{`
          .manual-spinner {
            width: 48px;
            height: 48px;
            border: 4px solid #1e293b;
            border-top-color: #d97706;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) return null;

  const activeManualsCount = people.filter(p => p.hasManual).length;
  const pendingSetupCount = people.filter(p => !p.hasManual).length;

  return (
    <MainLayout>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Technical Header */}
        <header className="mb-12">
          <div className="relative bg-white border-4 border-slate-800 p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-amber-600"></div>
            <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-amber-600"></div>
            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-amber-600"></div>
            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-amber-600"></div>

            <div className="flex items-center justify-between">
              <div>
                <div className="inline-block px-3 py-1 bg-slate-800 text-white font-mono text-xs mb-3">
                  DOCUMENTATION INDEX
                </div>
                <h1 className="font-mono text-4xl font-bold tracking-tight mb-2">
                  Your Family Manuals
                </h1>
                <p className="font-mono text-sm text-slate-600">
                  Operating guides for understanding and supporting the people you care about
                </p>
              </div>
              <Link
                href="/people"
                className="px-6 py-3 bg-slate-800 text-white font-mono font-bold hover:bg-amber-600 transition-all hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] whitespace-nowrap"
                data-testid="add-person-button"
              >
                + ADD PERSON
              </Link>
            </div>
          </div>
        </header>

        {/* Technical Statistics Panel */}
        {people.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {/* Stat 1: Total People */}
            <div className="relative bg-white border-2 border-slate-800 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="absolute -top-3 -left-3 w-10 h-10 bg-slate-800 text-white font-mono font-bold flex items-center justify-center border-2 border-amber-600">
                1
              </div>
              <div className="font-mono text-xs text-slate-600 mb-2 uppercase tracking-wider">
                SPECIFICATION
              </div>
              <div className="flex items-baseline gap-3">
                <div className="text-5xl font-bold font-mono text-slate-900">
                  {people.length}
                </div>
                <div className="font-mono text-sm text-slate-600">
                  TOTAL<br/>PEOPLE
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="font-mono text-xs text-slate-500">
                  REGISTERED INDIVIDUALS
                </div>
              </div>
            </div>

            {/* Stat 2: Active Manuals */}
            <div className="relative bg-white border-2 border-slate-800 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="absolute -top-3 -left-3 w-10 h-10 bg-slate-800 text-white font-mono font-bold flex items-center justify-center border-2 border-amber-600">
                2
              </div>
              <div className="font-mono text-xs text-slate-600 mb-2 uppercase tracking-wider">
                SPECIFICATION
              </div>
              <div className="flex items-baseline gap-3">
                <div className="text-5xl font-bold font-mono text-green-700">
                  {activeManualsCount}
                </div>
                <div className="font-mono text-sm text-slate-600">
                  ACTIVE<br/>MANUALS
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="font-mono text-xs text-slate-500">
                  OPERATIONAL DOCUMENTS
                </div>
              </div>
            </div>

            {/* Stat 3: Awaiting Setup */}
            <div className="relative bg-white border-2 border-slate-800 p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="absolute -top-3 -left-3 w-10 h-10 bg-slate-800 text-white font-mono font-bold flex items-center justify-center border-2 border-amber-600">
                3
              </div>
              <div className="font-mono text-xs text-slate-600 mb-2 uppercase tracking-wider">
                SPECIFICATION
              </div>
              <div className="flex items-baseline gap-3">
                <div className="text-5xl font-bold font-mono text-amber-600">
                  {pendingSetupCount}
                </div>
                <div className="font-mono text-sm text-slate-600">
                  AWAITING<br/>SETUP
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="font-mono text-xs text-slate-500">
                  PENDING INITIALIZATION
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Manual Directory */}
        {people.length === 0 ? (
          // Empty state
          <div className="relative bg-amber-50 border-4 border-amber-600 p-16 text-center shadow-[8px_8px_0px_0px_rgba(217,119,6,1)]">
            <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-slate-800"></div>
            <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-slate-800"></div>
            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-slate-800"></div>
            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-slate-800"></div>

            <div className="inline-block px-3 py-1 bg-amber-600 text-white font-mono text-xs mb-6">
              SYSTEM STATUS
            </div>
            <h2 className="font-mono text-3xl font-bold mb-4 text-slate-900">
              NO DOCUMENTATION FOUND
            </h2>
            <p className="font-mono text-sm text-slate-700 mb-8 max-w-md mx-auto">
              Initialize the system by adding your first person and generating their operating manual
            </p>
            <Link
              href="/people"
              className="inline-block px-8 py-4 bg-slate-800 text-white font-mono font-bold hover:bg-amber-600 transition-all hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              ADD FIRST PERSON →
            </Link>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Active Manuals Section */}
            {activeManualsCount > 0 && (
              <section>
                <div className="flex items-center gap-4 mb-6">
                  <div className="inline-block px-3 py-1 bg-slate-800 text-white font-mono text-xs">
                    SECTION 1
                  </div>
                  <h2 className="font-mono text-2xl font-bold">
                    Active Manuals ({activeManualsCount})
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {people.filter(p => p.hasManual).map((person, index) => (
                    <div
                      key={person.personId}
                      className="relative bg-white border-2 border-slate-300 hover:border-slate-800 transition-all group shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                      data-testid="person-card"
                    >
                      {/* Manual number label */}
                      <div className="absolute -top-3 -left-3 w-10 h-10 bg-slate-800 text-white font-mono font-bold flex items-center justify-center border-2 border-green-600">
                        {String(index + 1).padStart(2, '0')}
                      </div>

                      <div className="p-6">
                        {/* Status badge */}
                        <div className="inline-block px-2 py-1 bg-green-600 text-white font-mono text-xs mb-4">
                          ACTIVE
                        </div>

                        {/* Person info */}
                        <h3 className="font-mono text-xl font-bold mb-1 text-slate-900">
                          {person.name}
                        </h3>
                        <p className="font-mono text-xs text-slate-600 uppercase tracking-wider mb-6">
                          {person.relationshipType || 'OTHER'}
                        </p>

                        {/* Technical details */}
                        <div className="space-y-2 mb-6 pb-6 border-b border-slate-200">
                          <div className="flex justify-between font-mono text-xs">
                            <span className="text-slate-500">MANUAL ID:</span>
                            <span className="text-slate-900">{person.personId.slice(0, 8).toUpperCase()}</span>
                          </div>
                          <div className="flex justify-between font-mono text-xs">
                            <span className="text-slate-500">STATUS:</span>
                            <span className="text-green-700">OPERATIONAL</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <Link
                          href={`/people/${person.personId}/manual`}
                          className="block w-full text-center px-4 py-3 bg-slate-800 text-white font-mono font-bold hover:bg-green-700 transition-all"
                          data-testid="view-manual-button"
                        >
                          VIEW MANUAL →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Ready for Setup Section */}
            {pendingSetupCount > 0 && (
              <section>
                <div className="flex items-center gap-4 mb-6">
                  <div className="inline-block px-3 py-1 bg-amber-600 text-white font-mono text-xs">
                    SECTION 2
                  </div>
                  <h2 className="font-mono text-2xl font-bold">
                    Ready for Setup ({pendingSetupCount})
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {people.filter(p => !p.hasManual).map((person, index) => (
                    <div
                      key={person.personId}
                      className="relative bg-amber-50 border-2 border-amber-600 hover:border-slate-800 transition-all group shadow-[4px_4px_0px_0px_rgba(217,119,6,0.5)] hover:shadow-[6px_6px_0px_0px_rgba(217,119,6,1)]"
                      data-testid="person-card"
                    >
                      {/* Setup number label */}
                      <div className="absolute -top-3 -left-3 w-10 h-10 bg-amber-600 text-white font-mono font-bold flex items-center justify-center border-2 border-slate-800">
                        {String(index + 1).padStart(2, '0')}
                      </div>

                      <div className="p-6">
                        {/* Status badge */}
                        <div className="inline-block px-2 py-1 bg-slate-800 text-white font-mono text-xs mb-4">
                          PENDING
                        </div>

                        {/* Person info */}
                        <h3 className="font-mono text-xl font-bold mb-1 text-slate-900">
                          {person.name}
                        </h3>
                        <p className="font-mono text-xs text-slate-600 uppercase tracking-wider mb-6">
                          {person.relationshipType || 'OTHER'}
                        </p>

                        {/* Technical details */}
                        <div className="space-y-2 mb-6 pb-6 border-b border-amber-200">
                          <div className="flex justify-between font-mono text-xs">
                            <span className="text-slate-500">PERSON ID:</span>
                            <span className="text-slate-900">{person.personId.slice(0, 8).toUpperCase()}</span>
                          </div>
                          <div className="flex justify-between font-mono text-xs">
                            <span className="text-slate-500">STATUS:</span>
                            <span className="text-amber-700">UNINITIALIZED</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <Link
                          href={`/people/${person.personId}/create-manual`}
                          className="block w-full text-center px-4 py-3 bg-amber-600 text-white font-mono font-bold hover:bg-slate-800 transition-all"
                          data-testid="create-manual-button"
                        >
                          CREATE MANUAL →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
