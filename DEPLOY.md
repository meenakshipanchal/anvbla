# Deploying BlaBlue

BlaBlue is a Next.js 16 app. Auth + database are entirely **Firebase** (Google
sign-in + Firestore). This guide takes you from the current state to **live**.

## What's already production-ready
- ✅ `npm run build` passes
- ✅ Google sign-in (Firebase) with server-verified `__session` cookie
- ✅ Real data in Firestore — publish, book, and trips read/write live data
- ✅ No dummy/mock data
- ✅ Route protection via `src/proxy.ts` + server-side `getCurrentUser()`

---

## 1. Pick a host

| | Vercel | Firebase App Hosting |
|---|---|---|
| Best for | Next.js (built by its team) | staying in the Firebase console |
| Setup | connect repo → set env → deploy | `apphosting.yaml` + Firebase CLI |

The steps below are written for **Vercel** (easiest); App Hosting is similar.

## 2. Push the repo to GitHub
```bash
git add -A && git commit -m "BlaBlue: Firebase auth + Firestore, production-ready"
git remote add origin <your-repo-url>   # if not already
git push -u origin main
```
> Already git-ignored and safe: `.env.local`, the `*firebase-adminsdk*.json` key.

## 3. Create the Vercel project
- vercel.com → **Add New → Project** → import the repo (framework auto-detected: Next.js)
- Don't deploy yet — set env vars first (next step)

## 4. Set environment variables on the host
From your local `.env.local`, add these in **Vercel → Settings → Environment Variables**:

**Client (public):**
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
```

**Admin SDK (server secret) — IMPORTANT:** do **not** use `FIREBASE_SERVICE_ACCOUNT_PATH`
in production (the JSON file isn't deployed). Instead set these three from the
service-account JSON:
```
FIREBASE_PROJECT_ID         = cr-eb178
FIREBASE_CLIENT_EMAIL       = firebase-adminsdk-...@cr-eb178.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY        = "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```
The code (`src/lib/firebase-admin.ts`) already falls back to these when the path
isn't set.

## 5. Deploy the Firestore security rules
The rules live in `firestore.rules`. Two ways:
- **Console:** Firestore → Rules → paste `firestore.rules` → **Publish**, or
- **CLI:**
  ```bash
  npm i -g firebase-tools
  firebase login
  firebase deploy --only firestore:rules --project cr-eb178
  ```

## 6. Deploy
- Vercel → **Deploy**. You'll get a `*.vercel.app` URL.

## 7. Authorize your live domain (or sign-in breaks)
- **Firebase console → Authentication → Settings → Authorized domains** → add your
  Vercel domain (and custom domain).
- **Google Cloud → Google Auth Platform → Branding → Authorized domains** → add it too.

## 8. (Optional) Custom domain + branded sign-in
- Add your custom domain in Vercel.
- To make the Google popup say **"BlaBlue"** + logo instead of
  `cr-eb178.firebaseapp.com`: deploy a Privacy Policy + Terms page, then in
  **Google Auth Platform** publish the app and submit for **brand verification**.
  (Only possible once you're on a real domain.)

## 9. Smoke test the live site
1. Sign in with Google → lands on `/trips`
2. Publish a ride → appears in search + on `/trips`
3. Book a ride from another account → seats decrement, shows under booked trips
4. Sign out → protected routes redirect to `/sign-in`

---

### Dev-only endpoints (auto-disabled in production)
- `GET /api/dev/reset` — wipes the `rides` collection. Returns 403 in production.
