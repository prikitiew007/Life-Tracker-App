// _store.js  (internal helper — you usually won't import this directly)
// ---------------------------------------------------------------------------
// All three trackers store data the same way: a list of entries that belong to
// one user. Rather than copy/paste Firestore code three times, this file builds
// a small CRUD object for any named collection.
//
// Data layout in Firestore:
//   users / {userId} / {collectionName} / {entryId}
//
// Keeping every user's data under users/{userId}/... is what lets the security
// rules say "you can only touch your own subtree" in two short lines.
// ---------------------------------------------------------------------------

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  limit as fsLimit,
  onSnapshot,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { db } from "./firebase.js";
import { getCurrentUserId } from "./auth.js";

function requireUser() {
  const uid = getCurrentUserId();
  if (!uid) throw new Error("Not signed in. Call signIn() before reading or writing data.");
  return uid;
}

/**
 * Build a CRUD interface for one tracker collection.
 * `name`     -> the subcollection name, e.g. "mentalHealth"
 * `prepare`  -> function(input) that validates/normalizes an entry before save
 */
export function makeStore(name, prepare) {
  function colRef(uid) {
    return collection(db, "users", uid, name);
  }

  return {
    /** Add one entry. Returns the new document id. */
    async add(input) {
      const uid = requireUser();
      const data = prepare(input);
      const ref = await addDoc(colRef(uid), {
        ...data,
        createdAt: serverTimestamp()
      });
      return ref.id;
    },

    /** Read the most recent entries once (default 50, newest first). */
    async list({ max = 50 } = {}) {
      const uid = requireUser();
      const q = query(colRef(uid), orderBy("createdAt", "desc"), fsLimit(max));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    /**
     * Live updates: `callback(entries)` fires now and again on every change.
     * Returns an unsubscribe function — call it when the screen closes.
     */
    subscribe(callback, { max = 50 } = {}) {
      const uid = requireUser();
      const q = query(colRef(uid), orderBy("createdAt", "desc"), fsLimit(max));
      return onSnapshot(q, (snap) => {
        callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      });
    },

    /** Patch fields on one entry. */
    update(id, patch) {
      const uid = requireUser();
      return updateDoc(doc(db, "users", uid, name, id), patch);
    },

    /** Delete one entry. */
    remove(id) {
      const uid = requireUser();
      return deleteDoc(doc(db, "users", uid, name, id));
    }
  };
}

/** Small shared helper: today's date as YYYY-MM-DD in the user's local zone. */
export function todayISO() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}
