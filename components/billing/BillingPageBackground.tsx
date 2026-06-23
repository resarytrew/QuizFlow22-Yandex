// components/billing/BillingPageBackground.tsx
// Внешняя обёртка страницы биллинга в визуальном языке главной страницы.

import React from 'react';

interface BillingPageBackgroundProps {
  children: React.ReactNode;
}

const BILLING_BACKGROUND_STYLE: React.CSSProperties = {
  backgroundColor: '#09090b',
  backgroundImage: [
    'radial-gradient(ellipse 85% 55% at 50% -12%, rgba(251,191,36,0.14), transparent 70%)',
    'radial-gradient(circle at 8% 48%, rgba(244,63,94,0.08), transparent 32%)',
    'radial-gradient(circle at 94% 72%, rgba(249,115,22,0.08), transparent 30%)',
    'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)',
    'linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
  ].join(', '),
  backgroundSize: '100% 100%, 100% 100%, 100% 100%, 56px 56px, 56px 56px',
  backgroundPosition: '0 0',
};

const BillingPageBackground: React.FC<BillingPageBackgroundProps> = ({ children }) => {
  return (
    <div
      className="min-h-[100dvh] overflow-x-hidden relative bg-[#09090b] text-white font-sans"
      style={BILLING_BACKGROUND_STYLE}
    >
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.035] mix-blend-screen"
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
