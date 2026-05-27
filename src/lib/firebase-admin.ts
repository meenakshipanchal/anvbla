import "server-only";
import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getMessaging, type Messaging } from "firebase-admin/messaging";

/* Firebase Admin SDK — SERVER ONLY. Powers Firestore reads/writes and (later)
   real verification of Firebase sessions. Credentials come from a service-account
   key referenced by FIREBASE_SERVICE_ACCOUNT_PATH (a git-ignored JSON file), or
   from individual FIREBASE_* env vars. If neither is present, adminDb is null and
   callers fall back to mock data, so the app still runs. */

function makeApp(): App | null {
  if (getApps().length) return getApps()[0];

  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (path) {
    try {
      return initializeApp({ credential: cert(path) });
    } catch {
      return null;
    }
  }

  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
  if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
    return initializeApp({
      credential: cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });
  }

  return null;
}

const adminApp = makeApp();

export const isAdminConfigured = !!adminApp;
export const adminDb: Firestore | null = adminApp ? getFirestore(adminApp) : null;
export const adminAuth: Auth | null = adminApp ? getAuth(adminApp) : null;
export const adminMessaging: Messaging | null = adminApp ? getMessaging(adminApp) : null;
