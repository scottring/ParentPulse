'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useMoment } from '@/hooks/useMoment';
import Navigation from '@/components/layout/Navigation';
import { MomentSynthesisCard } from '@/components/journal-spread/MomentSynthesisCard';

export default function MomentDetailPage() {
  const params = useParams<{ momentId: string }>();
  const momentId = params?.momentId;
  const { user } = useAuth();
  const { moment, views, loading, notFound, error } = useMoment(momentId);

  if (!user) {
    return (
      <main className="shell">
        <p className="empty">Sign in to view this moment.</p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="shell">
        <Navigation />
        <p className="empty">Loading the moment…</p>
      </main>
    );
  }

  if (notFound || !moment) {
    return (
      <main className="shell">
        <Navigation />
        <p className="empty">We couldn&apos;t find that moment.</p>
        <p className="back"><Link href="/journal">← back to the journal</Link></p>
        <style jsx>{pageStyles}</style>
      </main>
    );
  }

  if (error) {
    return (
      <main className="shell">
        <Navigation />
        <p className="empty">{error}</p>
        <style jsx>{pageStyles}</style>
      </main>
    );
  }

  const title = moment.title?.trim() || 'A moment';

  return (
    <main className="shell">
      <Navigation />
      <article className="page">
        <header className="masthead">
          <p className="kicker">Moment</p>
          <h1 className="title">{title}</h1>
        </header>

        <MomentSynthesisCard moment={moment} views={views} />

        {views.length > 0 && (
          <section className="views-section" aria-label="All views">
            <h2 className="section-heading">Views on this moment</h2>
            <ol className="views-list">
              {views.map((v) => (
                <li key={v.entryId} className="view-row">
                  <Link href={`/journal/${v.entryId}`} className="view-link">
                    <span className="view-author">
                      {v.authorId === user.userId ? 'You' : v.authorId}
                    </span>
                    <span className="view-text">{v.text}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        )}

        <button
          type="button"
          className="invite-cta"
          onClick={() => {
            // P6 will wire this up with the invite sheet.
            // For now, keep the affordance visible so the UI contract
            // is testable end-to-end ahead of the invite flow.
            alert('Inviting a view is coming in P6.');
          }}
        >
          invite a view
        </button>
      </article>

      <style jsx>{pageStyles}</style>
    </main>
  );
}

const pageStyles = `
  .shell {
    min-height: 100vh;
    background: #f7f3ea;
    padding-bottom: 80px;
  }
  .page {
    max-width: 640px;
    margin: 0 auto;
    padding: 32px 24px 48px;
  }
  .masthead {
    margin-bottom: 28px;
  }
  .kicker {
    margin: 0 0 6px 0;
    font-family: -apple-system, 'Helvetica Neue', sans-serif;
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #a89373;
  }
  .title {
    margin: 0;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 26px;
    line-height: 1.25;
    color: #2d2418;
  }
  .views-section {
    margin-top: 32px;
  }
  .section-heading {
    margin: 0 0 14px 0;
    font-family: -apple-system, 'Helvetica Neue', sans-serif;
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #a89373;
    font-weight: 500;
  }
  .views-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .view-row :global(a) {
    display: block;
    padding: 14px 16px;
    background: #faf7f1;
    border: 1px solid #e8e1d2;
    border-radius: 4px;
    color: #2d2418;
    text-decoration: none;
  }
  .view-row :global(a:hover) {
    background: #f2ebdc;
  }
  .view-author {
    display: block;
    font-family: -apple-system, 'Helvetica Neue', sans-serif;
    font-size: 11px;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: #a89373;
    margin-bottom: 4px;
  }
  .view-text {
    display: block;
    font-family: Georgia, serif;
    font-size: 14px;
    line-height: 1.55;
    color: #3d3a34;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .invite-cta {
    position: fixed;
    right: 24px;
    bottom: 24px;
    padding: 12px 18px;
    background: #2d2418;
    color: #f7f3ea;
    border: none;
    border-radius: 999px;
    font-family: Georgia, serif;
    font-style: italic;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(45, 36, 24, 0.18);
    cursor: pointer;
  }
  .invite-cta:hover {
    background: #1a1610;
  }
  .empty {
    max-width: 640px;
    margin: 48px auto 0;
    padding: 0 24px;
    font-family: Georgia, serif;
    font-style: italic;
    color: #a89373;
    text-align: center;
  }
  .back {
    text-align: center;
    margin-top: 12px;
    font-family: Georgia, serif;
  }
  .back :global(a) {
    color: #2d2418;
    text-decoration: underline;
  }
`;
