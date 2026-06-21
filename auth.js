// auth.js
// ---------------------------------------------------------------------------
// Account + session handling. Wraps Firebase Auth so the rest of the app never
// touches Firebase directly — it just calls signUp / signIn / signOut.
//
// Every tracker stores data under the logged-in user's id, so a user must be
// signed in before adding entries. getCurrentUserId() returns that id.
// ---------------------------------------------------------------------------

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import { auth } from "./firebase.js";

/** Create a new account with email + password. Returns a UserCredential. */
export function signUp(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

/** Sign in an existing account. Returns a UserCredential. */
export function signIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

/** Sign the current user out. */
export function signOutUser() {
  return signOut(auth);
}

/**
 * Run `callback(user)` whenever auth state changes (app load, login, logout).
 * `user` is the Firebase user object, or null when signed out.
 * Returns an unsubscribe function.
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

/** The current user's id, or null if nobody is signed in. */
export function getCurrentUserId() {
  return auth.currentUser ? auth.currentUser.uid : null;
}
