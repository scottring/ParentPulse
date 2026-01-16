'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useChildren } from '@/hooks/useChildren';
import { useChipEconomy } from '@/hooks/useChipEconomy';

export default function ChipHistoryPage({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = use(params);
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const { children } = useChildren();
  const { fetchChildTransactions, loading: transactionsLoading } = useChipEconomy();

  const [transactions, setTransactions] = useState<any[]>([]);

  const child = children.find(c => c.userId === childId);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
    if (!authLoading && user && user.role !== 'parent') {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const loadTransactions = async () => {
      if (childId) {
        const txns = await fetchChildTransactions(childId);
        setTransactions(txns);
      }
    };

    if (user) {
      loadTransactions();
    }
  }, [childId, user, fetchChildTransactions]);

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
              <Link href="/chip-economy" className="text-2xl transition-transform hover:scale-110">
                ←
              </Link>
              <div>
                <h1 className="parent-heading text-2xl sm:text-3xl" style={{ color: 'var(--parent-accent)' }}>
                  {child?.name}'s Chip History
                </h1>
                <p className="text-sm mt-1" style={{ color: 'var(--parent-text-light)' }}>
                  Transaction history for this child
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
      <main className="max-w-4xl mx-auto px-6 lg:px-8 py-8 lg:py-12">
        {/* Current Balance */}
        {child && (
          <div className="parent-card p-6 mb-8 text-center animate-fade-in-up">
            <p className="text-sm font-semibold mb-2" style={{ color: 'var(--parent-text-light)' }}>
              Current Balance
            </p>
            <div className="flex items-center justify-center gap-2">
              <span className="text-4xl">🎮</span>
              <span className="text-5xl font-bold" style={{ color: 'var(--parent-secondary)' }}>
                {child.chipBalance}
              </span>
            </div>
            <p className="text-sm mt-2" style={{ color: 'var(--parent-text-light)' }}>
              chips
            </p>
          </div>
        )}

        {/* Transactions List */}
        {!transactionsLoading && transactions.length > 0 && (
          <div className="space-y-3 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--parent-text)' }}>
              Transaction History
            </h2>
            {transactions.map((transaction, index) => (
              <div
                key={transaction.transactionId}
                className="parent-card p-4 hover:shadow-md transition-all duration-300 animate-fade-in-up"
                style={{ animationDelay: `${index * 0.03}s` }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">
                        {transaction.transactionType === 'earn' ? '✨' :
                         transaction.transactionType === 'spend' ? '🎁' : '⚡'}
                      </span>
                      <span className="font-semibold" style={{ color: 'var(--parent-text)' }}>
                        {transaction.reason}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--parent-text-light)' }}>
                      {transaction.timestamp.toDate().toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>

                  <div className="text-right">
                    <div
                      className={`text-xl font-bold ${
                        transaction.transactionType === 'earn'
                          ? 'text-green-600'
                          : transaction.transactionType === 'spend'
                          ? 'text-red-600'
                          : 'text-blue-600'
                      }`}
                    >
                      {transaction.transactionType === 'earn' || transaction.transactionType === 'adjust'
                        ? '+'
                        : '-'}
                      {Math.abs(transaction.amount)}
                    </div>
                    <p className="text-xs" style={{ color: 'var(--parent-text-light)' }}>
                      Balance: {transaction.balanceAfter}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!transactionsLoading && transactions.length === 0 && (
          <div className="parent-card p-12 text-center paper-texture animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="text-6xl mb-4 opacity-40">📊</div>
            <p className="text-lg mb-2" style={{ color: 'var(--parent-text)' }}>
              No transactions yet
            </p>
            <p className="text-sm mb-6" style={{ color: 'var(--parent-text-light)' }}>
              Start awarding chips to see transaction history
            </p>
            <Link
              href="/chip-economy"
              className="inline-block px-6 py-3 rounded-lg font-semibold text-white transition-all hover:shadow-lg"
              style={{ backgroundColor: 'var(--parent-accent)' }}
            >
              Back to Chip Economy
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
