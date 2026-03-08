// Firebase authentication service: Google sign-in, sign-out, account deletion
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged as fbOnAuthStateChanged, deleteUser } from 'firebase/auth';
import { collection, getDocs, deleteDoc } from 'firebase/firestore';
import { auth, db } from './firebase-config';

const googleProvider = new GoogleAuthProvider();

/** Sign in with Google popup */
export async function signInWithGoogle() {
  if (!auth) throw new Error('Firebase not configured');
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err) {
    console.error('[auth] signInWithGoogle failed:', err);
    throw err;
  }
}

/** Sign out current user */
export async function signOutUser() {
  if (!auth) return;
  try {
    await signOut(auth);
  } catch (err) {
    console.error('[auth] signOut failed:', err);
    throw err;
  }
}

/** Subscribe to auth state changes, returns unsubscribe fn */
export function onAuthStateChanged(callback) {
  if (!auth) { callback(null); return () => {}; }
  return fbOnAuthStateChanged(auth, callback);
}

/** Delete all user Firestore data then delete Firebase auth account */
export async function deleteUserAccount() {
  if (!auth) throw new Error('Firebase not configured');
  const user = auth.currentUser;
  if (!user) throw new Error('No authenticated user');
  try {
    // Delete all subcollections: settings, books, bookmarks
    const subColls = ['settings', 'books', 'bookmarks'];
    for (const name of subColls) {
      const snap = await getDocs(collection(db, 'users', user.uid, name));
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    }
    await deleteUser(user);
  } catch (err) {
    console.error('[auth] deleteUserAccount failed:', err);
    throw err;
  }
}
