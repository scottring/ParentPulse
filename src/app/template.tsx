// Next.js `template.tsx` remounts on every route change (unlike layout.tsx).
// A fresh mount plus a CSS keyframe gives us a subtle fade-in for the new
// page. The old page unmounts instantly — not a true cross-fade, but
// noticeably less jarring than the default hard cut.

export default function RouteFadeTemplate({ children }: { children: React.ReactNode }) {
  return (
    <div className="route-fade">
      {children}
      <style>{`
        .route-fade {
          animation: route-fade-in 260ms ease-out;
        }
        @keyframes route-fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .route-fade { animation: none; }
        }
      `}</style>
    </div>
  );
}
