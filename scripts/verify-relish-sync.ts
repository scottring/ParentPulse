// Creates isolated fictional accounts only. Never uses real family books.
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import dotenv from "dotenv";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import sharp from "sharp";
import type { User } from "firebase/auth";
import { createVault, seal, unlockVault } from "../src/lib/relish/vault";
import { emptyBook } from "../src/lib/relish/model";
import { newJournalDraft, writeJournalPage } from "../src/lib/relish/journal";
import { makeParentLock } from "../src/lib/relish/profiles";
import { encryptPhoto, decryptPhoto } from "../src/lib/relish/photos";
import {
  uploadBook,
  downloadBook,
  syncRequest,
  SyncError,
} from "../src/lib/relish/book-sync-client";
import { type SyncedEdition } from "../src/lib/relish/book-sync";
const fixture = "/private/tmp/relish-sync-browser-qa.json";
async function main() {
  const env = dotenv.parse(await fs.readFile(".env.release-test.local"));
  const origin = new URL(process.argv[2] || "http://127.0.0.1:3210").origin;
  assert(
    origin === "http://127.0.0.1:3210" ||
      origin.endsWith("-scottrings-projects.vercel.app"),
  );
  const credentials = JSON.parse(
    env.RELISH_FIREBASE_ADMIN_JSON ||
      (await fs.readFile("../../service-account.json", "utf8")),
  );
  assert.equal(credentials.project_id, env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
  const app = initializeApp(
      { credential: cert(credentials) },
      `sync-qa-${randomUUID()}`,
    ),
    auth = getAuth(app),
    db = getFirestore(app);
  const nativeFetch = globalThis.fetch;
  globalThis.fetch = (url, init) =>
    nativeFetch(
      typeof url === "string" && url.startsWith("/") ? origin + url : url,
      typeof url === "string" && url.startsWith("/")
        ? { ...init, headers: { ...init?.headers, Origin: origin } }
        : init,
    );
  const prefix = "relish-sync-qa-";
  type QA = { uid: string; email: string; password: string; token: string };
  const users: QA[] = [];
  let retained = false;
  const user = (a: QA) => ({ getIdToken: async () => a.token }) as User;
  async function clean(a: { uid: string }) {
    assert(a.uid.startsWith(prefix));
    await db.recursiveDelete(db.doc(`relish_sync/${a.uid}`));
    await db.recursiveDelete(db.doc(`relish_connections_profiles/${a.uid}`));
    await auth.deleteUser(a.uid).catch((e) => {
      if (e.code !== "auth/user-not-found") throw e;
    });
  }
  if (process.argv.includes("--cleanup")) {
    const stored = JSON.parse(await fs.readFile(fixture, "utf8"));
    await clean(stored);
    await fs.unlink(fixture);
    console.log("PASS fictional browser account and ciphertext removed");
    return;
  }
  const signal = () => new AbortController().signal;
  const check = (label: string) => console.log(`PASS ${label}`);
  try {
    for (let i = 0; i < 3; i++) {
      const uid = prefix + randomUUID(),
        email = `${uid}@example.invalid`,
        password = randomBytes(28).toString("base64url");
      await auth.createUser({ uid, email, password, emailVerified: i !== 2 });
      users.push({ uid, email, password, token: "" });
      const r = await nativeFetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, returnSecureToken: true }),
        },
      );
      assert(r.ok);
      users[i].token = (await r.json()).idToken;
    }
    const [a, b, c] = users;
    await assert.rejects(
      syncRequest({ getIdToken: async () => "invalid-token" } as User, {
        action: "list",
      }),
      (e) => e instanceof SyncError && e.status === 401,
    );
    await assert.rejects(
      syncRequest(user(c), { action: "list" }),
      (e) => e instanceof SyncError && e.status === 403,
    );
    const cross = await nativeFetch(`${origin}/api/relish/sync/`, {
      method: "POST",
      headers: {
        Origin: "https://outsider.invalid",
        "Content-Type": "application/json",
        Authorization: `Bearer ${a.token}`,
        "X-Relish-Consent": "encrypted-library",
      },
      body: '{"action":"list"}',
    });
    assert.equal(cross.status, 403);
    check("invalid/unverified accounts and foreign origins denied");
    const words = "Fictional private journal sentence for encrypted sync QA.";
    const photoId = randomUUID(),
      photoBytes = await sharp({
        create: {
          width: 24,
          height: 24,
          channels: 3,
          background: { r: 80, g: 128, b: 130 },
        },
      })
        .jpeg()
        .toBuffer();
    let book = { ...emptyBook("River"), profile: { kind: "adult" as const } };
    book = writeJournalPage(
      book,
      {
        ...newJournalDraft(),
        text: words,
        photos: [
          { id: photoId, width: 24, height: 24, caption: "Fictional photo" },
        ],
      },
      0,
      "kept",
    ) as typeof book;
    const passphrase = "fictional river book passphrase",
      parentPassphrase = "fictional parent control passphrase";
    const encrypted = await createVault(book, passphrase),
      photo = await encryptPhoto(
        photoId,
        new Blob([new Uint8Array(photoBytes)], { type: "image/jpeg" }),
        encrypted.key,
      );
    const snapshot = {
        envelope: encrypted.envelope,
        media: [photo],
        label: book.owner,
      },
      id = randomUUID();
    const first = await uploadBook(user(a), snapshot, id, null, signal());
    const raw = await downloadBook(user(a), first, signal());
    assert.deepEqual(
      (await unlockVault(raw, passphrase)).book,
      JSON.parse(JSON.stringify(book)),
    );
    assert.deepEqual(
      Buffer.from(
        await (
          await decryptPhoto(JSON.parse(raw).media[0], encrypted.key)
        ).arrayBuffer(),
      ),
      photoBytes,
    );
    check("same-account new-device encrypted journal and photo round trip");
    assert.deepEqual(
      (
        await syncRequest<{ books: SyncedEdition[] }>(user(b), {
          action: "list",
          uid: a.uid,
        })
      ).books,
      [],
    );
    await assert.rejects(
      syncRequest(user(b), {
        action: "get",
        hash: first.manifest.envelope.parts[0],
        uid: a.uid,
      }),
      (e) => e instanceof SyncError && e.status === 404,
    );
    await assert.rejects(
      syncRequest(user(b), {
        action: "commit",
        id,
        baseRevision: null,
        label: "Foreign",
        manifest: first.manifest,
      }),
      (e) => e instanceof SyncError && e.status === 409,
    );
    for (const path of [
      `relish_sync/${a.uid}`,
      `relish_sync/${a.uid}/books/${id}`,
    ]) {
      const r = await nativeFetch(
        `https://firestore.googleapis.com/v1/projects/${credentials.project_id}/databases/(default)/documents/${path}`,
        { headers: { Authorization: `Bearer ${a.token}` } },
      );
      assert.equal(
        r.status,
        403,
        "Client SDK/REST must not bypass the server gate",
      );
    }
    check(
      "other account cannot list/read/reference ciphertext; direct authenticated Firestore access denied",
    );
    const localEdit = await seal(
      writeJournalPage(
        book,
        { ...newJournalDraft(), text: "Fictional first device entry" },
        0,
        "kept",
      ),
      encrypted.key,
      encrypted.envelope.salt,
    );
    const remoteEdit = await seal(
      writeJournalPage(
        book,
        { ...newJournalDraft(), text: "Fictional second device entry" },
        0,
        "kept",
      ),
      encrypted.key,
      encrypted.envelope.salt,
    );
    const race = await Promise.allSettled([
      uploadBook(
        user(a),
        { ...snapshot, envelope: localEdit },
        id,
        first.revision,
        signal(),
        first.manifest,
      ),
      uploadBook(
        user(a),
        { ...snapshot, envelope: remoteEdit },
        id,
        first.revision,
        signal(),
        first.manifest,
      ),
    ]);
    assert.equal(race.filter((r) => r.status === "fulfilled").length, 1);
    const rejected = race.find(
      (r) => r.status === "rejected",
    ) as PromiseRejectedResult;
    assert.equal(rejected.reason.status, 409);
    const winner = (
      race.find(
        (r) => r.status === "fulfilled",
      ) as PromiseFulfilledResult<SyncedEdition>
    ).value;
    const retry = await syncRequest<{ book: SyncedEdition }>(user(a), {
      action: "commit",
      id,
      baseRevision: first.revision,
      label: book.owner,
      manifest: winner.manifest,
    });
    assert.equal(retry.book.revision, winner.revision);
    check(
      "concurrent devices cannot overwrite one another; lost-response retries are idempotent",
    );
    const child = writeJournalPage(
      {
        ...emptyBook("Robin"),
        profile: {
          kind: "child",
          ageBand: "9-12",
          parentLock: await makeParentLock(parentPassphrase),
        },
      },
      {
        ...newJournalDraft(),
        text: "Fictional child page: today I invented a cloud dragon.",
      },
      0,
      "kept",
    );
    const childPassphrase = "fictional robin book passphrase",
      childVault = await createVault(child, childPassphrase);
    const childHead = await uploadBook(
      user(a),
      { envelope: childVault.envelope, media: [], label: child.owner },
      randomUUID(),
      null,
      signal(),
    );
    const list = await syncRequest<{ books: SyncedEdition[] }>(user(a), {
      action: "list",
    });
    assert.equal(list.books.length, 2);
    assert.deepEqual(
      (
        await unlockVault(
          await downloadBook(user(a), childHead, signal()),
          childPassphrase,
        )
      ).book.profile,
      child.profile,
    );
    const stored = JSON.stringify(
      (await db.doc(`relish_sync/${a.uid}`).collection("blobs").get()).docs.map(
        (d) => d.data(),
      ),
    );
    assert(!stored.includes(words));
    assert(!stored.includes(passphrase));
    assert(!stored.includes(parentPassphrase));
    check(
      "child and adult editions share an adult library while contents and parent settings stay encrypted",
    );
    await uploadBook(
      user(b),
      { envelope: childVault.envelope, media: [], label: "Disposable" },
      randomUUID(),
      null,
      signal(),
    );
    const deletion = await nativeFetch(`${origin}/api/relish/connections/`, {
      method: "POST",
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
        Authorization: `Bearer ${b.token}`,
        "X-Relish-Consent": "chosen-connection",
        "X-Relish-Edition": "adult",
      },
      body: JSON.stringify({
        action: "deleteAccount",
        confirmation: "DELETE ONLINE ACCOUNT",
      }),
    });
    assert.equal(deletion.status, 200, await deletion.text());
    assert.equal(
      (await db.doc(`relish_sync/${b.uid}`).collection("blobs").get()).size,
      0,
    );
    assert.equal(
      (await db.doc(`relish_sync/${b.uid}`).collection("books").get()).size,
      0,
    );
    assert.deepEqual((await db.doc(`relish_sync/${b.uid}`).get()).data(), {
      deleting: true,
    });
    await assert.rejects(
      syncRequest(user(b), { action: "list" }),
      (e) => e instanceof SyncError && e.status === 401,
    );
    await auth.updateUser(c.uid, { emailVerified: true });
    const signedAgain = await nativeFetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: c.email,
          password: c.password,
          returnSecureToken: true,
        }),
      },
    );
    assert(signedAgain.ok);
    c.token = (await signedAgain.json()).idToken;
    await syncRequest(user(c), { action: "list" });
    const removable = await uploadBook(
      user(c),
      { envelope: childVault.envelope, media: [], label: "Disposable" },
      randomUUID(),
      null,
      signal(),
    );
    await syncRequest(user(c), {
      action: "remove",
      id: removable.id,
      baseRevision: removable.revision,
      confirmation: "REMOVE SYNCED COPY",
    });
    assert.equal(
      (await db.doc(`relish_sync/${c.uid}`).collection("books").get()).size,
      0,
    );
    assert.equal(
      (await db.doc(`relish_sync/${c.uid}`).collection("blobs").get()).size,
      0,
    );
    check(
      "removing a synced copy also removes its unreferenced encrypted contents",
    );
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await auth.revokeRefreshTokens(c.uid);
    await assert.rejects(
      syncRequest(user(c), { action: "list" }),
      (e) => e instanceof SyncError && e.status === 401,
    );
    check(
      "account deletion removes encrypted library; deleted and revoked sessions cannot access sync",
    );
    if (process.argv.includes("--keep-browser")) {
      await fs.writeFile(
        fixture,
        JSON.stringify({
          ...a,
          passphrase,
          childPassphrase,
          parentPassphrase,
          origin,
          heads: list.books,
        }),
        { mode: 0o600 },
      );
      retained = true;
      check("fictional library prepared for UI checks");
    }
  } finally {
    globalThis.fetch = nativeFetch;
    for (const [i, a] of users.entries())
      if (!(retained && i === 0)) await clean(a);
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
