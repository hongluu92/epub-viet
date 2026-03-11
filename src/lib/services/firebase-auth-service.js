// Firebase authentication service: Google sign-in, sign-out, account deletion
// All Firebase SDK imports are lazy to avoid blocking module evaluation
import { getAuthInstance, getDbInstance } from './firebase-config';

/** Sign in with Google popup */
export async function signInWithGoogle() {
  const auth = await getAuthInstance();
  if (!auth) throw new Error('Firebase not configured');
  const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
  try {
    const result = await signInWithPopup(auth, new GoogleAuthProvider());
    return result.user;
  } catch (err) {
    console.error('[auth] signInWithGoogle failed:', err);
    throw err;
  }
}

/** Sign out current user */
export async function signOutUser() {
  const auth = await getAuthInstance();
  if (!auth) return;
  const { signOut } = await import('firebase/auth');
  try {
    await signOut(auth);
  } catch (err) {
    console.error('[auth] signOut failed:', err);
    throw err;
  }
}

/** Subscribe to auth state changes, returns unsubscribe fn.
 *  Now async — caller must await before using the unsubscribe handle. */
export async function onAuthStateChanged(callback) {
  const auth = await getAuthInstance();
  if (!auth) { callback(null); return () => {}; }
  const { onAuthStateChanged: fbOnAuthStateChanged } = await import('firebase/auth');
  return fbOnAuthStateChanged(auth, callback);
}

/** Delete all user Firestore data then delete Firebase auth account */
export async function deleteUserAccount() {
  const auth = await getAuthInstance();
  if (!auth) throw new Error('Firebase not configured');
  const user = auth.currentUser;
  if (!user) throw new Error('No authenticated user');
  const db = await getDbInstance();
  const { collection, getDocs, deleteDoc } = await import('firebase/firestore');
  const { deleteUser } = await import('firebase/auth');
  try {
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
