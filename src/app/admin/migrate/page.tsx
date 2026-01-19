'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { migrateRoleSectionsAddPersonId } from '@/utils/migrate-role-sections';
import Link from 'next/link';

export default function MigratePage() {
  const { user } = useAuth();
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState<{
    total: number;
    updated: number;
    skipped: number;
    errors: Array<{ id: string; error: string }>;
  } | null>(null);

  const runMigration = async () => {
    if (!user?.familyId) {
      alert('You must be logged in to run migrations');
      return;
    }

    if (!confirm('This will add personId to all existing role sections. Continue?')) {
      return;
    }

    setMigrating(true);
    setResult(null);

    try {
      const migrationResult = await migrateRoleSectionsAddPersonId(user.familyId);
      setResult(migrationResult);
    } catch (error) {
      console.error('Migration error:', error);
      alert('Migration failed. Check console for details.');
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="min-h-screen parent-page">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-6">
          <Link href="/people" className="text-blue-600 hover:underline">
            ← Back to People
          </Link>
        </div>

        <div className="parent-card p-8">
          <h1 className="parent-heading text-3xl mb-4" style={{ color: 'var(--parent-text)' }}>
            Data Migration
          </h1>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-3" style={{ color: 'var(--parent-text)' }}>
              Add personId to Role Sections
            </h2>
            <p className="text-base mb-4" style={{ color: 'var(--parent-text-light)' }}>
              This migration adds the <code className="bg-gray-100 px-2 py-1 rounded">personId</code> field to all existing role sections.
              This field is required for proper navigation and was added in a recent update.
            </p>
            <p className="text-sm mb-4" style={{ color: 'var(--parent-text-light)' }}>
              <strong>Note:</strong> This only needs to be run once. Role sections that already have personId will be skipped.
            </p>

            <button
              onClick={runMigration}
              disabled={migrating || !user}
              className="px-6 py-3 rounded-lg font-semibold text-white transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--parent-accent)' }}
            >
              {migrating ? 'Running Migration...' : 'Run Migration'}
            </button>
          </div>

          {result && (
            <div className="border-t pt-6" style={{ borderColor: 'var(--parent-border)' }}>
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--parent-text)' }}>
                Migration Results
              </h3>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📊</span>
                  <div>
                    <p className="font-medium" style={{ color: 'var(--parent-text)' }}>
                      Total role sections: {result.total}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-2xl">✅</span>
                  <div>
                    <p className="font-medium text-green-600">
                      Updated: {result.updated}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-2xl">⏭️</span>
                  <div>
                    <p className="font-medium" style={{ color: 'var(--parent-text-light)' }}>
                      Skipped (already had personId): {result.skipped}
                    </p>
                  </div>
                </div>

                {result.errors.length > 0 && (
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">❌</span>
                    <div className="flex-1">
                      <p className="font-medium text-red-600 mb-2">
                        Errors: {result.errors.length}
                      </p>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
                        {result.errors.map((err, idx) => (
                          <div key={idx} className="text-sm">
                            <p className="font-mono text-red-800">ID: {err.id}</p>
                            <p className="text-red-600">{err.error}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {result.updated > 0 && result.errors.length === 0 && (
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800 font-medium">
                      ✨ Migration completed successfully! All role sections now have personId.
                    </p>
                    <p className="text-green-700 text-sm mt-2">
                      You can now navigate to role section pages without issues.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
