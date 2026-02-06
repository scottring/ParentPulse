'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { TechnicalCard, TechnicalButton } from '@/components/technical';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import Link from 'next/link';

export default function RecoverDataPage() {
  const { user } = useAuth();
  const [localStorageData, setLocalStorageData] = useState<Record<string, any>>({});
  const [firestoreData, setFirestoreData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [allLocalStorage, setAllLocalStorage] = useState<Record<string, string>>({});

  useEffect(() => {
    // Check ALL localStorage keys (not just household-onboard ones)
    const allKeys: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          allKeys[key] = value;
        }
      }
    }
    setAllLocalStorage(allKeys);

    // Check household-specific keys
    if (!user?.familyId) {
      setLoading(false);
      return;
    }

    const sections = [
      'home_charter',
      'sanctuary_map',
      'village_wiki',
      'roles_rituals',
      'communication_rhythm',
      'household_pulse',
    ];

    const found: Record<string, any> = {};

    // Check standard household-onboard keys
    sections.forEach((section) => {
      const key = `household-onboard-${user.familyId}-${section}`;
      const data = localStorage.getItem(key);
      if (data) {
        try {
          found[section] = JSON.parse(data);
        } catch {
          found[section] = data;
        }
      }
    });

    // Also check for any key containing 'charter' or 'household'
    Object.keys(allKeys).forEach((key) => {
      if (key.toLowerCase().includes('charter') ||
          key.toLowerCase().includes('household') ||
          key.toLowerCase().includes('onboard')) {
        if (!found[key]) {
          try {
            found[key] = JSON.parse(allKeys[key]);
          } catch {
            found[key] = allKeys[key];
          }
        }
      }
    });

    setLocalStorageData(found);

    // Also fetch from Firestore
    fetchFirestoreData();
  }, [user?.familyId]);

  const fetchFirestoreData = async () => {
    if (!user?.familyId) {
      setLoading(false);
      return;
    }

    try {
      // Check household_manuals collection
      const manualRef = doc(firestore, 'household_manuals', user.familyId);
      const manualDoc = await getDoc(manualRef);

      if (manualDoc.exists()) {
        setFirestoreData(manualDoc.data());
      }
    } catch (err) {
      console.error('Error fetching Firestore data:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportAllData = () => {
    const exportData = {
      localStorage: localStorageData,
      allLocalStorageKeys: Object.keys(allLocalStorage),
      firestore: firestoreData,
      exportedAt: new Date().toISOString(),
      familyId: user?.familyId,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `full-data-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const localDataCount = Object.keys(localStorageData).length;
  const hasFirestoreData = firestoreData && Object.keys(firestoreData).length > 0;
  const hasHomeCharter = firestoreData?.homeCharter || localStorageData['home_charter'];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-300 border-t-amber-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="font-mono text-sm">Searching for your data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <TechnicalCard shadowSize="lg" className="p-6 md:p-8">
          <h1 className="font-mono text-2xl font-bold text-slate-800 mb-2">
            Data Recovery Tool
          </h1>
          <p className="text-slate-600 mb-6">
            Family ID: <code className="bg-slate-100 px-2 py-1">{user?.familyId || 'Not logged in'}</code>
          </p>

          {!user ? (
            <div className="bg-amber-50 border border-amber-200 p-4 mb-6">
              <p className="text-amber-800">Please log in to see your saved data.</p>
              <Link href="/login" className="text-amber-600 underline mt-2 inline-block">
                Go to Login
              </Link>
            </div>
          ) : (
            <>
              {/* Home Charter Status - Most Important */}
              <div className={`p-4 mb-6 border-2 ${hasHomeCharter ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'}`}>
                <h2 className="font-mono font-bold text-lg mb-2">
                  {hasHomeCharter ? '✓ HOME CHARTER DATA FOUND' : '✗ HOME CHARTER NOT FOUND'}
                </h2>
                {hasHomeCharter ? (
                  <div>
                    <p className="text-sm text-green-800 mb-2">Your Home Charter data exists!</p>
                    <pre className="bg-white p-3 text-xs overflow-auto max-h-64 border">
                      {JSON.stringify(firestoreData?.homeCharter || localStorageData['home_charter'], null, 2)}
                    </pre>
                  </div>
                ) : (
                  <p className="text-sm text-red-800">
                    Home Charter data was not found in localStorage or Firestore.
                    It may not have been saved before the error occurred.
                  </p>
                )}
              </div>

              {/* Firestore Data */}
              <div className="mb-6">
                <h2 className="font-mono font-bold text-lg mb-3 flex items-center gap-2">
                  <span className={hasFirestoreData ? 'text-green-600' : 'text-red-600'}>
                    {hasFirestoreData ? '✓' : '✗'}
                  </span>
                  Firestore Database
                </h2>
                {hasFirestoreData ? (
                  <div className="border-2 border-slate-200 p-4">
                    <p className="text-sm text-green-700 mb-3">
                      Found household manual in database with sections:
                    </p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {firestoreData.homeCharter && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-mono">homeCharter</span>
                      )}
                      {firestoreData.sanctuaryMap && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-mono">sanctuaryMap</span>
                      )}
                      {firestoreData.villageWiki && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-mono">villageWiki</span>
                      )}
                      {firestoreData.rolesAndRituals && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-mono">rolesAndRituals</span>
                      )}
                      {firestoreData.communicationRhythm && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-mono">communicationRhythm</span>
                      )}
                      {firestoreData.householdPulse && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-mono">householdPulse</span>
                      )}
                    </div>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-slate-600 hover:text-slate-800">
                        View raw Firestore data
                      </summary>
                      <pre className="bg-slate-100 p-3 text-xs overflow-auto max-h-64 mt-2">
                        {JSON.stringify(firestoreData, null, 2)}
                      </pre>
                    </details>
                  </div>
                ) : (
                  <div className="bg-slate-100 border border-slate-300 p-4">
                    <p className="text-slate-600">No household manual found in Firestore database.</p>
                  </div>
                )}
              </div>

              {/* LocalStorage Data */}
              <div className="mb-6">
                <h2 className="font-mono font-bold text-lg mb-3 flex items-center gap-2">
                  <span className={localDataCount > 0 ? 'text-green-600' : 'text-amber-600'}>
                    {localDataCount > 0 ? '✓' : '○'}
                  </span>
                  Browser LocalStorage ({localDataCount} items)
                </h2>
                {localDataCount > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(localStorageData).map(([key, data]) => (
                      <div key={key} className="border-2 border-slate-200 p-4">
                        <h3 className="font-mono font-bold text-slate-800 mb-2 uppercase">
                          {key.replace(/_/g, ' ')}
                        </h3>
                        <pre className="bg-slate-100 p-3 text-xs overflow-auto max-h-48 font-mono">
                          {JSON.stringify(data, null, 2)}
                        </pre>
                        {key.includes('home_charter') && (
                          <Link
                            href="/household/onboard/home_charter"
                            className="inline-block mt-2 text-amber-600 hover:underline text-sm"
                          >
                            Continue Home Charter →
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-100 border border-slate-300 p-4">
                    <p className="text-slate-600 mb-2">No household onboarding data in localStorage.</p>
                    <p className="text-xs text-slate-500">
                      LocalStorage data is cleared after successful saves or when you clear browser data.
                    </p>
                  </div>
                )}
              </div>

              {/* All localStorage keys (for debugging) */}
              <details className="mb-6">
                <summary className="cursor-pointer font-mono text-sm text-slate-500 hover:text-slate-700">
                  Show all localStorage keys ({Object.keys(allLocalStorage).length} total)
                </summary>
                <div className="mt-2 bg-slate-100 p-3 max-h-48 overflow-auto">
                  {Object.keys(allLocalStorage).map((key) => (
                    <div key={key} className="text-xs font-mono text-slate-600 py-1 border-b border-slate-200">
                      {key}
                    </div>
                  ))}
                </div>
              </details>

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <TechnicalButton variant="primary" onClick={exportAllData}>
                  EXPORT ALL DATA AS JSON
                </TechnicalButton>
                <TechnicalButton variant="outline" onClick={fetchFirestoreData}>
                  REFRESH FIRESTORE DATA
                </TechnicalButton>
                <TechnicalButton
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  REFRESH PAGE
                </TechnicalButton>
              </div>

              {/* What to do section */}
              <div className="mt-8 pt-6 border-t border-slate-200">
                <h2 className="font-mono font-bold text-lg mb-3">What happened?</h2>
                <div className="text-sm text-slate-600 space-y-2">
                  <p>
                    When you fill out the onboarding questions, answers are saved to <strong>localStorage</strong> as you go.
                    When you click &quot;Generate&quot;, the AI processes your answers and saves to <strong>Firestore</strong>.
                  </p>
                  <p>
                    If the AI generation failed, your <strong>localStorage answers should still be there</strong>.
                    But if the error occurred after localStorage was cleared (during the &quot;review&quot; step),
                    the data may have been lost.
                  </p>
                  <p className="text-red-600 font-medium">
                    If you don&apos;t see your Home Charter data above, it likely wasn&apos;t saved before the error.
                    I&apos;m sorry - this is a bug I&apos;ve now fixed to prevent future data loss.
                  </p>
                </div>
              </div>
            </>
          )}

          <div className="mt-6 pt-4 border-t border-slate-200">
            <Link href="/household" className="text-slate-500 hover:text-slate-700 text-sm">
              ← Back to Household Manual
            </Link>
          </div>
        </TechnicalCard>
      </div>
    </div>
  );
}
