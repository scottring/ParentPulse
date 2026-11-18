// Remembers which account book is the signed-in adult's own book, so sign-in
// can open it straight away and the library can list it first. Stores only
// the account uid and the book's remote id on this device, never book data.
const key = (uid: string) => `relish:home-book:${uid}`;
export function readHomeBook(uid?: string | null) {
  if (!uid) return null;
  try {
    return localStorage.getItem(key(uid));
  } catch {
    return null;
  }
}
export function writeHomeBook(uid: string, remoteId: string) {
  try {
    if (localStorage.getItem(key(uid)) !== remoteId)
      localStorage.setItem(key(uid), remoteId);
  } catch {
    /* Without storage, sign-in simply opens the library as before. */
  }
}
