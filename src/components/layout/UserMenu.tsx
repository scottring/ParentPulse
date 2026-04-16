'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

/**
 * Fixed-position avatar at the top-right of a page. Tap opens a
 * dropdown with Home / Journal / Settings / Sign out. Replaces the
 * previous direct-link-to-settings avatar now that the Surface is
 * the home and there are multiple likely destinations.
 */
export function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleSignOut = async () => {
    try {
      await logout();
      router.push('/');
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  const label = user?.name || 'Menu';
  const initial = (user?.name || '?').charAt(0).toUpperCase();

  return (
    <div className="user-menu" ref={ref}>
      <button
        type="button"
        className="avatar"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${label} — menu`}
        title={label}
      >
        {user?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" />
        ) : (
          <span>{initial}</span>
        )}
      </button>

      {open && (
        <div className="menu" role="menu">
          <Link href="/settings" className="item" role="menuitem" onClick={() => setOpen(false)}>
            Settings
          </Link>
          <div className="divider" aria-hidden="true" />
          <button
            type="button"
            className="item sign-out"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              handleSignOut();
            }}
          >
            Sign out
          </button>
        </div>
      )}

      <style jsx>{`
        .user-menu {
          position: fixed;
          top: 14px;
          right: 22px;
          z-index: 30;
        }
        .avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: #d4b483;
          color: #2a1f14;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 13px;
          font-weight: 600;
          border: 2px solid #f5ecd8;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
          cursor: pointer;
          overflow: hidden;
          padding: 0;
          transition: transform 160ms ease, box-shadow 160ms ease;
        }
        .avatar:hover {
          transform: translateY(-1px);
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.28);
        }
        .avatar :global(img) {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .menu {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          min-width: 180px;
          background: #fffaf0;
          border: 1px solid rgba(138, 111, 74, 0.3);
          border-radius: 8px;
          box-shadow: 0 8px 24px rgba(30, 20, 10, 0.18);
          padding: 6px;
          display: flex;
          flex-direction: column;
          animation: fade-in 160ms ease;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .item {
          padding: 8px 12px;
          background: transparent;
          border: none;
          text-align: left;
          font-family: -apple-system, 'Helvetica Neue', sans-serif;
          font-size: 13px;
          color: #3d2f1f;
          text-decoration: none;
          border-radius: 4px;
          cursor: pointer;
          transition: background 120ms ease;
        }
        .item:hover {
          background: rgba(138, 111, 74, 0.12);
        }
        .divider {
          height: 1px;
          background: rgba(138, 111, 74, 0.2);
          margin: 4px 6px;
        }
        .sign-out {
          color: #7a3324;
        }
      `}</style>
    </div>
  );
}
