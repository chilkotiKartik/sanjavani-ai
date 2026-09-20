'use client';

import { useSyncExternalStore } from 'react';

/**
 * The current time, as something React can subscribe to.
 *
 * ## Why not just call `Date.now()`
 *
 * Because a component that reads the clock while rendering is not idempotent: two
 * renders of the same state produce different output, and React is free to render
 * whenever it likes. It also means a check-in that falls due while the page is open
 * never appears — the value that would reveal it is only read when something else
 * happens to re-render.
 *
 * Treating the clock as an external store fixes both. The snapshot is stable between
 * ticks, so render stays pure, and a tick is a real update, so a card that becomes due
 * shows up on its own.
 *
 * ## The cadence
 *
 * Thirty seconds, and an immediate refresh whenever the tab becomes visible again.
 * Everything measured here is in hours, so the interval only has to be fast enough
 * that a due reminder does not feel late — and the visibility listener covers the
 * case that actually matters, which is a phone coming out of a pocket.
 */
const TICK_MS = 30_000;

let snapshot = Date.now();

function subscribe(onChange: () => void): () => void {
  // The module may have loaded long before this mounted, so start from now. React
  // reads the snapshot immediately after subscribing, so this is picked up.
  snapshot = Date.now();

  const tick = () => {
    snapshot = Date.now();
    onChange();
  };
  const interval = setInterval(tick, TICK_MS);
  const onVisibility = () => {
    if (document.visibilityState === 'visible') tick();
  };
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    clearInterval(interval);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}

function getSnapshot(): number {
  return snapshot;
}

/**
 * Zero on the server. Nothing that uses this renders server-side — the things it
 * measures all live in local storage, which is empty there — so the value is never
 * shown, and a fixed number is what keeps the markup identical across the boundary.
 */
function getServerSnapshot(): number {
  return 0;
}

export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
