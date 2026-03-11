'use client';
// Auth hook: subscribes to Firebase auth state, exposes sign-in/out/delete actions
import { useState, useEffect, useCallback, useRef } from 'react';
import { signInWithGoogle, signOutUser, onAuthStateChanged, deleteUserAccount } from '@/lib/services/firebase-auth-service';
import { fetchLibrary, subscribeToChanges } from '@/lib/services/firebase-sync-service';
import { useLibraryStore } from '@/lib/stores/library-store';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const listenersRef = useRef(null);
  const mergeCloudBooks = useLibraryStore((s) => s.mergeCloudBooks);

  useEffect(() => {
    let cancelled = false;
    let unsubAuth = null;

    // onAuthStateChanged is now async (lazy Firebase init)
    onAuthStateChanged(async (firebaseUser) => {
      if (cancelled) return;
      setUser(firebaseUser);
      setIsLoading(false);

      if (firebaseUser) {
        const cloudBooks = await fetchLibrary(firebaseUser.uid);
        if (cancelled) return;
        if (cloudBooks.length > 0) mergeCloudBooks(cloudBooks);

        // Clean up previous listeners before starting new ones
        if (listenersRef.current) listenersRef.current();
        // subscribeToChanges is now async too
        listenersRef.current = await subscribeToChanges(firebaseUser.uid, {
          onBooks: (books) => mergeCloudBooks(books),
        });
      } else {
        if (listenersRef.current) {
          listenersRef.current();
          listenersRef.current = null;
        }
      }
    }).then((unsub) => {
      if (cancelled) { unsub?.(); return; }
      unsubAuth = unsub;
    });

    return () => {
      cancelled = true;
      unsubAuth?.();
      if (listenersRef.current) {
        listenersRef.current();
        listenersRef.current = null;
      }
    };
  }, [mergeCloudBooks]);

  const signIn = useCallback(async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('[useAuth] signIn failed:', err);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await signOutUser();
    } catch (err) {
      console.error('[useAuth] signOut failed:', err);
    }
  }, []);

  const deleteAccount = useCallback(async () => {
    try {
      await deleteUserAccount();
      setUser(null);
    } catch (err) {
      console.error('[useAuth] deleteAccount failed:', err);
      throw err;
    }
  }, []);

  return { user, isLoading, signIn, signOut, deleteAccount };
}
