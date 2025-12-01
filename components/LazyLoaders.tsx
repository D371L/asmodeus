import React, { Suspense, lazy } from 'react';

export const LazyConfetti = lazy(() => import('./Confetti'));
export const LazyWinnerModal = lazy(() => import('./WinnerModal'));

export const withSuspense = (children: React.ReactNode) => (
  <Suspense fallback={null}>{children}</Suspense>
);
