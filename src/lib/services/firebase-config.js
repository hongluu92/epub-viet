// Firebase app initialization with lazy singleton pattern
// SDK modules are loaded on-demand to avoid ~150KB synchronous parse on page load

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const isConfigValid = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

if (!isConfigValid) {
  console.warn('[Firebase] Missing NEXT_PUBLIC_FIREBASE_* env vars. Auth/sync disabled.');
}

let _app = null;
let _auth = null;
let _db = null;

async function getApp() {
  if (_app) return _app;
  const { initializeApp, getApps } = await import('firebase/app');
  _app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  return _app;
}

/** Lazily initialize and return Firebase Auth instance */
export async function getAuthInstance() {
  if (!isConfigValid) return null;
  if (_auth) return _auth;
  const app = await getApp();
  const { getAuth } = await import('firebase/auth');
  _auth = getAuth(app);
  return _auth;
}

/** Lazily initialize and return Firestore instance */
export async function getDbInstance() {
  if (!isConfigValid) return null;
  if (_db) return _db;
  const app = await getApp();
  const { getFirestore } = await import('firebase/firestore');
  _db = getFirestore(app);
  return _db;
}
