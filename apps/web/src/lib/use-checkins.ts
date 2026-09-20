'use client';

import { useSyncExternalStore } from 'react';
import { readCheckIns, serverCheckIns, subscribeCheckIns, type CheckIn } from './checkins';

/**
 * The check-in list, subscribed rather than fetched.
 *
 * During the server render and the first client render this is empty, which is the
 * truth: nothing in local storage is knowable on the server, and pretending otherwise
 * is how a hydration mismatch becomes a flash of the wrong screen. React swaps in the
 * real list immediately after mount, and again whenever it changes — including from
 * another tab.
 */
export function useCheckIns(): CheckIn[] {
  return useSyncExternalStore(subscribeCheckIns, readCheckIns, serverCheckIns);
}
