'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

interface User {
  id: string;
  email: string;
  displayName: string;
  role: string;
  familyId: string;
  createdAt: any;
}

interface PersonManual {
  id: string;
  personId: string;
  personName: string;
  relationshipType: string;
  createdAt: any;
  lastModified: any;
}

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [manuals, setManuals] = useState<PersonManual[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  // Check admin access
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
    // Redirect non-admin users
    if (!authLoading && user && !user.isAdmin) {
      alert('Access denied. Admin privileges required.');
      router.push('/people');
    }
  }, [user, authLoading, router]);

  // Fetch users and manuals
  useEffect(() => {
    if (user?.familyId) {
      fetchData();
    }
  }, [user?.familyId]);

  const fetchData = async () => {
    if (!user?.familyId) return;

    setLoading(true);
    setError(null);

    try {
      const listUsers = httpsCallable<{ familyId: string }, { success: boolean; users: User[]; error?: string }>(
        functions,
        'admin_listUsers'
      );

      const listManuals = httpsCallable<{ familyId: string }, { success: boolean; manuals: PersonManual[]; error?: string }>(
        functions,
        'admin_listManuals'
      );

      const [usersResult, manualsResult] = await Promise.all([
        listUsers({ familyId: user.familyId }),
        listManuals({ familyId: user.familyId })
      ]);

      if (usersResult.data.success && usersResult.data.users) {
        setUsers(usersResult.data.users);
      } else {
        throw new Error(usersResult.data.error || 'Failed to fetch users');
      }

      if (manualsResult.data.success && manualsResult.data.manuals) {
        setManuals(manualsResult.data.manuals);
      } else {
        throw new Error(manualsResult.data.error || 'Failed to fetch manuals');
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete user "${email}"? This action cannot be undone.`)) {
      return;
    }

    setActionInProgress(true);
    try {
      const deleteUser = httpsCallable<{ userId: string }, { success: boolean; error?: string }>(
        functions,
        'admin_deleteUser'
      );

      const result = await deleteUser({ userId });

      if (result.data.success) {
        alert('User deleted successfully');
        await fetchData(); // Refresh the list
      } else {
        throw new Error(result.data.error || 'Failed to delete user');
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleDeleteManual = async (manualId: string, personName: string) => {
    if (!confirm(`Are you sure you want to delete the manual for "${personName}"? This action cannot be undone.`)) {
      return;
    }

    setActionInProgress(true);
    try {
      const deleteManual = httpsCallable<{ manualId: string }, { success: boolean; error?: string }>(
        functions,
        'admin_deleteManual'
      );

      const result = await deleteManual({ manualId });

      if (result.data.success) {
        alert('Manual deleted successfully');
        await fetchData(); // Refresh the list
      } else {
        throw new Error(result.data.error || 'Failed to delete manual');
      }
    } catch (err) {
      console.error('Error deleting manual:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete manual');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleResetDatabase = async () => {
    if (!confirm('⚠️ WARNING: This will delete ALL users and manuals in your family. This action cannot be undone!')) {
      return;
    }

    if (!confirm('Are you ABSOLUTELY SURE? Type "DELETE ALL" to confirm.')) {
      return;
    }

    const confirmText = prompt('Type "DELETE ALL" to confirm:');
    if (confirmText !== 'DELETE ALL') {
      alert('Confirmation text did not match. Database reset cancelled.');
      return;
    }

    setActionInProgress(true);
    try {
      const resetDatabase = httpsCallable<{ familyId: string }, { success: boolean; deleted: { users: number; manuals: number }; error?: string }>(
        functions,
        'admin_resetDatabase'
      );

      const result = await resetDatabase({ familyId: user!.familyId });

      if (result.data.success) {
        alert(`Database reset complete!\nDeleted ${result.data.deleted.users} users and ${result.data.deleted.manuals} manuals.`);
        await fetchData(); // Refresh the list
      } else {
        throw new Error(result.data.error || 'Failed to reset database');
      }
    } catch (err) {
      console.error('Error resetting database:', err);
      alert(err instanceof Error ? err.message : 'Failed to reset database');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleResetUserData = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to reset all data for user "${email}"? This will delete all their manuals and progress.`)) {
      return;
    }

    setActionInProgress(true);
    try {
      const resetUserData = httpsCallable<{ userId: string }, { success: boolean; deleted: { manuals: number }; error?: string }>(
        functions,
        'admin_resetUserData'
      );

      const result = await resetUserData({ userId });

      if (result.data.success) {
        alert(`User data reset complete!\nDeleted ${result.data.deleted.manuals} manuals.`);
        await fetchData(); // Refresh the list
      } else {
        throw new Error(result.data.error || 'Failed to reset user data');
      }
    } catch (err) {
      console.error('Error resetting user data:', err);
      alert(err instanceof Error ? err.message : 'Failed to reset user data');
    } finally {
      setActionInProgress(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen parent-page flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-2">⏳</div>
          <p style={{ color: 'var(--parent-text)' }}>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  // Check if user has admin privileges
  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen parent-page flex items-center justify-center">
        <div className="parent-card p-8 text-center max-w-md">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--parent-text)' }}>Access Denied</h1>
          <p className="mb-6" style={{ color: 'var(--parent-text-light)' }}>
            Admin privileges are required to access this page.
          </p>
          <Link
            href="/people"
            className="inline-block px-6 py-3 rounded-lg font-semibold text-white transition-all hover:shadow-lg"
            style={{ backgroundColor: 'var(--parent-accent)' }}
          >
            Return to People
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen parent-page">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="parent-card p-8 text-center">
            <div className="text-4xl mb-4">❌</div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--parent-text)' }}>Error Loading Data</h1>
            <p className="text-red-600 mb-6">{error}</p>
            <button
              onClick={fetchData}
              className="px-6 py-3 rounded-lg font-semibold text-white transition-all hover:shadow-lg"
              style={{ backgroundColor: 'var(--parent-accent)' }}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen parent-page">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="parent-heading text-4xl mb-2" style={{ color: 'var(--parent-text)' }}>
              Admin Dashboard
            </h1>
            <p className="text-lg" style={{ color: 'var(--parent-text-light)' }}>
              Manage users, manuals, and database operations
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/people"
              className="px-4 py-2 rounded-lg border-2 font-medium transition-all hover:shadow-md"
              style={{
                borderColor: 'var(--parent-border)',
                color: 'var(--parent-text)',
                backgroundColor: 'var(--parent-bg)'
              }}
            >
              ← Back to People
            </Link>
            <Link
              href="/admin/migrate"
              className="px-4 py-2 rounded-lg border-2 font-medium transition-all hover:shadow-md"
              style={{
                borderColor: 'var(--parent-border)',
                color: 'var(--parent-text)',
                backgroundColor: 'var(--parent-bg)'
              }}
            >
              Data Migrations
            </Link>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="parent-card p-8 mb-8 border-2 border-red-500">
          <h2 className="text-2xl font-bold mb-4 text-red-600 flex items-center gap-2">
            ⚠️ Danger Zone
          </h2>
          <p className="mb-6" style={{ color: 'var(--parent-text-light)' }}>
            These actions are permanent and cannot be undone. Use with extreme caution.
          </p>
          <button
            onClick={handleResetDatabase}
            disabled={actionInProgress}
            className="px-6 py-3 rounded-lg font-semibold text-white transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed bg-red-600 hover:bg-red-700"
          >
            {actionInProgress ? 'Processing...' : '🗑️ Reset Entire Database'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Users Section */}
          <div className="parent-card p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold" style={{ color: 'var(--parent-text)' }}>
                👥 Users ({users.length})
              </h2>
              <button
                onClick={fetchData}
                disabled={actionInProgress}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--parent-accent)',
                  color: 'white'
                }}
              >
                🔄 Refresh
              </button>
            </div>

            {users.length === 0 ? (
              <p style={{ color: 'var(--parent-text-light)' }}>No users found</p>
            ) : (
              <div className="space-y-4">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="p-4 rounded-lg border-2"
                    style={{
                      borderColor: 'var(--parent-border)',
                      backgroundColor: 'var(--parent-bg)'
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-lg" style={{ color: 'var(--parent-text)' }}>
                          {u.displayName || 'Unnamed User'}
                        </p>
                        <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                          {u.email}
                        </p>
                      </div>
                      <span
                        className="px-3 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: 'var(--parent-accent)',
                          color: 'white'
                        }}
                      >
                        {u.role}
                      </span>
                    </div>
                    <div className="text-xs mb-3" style={{ color: 'var(--parent-text-light)' }}>
                      ID: <span className="font-mono">{u.id}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResetUserData(u.id, u.email)}
                        disabled={actionInProgress}
                        className="px-3 py-1 rounded text-sm font-medium transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed bg-orange-500 hover:bg-orange-600 text-white"
                      >
                        Reset Data
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id, u.email)}
                        disabled={actionInProgress}
                        className="px-3 py-1 rounded text-sm font-medium transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed bg-red-500 hover:bg-red-600 text-white"
                      >
                        Delete User
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Manuals Section */}
          <div className="parent-card p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold" style={{ color: 'var(--parent-text)' }}>
                📖 Manuals ({manuals.length})
              </h2>
            </div>

            {manuals.length === 0 ? (
              <p style={{ color: 'var(--parent-text-light)' }}>No manuals found</p>
            ) : (
              <div className="space-y-4">
                {manuals.map((manual) => (
                  <div
                    key={manual.id}
                    className="p-4 rounded-lg border-2"
                    style={{
                      borderColor: 'var(--parent-border)',
                      backgroundColor: 'var(--parent-bg)'
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-lg" style={{ color: 'var(--parent-text)' }}>
                          {manual.personName}
                        </p>
                        <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                          {manual.relationshipType}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs mb-3" style={{ color: 'var(--parent-text-light)' }}>
                      Manual ID: <span className="font-mono">{manual.id}</span>
                      <br />
                      Person ID: <span className="font-mono">{manual.personId}</span>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/people/${manual.personId}/manual`}
                        className="px-3 py-1 rounded text-sm font-medium transition-all hover:shadow-md text-white"
                        style={{ backgroundColor: 'var(--parent-accent)' }}
                      >
                        View Manual
                      </Link>
                      <button
                        onClick={() => handleDeleteManual(manual.id, manual.personName)}
                        disabled={actionInProgress}
                        className="px-3 py-1 rounded text-sm font-medium transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed bg-red-500 hover:bg-red-600 text-white"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
