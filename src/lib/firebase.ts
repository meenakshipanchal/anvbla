/* Firebase client SDK init — Google sign-in + Analytics (GA4).
   Email auth stays on Clerk; Firebase owns the "Continue with Google" flow.
   All keys are NEXT_PUBLIC (Firebase web config is not secret) and inlined at
   build time, so this works on the client. When config is absent the Google
   button is disabled and the app still runs. */
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export const isFirebaseConfigured = !!firebaseConfig.apiKey && !!firebaseConfig.appId;

export const firebaseApp: FirebaseApp | null = isFirebaseConfigured
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

export const firebaseAuth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null;
// Firestore client — used for real-time onSnapshot subscriptions (chat,
// notification badges). Security is enforced by firestore.rules, so reads
// must be scoped to docs the signed-in user is a participant of.
export const firebaseDb: Firestore | null = firebaseApp ? getFirestore(firebaseApp) : null;

// VAPID Web Push public key — generated in Firebase Console → Project
// Settings → Cloud Messaging → "Web configuration" → Generate key pair.
// Public by design.
export const firebaseVapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? "";

export const googleProvider = new GoogleAuthProvider();

export { firebaseConfig };
