'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useKnowledge } from '@/hooks/useKnowledge';
import { KnowledgeBase } from '@/types';

export default function KnowledgeBasePage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const { items, books, podcasts, articles, research, videos, loading: knowledgeLoading } = useKnowledge();
  const [selectedType, setSelectedType] = useState<string>('all');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
    if (!authLoading && user && user.role !== 'parent') {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

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
              <Link href="/dashboard" className="text-2xl transition-transform hover:scale-110">
                ←
              </Link>
              <div>
                <h1 className="parent-heading text-2xl sm:text-3xl" style={{ color: 'var(--parent-accent)' }}>
                  Knowledge Base
                </h1>
                <p className="text-sm mt-1" style={{ color: 'var(--parent-text-light)' }}>
                  Your parenting library
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
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 lg:px-8 py-8 lg:py-12">
        {/* Add Knowledge Section */}
        <div className="mb-8 animate-fade-in-up">
          <Link
            href="/knowledge/new"
            className="parent-card p-6 hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-3 group block"
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
              style={{ backgroundColor: 'var(--parent-primary)' }}>
              <span className="text-2xl">+</span>
            </div>
            <div className="text-left">
              <div className="font-semibold text-lg" style={{ color: 'var(--parent-text)' }}>
                Add to Knowledge Base
              </div>
              <div className="text-sm" style={{ color: 'var(--parent-text-light)' }}>
                Save articles, books, or research
              </div>
            </div>
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          {[
            { key: 'all', label: 'All', count: items.length },
            { key: 'book', label: '📚 Books', count: books.length },
            { key: 'podcast', label: '🎙️ Podcasts', count: podcasts.length },
            { key: 'article', label: '📄 Articles', count: articles.length },
            { key: 'research', label: '🔬 Research', count: research.length },
            { key: 'video', label: '🎥 Videos', count: videos.length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedType(tab.key)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: selectedType === tab.key ? 'var(--parent-accent)' : 'transparent',
                color: selectedType === tab.key ? 'white' : 'var(--parent-text)',
                border: `1px solid ${selectedType === tab.key ? 'var(--parent-accent)' : 'var(--parent-border)'}`,
              }}
            >
              {tab.label} {tab.count > 0 && `(${tab.count})`}
            </button>
          ))}
        </div>

        {/* Knowledge Items List */}
        {!knowledgeLoading && items.length > 0 && (
          <div className="space-y-4 mb-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            {items
              .filter(item => selectedType === 'all' || item.sourceType === selectedType)
              .map((item, index) => (
                <KnowledgeItemCard key={item.knowledgeId} item={item} index={index} />
              ))}
          </div>
        )}

        {/* Empty State */}
        {!knowledgeLoading && items.length === 0 && (
          <div className="parent-card p-12 text-center paper-texture animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="text-6xl mb-4 opacity-40">💡</div>
          <p className="text-lg mb-2" style={{ color: 'var(--parent-text)' }}>
            Your knowledge base is empty
          </p>
          <p className="text-sm mb-6" style={{ color: 'var(--parent-text-light)' }}>
            Start building your personal parenting library by adding books, articles, and research that resonate with you
          </p>
          <Link
            href="/knowledge/new"
            className="inline-block px-6 py-3 rounded-lg font-semibold text-white transition-all hover:shadow-lg"
            style={{ backgroundColor: 'var(--parent-accent)' }}
          >
            Add Your First Item
          </Link>
        </div>
        )}

        {/* How It Works */}
        <div
          className="mt-12 p-8 rounded-2xl animate-fade-in-up"
          style={{
            backgroundImage: 'linear-gradient(135deg, rgba(124, 144, 130, 0.08) 0%, rgba(212, 165, 116, 0.08) 100%)',
            animationDelay: '0.3s'
          }}
        >
          <h3 className="parent-heading text-xl mb-4" style={{ color: 'var(--parent-accent)' }}>
            How Your Knowledge Base Works
          </h3>
          <div className="space-y-3 text-sm" style={{ color: 'var(--parent-text-light)' }}>
            <div className="flex items-start gap-3">
              <span className="text-lg">📥</span>
              <div>
                <strong style={{ color: 'var(--parent-text)' }}>Save Resources:</strong> Add books, articles, podcasts, or research you find valuable
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg">🤖</span>
              <div>
                <strong style={{ color: 'var(--parent-text)' }}>AI Extraction:</strong> AI automatically extracts key insights and actionable strategies
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg">🔗</span>
              <div>
                <strong style={{ color: 'var(--parent-text)' }}>Smart Linking:</strong> AI connects your knowledge to journal entries and daily actions
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-lg">💭</span>
              <div>
                <strong style={{ color: 'var(--parent-text)' }}>Personalized Insights:</strong> Get recommendations based on your actual experiences
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

interface KnowledgeItemCardProps {
  item: KnowledgeBase;
  index: number;
}

function KnowledgeItemCard({ item, index }: KnowledgeItemCardProps) {
  const iconMap = {
    book: '📚',
    podcast: '🎙️',
    article: '📄',
    research: '🔬',
    video: '🎥',
  };

  return (
    <div
      className="parent-card p-6 hover:shadow-lg transition-all duration-300 group animate-fade-in-up"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="flex gap-4">
        {/* Icon */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ backgroundColor: 'var(--parent-bg)' }}
        >
          {iconMap[item.sourceType]}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <h3 className="font-semibold text-lg" style={{ color: 'var(--parent-text)' }}>
              {item.title}
            </h3>
          </div>

          {item.author && (
            <p className="text-sm mb-2" style={{ color: 'var(--parent-secondary)' }}>
              by {item.author}
            </p>
          )}

          <p
            className="text-sm mb-3 line-clamp-2"
            style={{ color: 'var(--parent-text-light)' }}
          >
            {item.excerpt}
          </p>

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {item.tags.slice(0, 5).map((tag, i) => (
                <span
                  key={i}
                  className="px-2 py-1 rounded text-xs font-medium"
                  style={{
                    backgroundColor: 'var(--parent-bg)',
                    color: 'var(--parent-accent)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--parent-text-light)' }}>
              Added {item.timestamp?.toDate().toLocaleDateString()}
            </span>
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium hover:underline"
                style={{ color: 'var(--parent-accent)' }}
              >
                View Source →
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
