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
    const unsubAuth = onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);
      setIsLoading(false);

      if (firebaseUser) {
        // Fetch cloud library and surface books not yet downloaded locally
        const cloudBooks = await fetchLibrary(firebaseUser.uid);
        if (cloudBooks.length > 0) mergeCloudBooks(cloudBooks);

        // Clean up previous listeners before starting new ones
        if (listenersRef.current) listenersRef.current();
        listenersRef.current = subscribeToChanges(firebaseUser.uid, {
          // Real-time: merge new cloud books added on another device
          onBooks: (books) => mergeCloudBooks(books),
        });
      } else {
        if (listenersRef.current) {
          listenersRef.current();
          listenersRef.current = null;
        }
      }
    });

    return () => {
      unsubAuth();
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
