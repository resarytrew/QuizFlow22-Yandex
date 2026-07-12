// components/billing/BillingPageBackground.tsx
// Внешняя обёртка страницы биллинга в визуальном языке главной страницы.

import React from 'react';

interface BillingPageBackgroundProps {
  children: React.ReactNode;
}

const BILLING_BACKGROUND_STYLE: React.CSSProperties = {
  backgroundColor: '#f3f3ef',
  backgroundImage: [
    'linear-gradient(rgba(68,64,60,0.045) 1px, transparent 1px)',
    'linear-gradient(90deg, rgba(68,64,60,0.045) 1px, transparent 1px)',
    'linear-gradient(135deg, transparent 0 42%, rgba(180,83,9,0.05) 42% 42.35%, transparent 42.35% 100%)',
    'radial-gradient(ellipse 80% 45% at 18% 0%, rgba(245,158,11,0.08), transparent 68%)',
  ].join(', '),
  backgroundSize: '44px 44px, 44px 44px, 720px 720px, 100% 100%',
  backgroundPosition: '0 0, 0 0, center top, 0 0',
};

const BillingPageBackground: React.FC<BillingPageBackgroundProps> = ({ children }) => {
  return (
    <div
      className="min-h-[100dvh] overflow-x-hidden relative bg-[#f3f3ef] text-stone-950 font-sans"
      style={BILLING_BACKGROUND_STYLE}
    >
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.055] mix-blend-multiply"
        aria-hidden="true"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E\")",
        }}
      />
      {children}
    </div>
  );
};

export default BillingPageBackground;
