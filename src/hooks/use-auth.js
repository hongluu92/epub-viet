'use client';
// Auth hook: subscribes to Firebase auth state, exposes sign-in/out/delete actions
import { useState, useEffect, useCallback, useRef } from 'react';
import { signInWithGoogle, signOutUser, onAuthStateChanged, deleteUserAccount } from '@/lib/services/firebase-auth-service';
import { fetchLibrary, subscribeToChanges } from '@/lib/services/firebase-sync-service';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const listenersRef = useRef(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);
      setIsLoading(false);

      if (firebaseUser) {
        await fetchLibrary(firebaseUser.uid);
        // Clean up previous listeners before starting new ones
        if (listenersRef.current) listenersRef.current();
        listenersRef.current = subscribeToChanges(firebaseUser.uid, {});
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
  }, []);

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
