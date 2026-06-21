// firebase.js
// ---------------------------------------------------------------------------
// Single place that boots Firebase. Every other module imports `auth` and `db`
// from here, so the app is initialized exactly once.
//
// This file is framework-agnostic ES module JavaScript. The SAME code runs:
//   - in the browser (your web app today)
//   - inside a Capacitor iOS/Android shell later (no changes needed)
//   - inside React Native (swap the CDN imports for the `firebase` npm package)
// ---------------------------------------------------------------------------

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
