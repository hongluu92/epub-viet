// Auth hook — Google Sign-In, onAuthStateChanged, profile auto-create, settings load
import { useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth } from '../services/firebase.js';
import { getProfile, updateProfile, getSettings, setCurrentUid } from '../services/sync-service.js';
import useAppStore from '../store/app-store.js';

const provider = new GoogleAuthProvider();

// Detect mobile to use redirect instead of popup
const isMobile = () =>
  /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth < 768;

export default function useAuth() {
  const [loading, setLoading] = useState(true);
  const { setUser, updateSettings } = useAppStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const { uid, displayName, photoURL, email } = firebaseUser;

        // Register uid globally for sync-service guest check
        setCurrentUid(uid);

        // Auto-create profile on first login
        try {
          const existing = await getProfile(uid);
          if (!existing) {
            await updateProfile(uid, {
              displayName,
              photoURL,
              email,
              createdAt: new Date().toISOString(),
            });
          }
        } catch (err) {
          console.error('[useAuth] profile init error:', err);
        }

        // Load persisted settings into store
        try {
          const savedSettings = await getSettings(uid);
          if (savedSettings) {
            updateSettings(savedSettings);
          }
        } catch (err) {
          console.error('[useAuth] settings load error:', err);
        }

        setUser({ uid, displayName, photoURL, email });
      } else {
        // Signed out — clear uid and user state
        setCurrentUid(null);
        setUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, updateSettings]);

  const signIn = async () => {
    try {
      if (isMobile()) {
        await signInWithRedirect(auth, provider);
      } else {
        await signInWithPopup(auth, provider);
      }
    } catch (err) {
      // Popup blocked — fall back to redirect
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
        try {
          await signInWithRedirect(auth, provider);
        } catch (redirectErr) {
          console.error('[useAuth] signInWithRedirect error:', redirectErr);
        }
      } else {
        console.error('[useAuth] signIn error:', err);
      }
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setCurrentUid(null);
      setUser(null);
    } catch (err) {
      console.error('[useAuth] signOut error:', err);
    }
  };

  const { user, isAuthenticated } = useAppStore();
  return { user, isAuthenticated, signIn, signOut, loading };
}
