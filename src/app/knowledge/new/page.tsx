'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useKnowledge } from '@/hooks/useKnowledge';
import { SourceType } from '@/types';

export default function AddKnowledgePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { addKnowledge } = useKnowledge();

  const [sourceType, setSourceType] = useState<SourceType>('book');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [url, setUrl] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
    if (!authLoading && user && user.role !== 'parent') {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    if (!excerpt.trim()) {
      setError('Excerpt or summary is required');
      return;
    }

    setSaving(true);

    try {
      await addKnowledge({
        sourceType,
        title: title.trim(),
        author: author.trim() || undefined,
        url: url.trim() || undefined,
        excerpt: excerpt.trim(),
        notes: notes.trim() || undefined,
        tags: tags.split(',').map(t => t.trim()).filter(t => t.length > 0),
        file: file || undefined,
      });

      router.push('/knowledge');
    } catch (err) {
      console.error('Error adding knowledge:', err);
      setError('Failed to add knowledge item. Please try again.');
      setSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Limit file size to 10MB
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center parent-page">
        <div className="w-16 h-16 spinner"></div>
      </div>
    );
  }

  const sourceTypeOptions: { value: SourceType; label: string; icon: string }[] = [
    { value: 'book', label: 'Book', icon: '📚' },
    { value: 'podcast', label: 'Podcast', icon: '🎙️' },
    { value: 'article', label: 'Article', icon: '📄' },
    { value: 'research', label: 'Research', icon: '🔬' },
    { value: 'video', label: 'Video', icon: '🎥' },
  ];

  return (
    <div className="min-h-screen parent-page">
      {/* Header */}
      <header className="border-b paper-texture" style={{ borderColor: 'var(--parent-border)', backgroundColor: 'var(--parent-card)' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link href="/knowledge" className="text-2xl transition-transform hover:scale-110">
              ←
            </Link>
            <div>
              <h1 className="parent-heading text-2xl sm:text-3xl" style={{ color: 'var(--parent-accent)' }}>
                Add to Knowledge Base
              </h1>
              <p className="text-sm mt-1" style={{ color: 'var(--parent-text-light)' }}>
                Save valuable parenting resources
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 lg:px-8 py-8 lg:py-12">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Source Type */}
          <div className="parent-card p-6 animate-fade-in-up">
            <label className="block mb-3">
              <span className="font-semibold text-sm" style={{ color: 'var(--parent-text)' }}>
                Source Type *
              </span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {sourceTypeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSourceType(option.value)}
                  className="p-4 rounded-lg border-2 transition-all hover:shadow-md"
                  style={{
                    borderColor: sourceType === option.value ? 'var(--parent-accent)' : 'var(--parent-border)',
                    backgroundColor: sourceType === option.value ? 'var(--parent-bg)' : 'transparent',
                  }}
                >
                  <div className="text-3xl mb-1">{option.icon}</div>
                  <div className="text-xs font-medium" style={{ color: 'var(--parent-text)' }}>
                    {option.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="parent-card p-6 animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
            <label className="block mb-2">
              <span className="font-semibold text-sm" style={{ color: 'var(--parent-text)' }}>
                Title *
              </span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., How to Talk So Kids Will Listen"
              className="w-full p-3 rounded-lg text-sm"
              style={{
                border: '1px solid var(--parent-border)',
                backgroundColor: 'var(--parent-bg)',
                color: 'var(--parent-text)'
              }}
              required
            />
          </div>

          {/* Author */}
          <div className="parent-card p-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <label className="block mb-2">
              <span className="font-semibold text-sm" style={{ color: 'var(--parent-text)' }}>
                Author / Creator
              </span>
            </label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="e.g., Adele Faber & Elaine Mazlish"
              className="w-full p-3 rounded-lg text-sm"
              style={{
                border: '1px solid var(--parent-border)',
                backgroundColor: 'var(--parent-bg)',
                color: 'var(--parent-text)'
              }}
            />
          </div>

          {/* URL */}
          <div className="parent-card p-6 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
            <label className="block mb-2">
              <span className="font-semibold text-sm" style={{ color: 'var(--parent-text)' }}>
                URL / Link
              </span>
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full p-3 rounded-lg text-sm"
              style={{
                border: '1px solid var(--parent-border)',
                backgroundColor: 'var(--parent-bg)',
                color: 'var(--parent-text)'
              }}
            />
          </div>

          {/* File Upload */}
          <div className="parent-card p-6 animate-fade-in-up" style={{ animationDelay: '0.175s' }}>
            <label className="block mb-2">
              <span className="font-semibold text-sm" style={{ color: 'var(--parent-text)' }}>
                Upload File
              </span>
              <span className="text-xs ml-2" style={{ color: 'var(--parent-text-light)' }}>
                PDF, DOCX, TXT (Max 10MB)
              </span>
            </label>
            <div className="relative">
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.txt,.epub"
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="flex items-center justify-center p-6 rounded-lg border-2 border-dashed cursor-pointer transition-all hover:shadow-md"
                style={{
                  borderColor: file ? 'var(--parent-accent)' : 'var(--parent-border)',
                  backgroundColor: file ? 'var(--parent-bg)' : 'transparent',
                }}
              >
                {file ? (
                  <div className="text-center">
                    <div className="text-2xl mb-2">📄</div>
                    <div className="text-sm font-medium" style={{ color: 'var(--parent-text)' }}>
                      {file.name}
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--parent-text-light)' }}>
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setFile(null);
                      }}
                      className="text-xs mt-2 px-3 py-1 rounded"
                      style={{
                        backgroundColor: '#FEE2E2',
                        color: '#C62828',
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-3xl mb-2">📁</div>
                    <div className="text-sm font-medium mb-1" style={{ color: 'var(--parent-text)' }}>
                      Click to upload a file
                    </div>
                    <div className="text-xs" style={{ color: 'var(--parent-text-light)' }}>
                      Or drag and drop
                    </div>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Excerpt */}
          <div className="parent-card p-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <label className="block mb-2">
              <span className="font-semibold text-sm" style={{ color: 'var(--parent-text)' }}>
                Key Excerpt or Summary *
              </span>
              <span className="text-xs ml-2" style={{ color: 'var(--parent-text-light)' }}>
                Copy the most valuable passage or write a summary
              </span>
            </label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Paste key excerpts or summarize the main insights..."
              rows={6}
              className="w-full p-3 rounded-lg text-sm"
              style={{
                border: '1px solid var(--parent-border)',
                backgroundColor: 'var(--parent-bg)',
                color: 'var(--parent-text)'
              }}
              required
            />
          </div>

          {/* Notes */}
          <div className="parent-card p-6 animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
            <label className="block mb-2">
              <span className="font-semibold text-sm" style={{ color: 'var(--parent-text)' }}>
                Your Notes
              </span>
              <span className="text-xs ml-2" style={{ color: 'var(--parent-text-light)' }}>
                Personal reflections or how you plan to apply this
              </span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your own thoughts, reflections, or action items..."
              rows={4}
              className="w-full p-3 rounded-lg text-sm"
              style={{
                border: '1px solid var(--parent-border)',
                backgroundColor: 'var(--parent-bg)',
                color: 'var(--parent-text)'
              }}
            />
          </div>

          {/* Tags */}
          <div className="parent-card p-6 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <label className="block mb-2">
              <span className="font-semibold text-sm" style={{ color: 'var(--parent-text)' }}>
                Tags
              </span>
              <span className="text-xs ml-2" style={{ color: 'var(--parent-text-light)' }}>
                Comma-separated (e.g., discipline, communication, toddlers)
              </span>
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="discipline, communication, emotions"
              className="w-full p-3 rounded-lg text-sm"
              style={{
                border: '1px solid var(--parent-border)',
                backgroundColor: 'var(--parent-bg)',
                color: 'var(--parent-text)'
              }}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div
              className="p-4 rounded-lg text-sm animate-fade-in-up"
              style={{
                backgroundColor: '#FEE2E2',
                color: '#C62828',
                border: '1px solid #EF9A9A'
              }}
            >
              {error}
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-3 animate-fade-in-up" style={{ animationDelay: '0.35s' }}>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 px-6 rounded-lg font-semibold text-white transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--parent-accent)' }}
            >
              {saving ? 'Saving...' : 'Add to Knowledge Base'}
            </button>
            <Link
              href="/knowledge"
              className="py-3 px-6 rounded-lg font-semibold transition-all hover:shadow-md text-center"
              style={{
                border: '1px solid var(--parent-border)',
                color: 'var(--parent-text)'
              }}
            >
              Cancel
            </Link>
          </div>
        </form>

        {/* Helper Text */}
        <div
          className="mt-8 p-6 rounded-xl animate-fade-in-up"
          style={{
            backgroundImage: 'linear-gradient(135deg, rgba(124, 144, 130, 0.08) 0%, rgba(212, 165, 116, 0.08) 100%)',
            animationDelay: '0.4s'
          }}
        >
          <h3 className="font-semibold mb-3" style={{ color: 'var(--parent-text)' }}>
            💡 Tips for adding knowledge
          </h3>
          <ul className="space-y-2 text-sm" style={{ color: 'var(--parent-text-light)' }}>
            <li className="flex items-start gap-2">
              <span style={{ color: 'var(--parent-accent)' }}>•</span>
              <span>Focus on actionable insights rather than entire books</span>
            </li>
            <li className="flex items-start gap-2">
              <span style={{ color: 'var(--parent-accent)' }}>•</span>
              <span>The AI will reference this knowledge when generating daily actions</span>
            </li>
            <li className="flex items-start gap-2">
              <span style={{ color: 'var(--parent-accent)' }}>•</span>
              <span>Add your own notes to connect theory with your real experiences</span>
            </li>
            <li className="flex items-start gap-2">
              <span style={{ color: 'var(--parent-accent)' }}>•</span>
              <span>Use tags to organize by topic, age, or situation</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
