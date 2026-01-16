'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useChildren, CreateChildData } from '@/hooks/useChildren';
import { useChildProfile } from '@/hooks/useChildProfile';

export default function ChildrenManagementPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const { children, loading, error, createChild, deleteChild } = useChildren();
  const { profileExists } = useChildProfile();

  const [showAddForm, setShowAddForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
    if (!authLoading && user && user.role !== 'parent') {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatar(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Please enter a name');
      return;
    }

    if (!dateOfBirth) {
      setFormError('Please select a date of birth');
      return;
    }

    try {
      setFormLoading(true);
      const childData: CreateChildData = {
        name: name.trim(),
        dateOfBirth: new Date(dateOfBirth),
        avatar: avatar || undefined,
      };

      const newChildId = await createChild(childData);

      // Check if profile exists for this child
      const hasProfile = await profileExists(newChildId);

      // Redirect to onboarding if no profile, otherwise to profile page
      if (!hasProfile) {
        router.push(`/children/onboard/${newChildId}`);
      } else {
        router.push(`/children/${newChildId}/profile`);
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to add child');
      setFormLoading(false);
    }
  };

  const handleDelete = async (childId: string, childName: string) => {
    if (!confirm(`Are you sure you want to remove ${childName} from your family? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteChild(childId);
    } catch (err: any) {
      alert(err.message || 'Failed to delete child');
    }
  };

  const calculateAge = (dob: any) => {
    if (!dob || !dob.toDate) return '';
    const birthDate = dob.toDate();
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age === 1 ? '1 year old' : `${age} years old`;
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center parent-page">
        <div className="w-16 h-16 spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen parent-page">
      {/* Header */}
      <header className="border-b paper-texture" style={{ borderColor: 'var(--parent-border)', backgroundColor: 'var(--parent-card)' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-4xl hover:scale-110 transition-transform">
                🌱
              </Link>
              <div>
                <h1 className="parent-heading text-2xl sm:text-3xl" style={{ color: 'var(--parent-accent)' }}>
                  Your Children
                </h1>
                <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                  Manage your family
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="text-sm font-medium px-4 py-2 rounded-lg transition-all hover:shadow-md"
              style={{
                color: 'var(--parent-text-light)',
                border: '1px solid var(--parent-border)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--parent-bg)';
                e.currentTarget.style.color = 'var(--parent-text)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--parent-text-light)';
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 lg:px-8 py-8 lg:py-12">
        {/* Add Child Button */}
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full parent-card p-6 mb-8 hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-3 group animate-fade-in-up"
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
              style={{ backgroundColor: 'var(--parent-primary)' }}>
              <span className="text-2xl">+</span>
            </div>
            <div className="text-left">
              <div className="font-semibold text-lg" style={{ color: 'var(--parent-text)' }}>
                Add a child
              </div>
              <div className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                Add a new member to your family
              </div>
            </div>
          </button>
        )}

        {/* Add Child Form */}
        {showAddForm && (
          <div className="parent-card p-8 mb-8 animate-fade-in-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="parent-heading text-2xl" style={{ color: 'var(--parent-text)' }}>
                Add a Child
              </h2>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setFormError('');
                  setName('');
                  setDateOfBirth('');
                  setAvatar(null);
                  setAvatarPreview('');
                }}
                className="text-2xl hover:scale-110 transition-transform"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mb-6 p-4 rounded-lg" style={{
                backgroundColor: '#FEE2E2',
                border: '1px solid #FCA5A5',
                color: '#991B1B'
              }}>
                <p className="text-sm font-medium">{formError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Avatar Upload */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
                  Photo (Optional)
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--parent-bg)' }}>
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">
                        👤
                      </div>
                    )}
                  </div>
                  <label className="cursor-pointer px-4 py-2 rounded-lg transition-colors"
                    style={{
                      border: '1.5px solid var(--parent-border)',
                      color: 'var(--parent-text)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--parent-bg)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                    Choose Photo
                  </label>
                </div>
              </div>

              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
                  Name *
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg transition-all duration-200"
                  style={{
                    border: '1.5px solid var(--parent-border)',
                    backgroundColor: 'var(--parent-bg)',
                    color: 'var(--parent-text)',
                    fontSize: '16px'
                  }}
                  placeholder="Enter child's name"
                  disabled={formLoading}
                  onFocus={(e) => e.target.style.borderColor = 'var(--parent-primary)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--parent-border)'}
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label htmlFor="dateOfBirth" className="block text-sm font-medium mb-2" style={{ color: 'var(--parent-text)' }}>
                  Date of Birth *
                </label>
                <input
                  id="dateOfBirth"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 rounded-lg transition-all duration-200"
                  style={{
                    border: '1.5px solid var(--parent-border)',
                    backgroundColor: 'var(--parent-bg)',
                    color: 'var(--parent-text)',
                    fontSize: '16px'
                  }}
                  disabled={formLoading}
                  onFocus={(e) => e.target.style.borderColor = 'var(--parent-primary)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--parent-border)'}
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-3 rounded-lg font-semibold text-white transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: 'var(--parent-accent)' }}
                  onMouseEnter={(e) => !formLoading && (e.currentTarget.style.backgroundColor = '#234946')}
                  onMouseLeave={(e) => !formLoading && (e.currentTarget.style.backgroundColor = 'var(--parent-accent)')}
                >
                  {formLoading ? 'Adding...' : 'Add Child'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  disabled={formLoading}
                  className="px-6 py-3 rounded-lg font-semibold transition-all duration-200"
                  style={{
                    border: '1.5px solid var(--parent-border)',
                    color: 'var(--parent-text)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--parent-bg)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="parent-card p-8 text-center animate-fade-in-up">
            <div className="text-6xl mb-4">😕</div>
            <p className="text-lg mb-2" style={{ color: 'var(--parent-text)' }}>
              Unable to load children
            </p>
            <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
              {error}
            </p>
          </div>
        )}

        {/* Loading State */}
        {loading && !error && (
          <div className="flex justify-center py-12">
            <div className="w-16 h-16 spinner"></div>
          </div>
        )}

        {/* Children List */}
        {!loading && !error && children.length === 0 && !showAddForm && (
          <div className="parent-card p-12 text-center animate-fade-in-up">
            <div className="text-6xl mb-4 opacity-40">👨‍👩‍👧‍👦</div>
            <p className="text-lg mb-2" style={{ color: 'var(--parent-text)' }}>
              No children added yet
            </p>
            <p className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
              Click the button above to add your first child
            </p>
          </div>
        )}

        {!loading && !error && children.length > 0 && (
          <div className="grid gap-6">
            {children.map((child, index) => (
              <div
                key={child.userId}
                className="parent-card p-6 hover:shadow-lg transition-all duration-300 animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-center gap-6">
                  {/* Avatar */}
                  <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0" style={{ backgroundColor: 'var(--parent-primary)' }}>
                    {child.avatarUrl ? (
                      <img src={child.avatarUrl} alt={child.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">
                        👤
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <h3 className="parent-heading text-2xl mb-1" style={{ color: 'var(--parent-text)' }}>
                      {child.name}
                    </h3>
                    <p className="text-sm mb-2" style={{ color: 'var(--parent-text-light)' }}>
                      {calculateAge(child.dateOfBirth)}
                    </p>
                    {child.chipBalance !== undefined && (
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🎮</span>
                        <span className="font-semibold" style={{ color: 'var(--parent-secondary)' }}>
                          {child.chipBalance} chips
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => handleDelete(child.userId, child.name)}
                    className="w-10 h-10 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                    style={{
                      border: '1.5px solid var(--parent-border)',
                      color: 'var(--parent-text-light)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#FEE2E2';
                      e.currentTarget.style.borderColor = '#FCA5A5';
                      e.currentTarget.style.color = '#991B1B';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.borderColor = 'var(--parent-border)';
                      e.currentTarget.style.color = 'var(--parent-text-light)';
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
