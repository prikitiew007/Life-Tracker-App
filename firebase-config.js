// firebase-config.js
// ---------------------------------------------------------------------------
// Paste your project's keys here ONCE. Everything else reads from this file.
//
// Where to get them:
//   Firebase Console  ->  Project settings (gear icon)  ->  General tab
//   ->  scroll to "Your apps"  ->  Web app  ->  "SDK setup and configuration"
//   ->  choose "Config" and copy the values below.
//   https://console.firebase.google.com
//
// NOTE: These web keys are NOT secret. They identify your project to Firebase.
// Your DATA is protected by the Firestore security rules (see firestore.rules),
// not by hiding these values. So it's safe that they live in the front end.
// ---------------------------------------------------------------------------

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
