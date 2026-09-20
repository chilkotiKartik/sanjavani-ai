'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * The reviewer's token for this sitting.
 *
 * `sessionStorage`, deliberately: a clinical review console should end when the tab
 * does. The server mints a fresh reviewer identity per sign-in, so nothing is lost by
 * not persisting — and a token for a privileged surface left in `localStorage` on a
 * shared clinic machine is exactly the kind of convenience that turns into an
 * incident.
 *
 * Read through `useSyncExternalStore` rather than an effect so the first paint already
 * knows whether someone is signed in, and so two open tabs stay consistent.
 */
const KEY = 'sv:reviewer';

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab signing out should sign this one out too.
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

function read(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    // Private mode, or storage blocked. The console simply asks for the key again.
    return null;
  }
}

/** The server renders with nobody signed in; the token is a client-only fact. */
function readServer(): string | null {
  return null;
}

export function useReviewer() {
  const token = useSyncExternalStore(subscribe, read, readServer);

  const signIn = useCallback((next: string) => {
    try {
      sessionStorage.setItem(KEY, next);
    } catch {
      /* storage blocked — the token still works for this render, just not a reload */
    }
    emit();
  }, []);

  const signOut = useCallback(() => {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* nothing to clear */
    }
    emit();
  }, []);

  return { token, signIn, signOut };
}
