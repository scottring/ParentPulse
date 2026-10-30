// Live checks create only isolated fictional accounts and remove them in finally.
// Run: npx tsx scripts/verify-relish-release.ts [https://approved-preview-origin]
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import dotenv from "dotenv";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import {
  makeIdentity,
  keyFingerprint,
  encryptPassage,
  decryptPassage,
} from "../src/lib/relish/sharing";
import { createVault, unlockVault } from "../src/lib/relish/vault";
import { emptyBook } from "../src/lib/relish/model";
async function main() {
  const env = dotenv.parse(await fs.readFile(".env.release-test.local"));
  const origin = new URL(process.argv[2] || "http://127.0.0.1:3210").origin;
  assert(
    origin === "http://127.0.0.1:3210" ||
      origin.endsWith("-scottrings-projects.vercel.app"),
    "Use the approved local or preview target only",
  );
  const credentials = JSON.parse(
    env.RELISH_FIREBASE_ADMIN_JSON ||
      (await fs.readFile("../../service-account.json", "utf8")),
  );
  assert.equal(
    credentials.project_id,
    env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    "Credentials must belong to the configured project",
  );
  const app = initializeApp(
    { credential: cert(credentials) },
    `release-qa-${randomUUID()}`,
  );
  const auth = getAuth(app),
    db = getFirestore(app),
    users: any[] = [],
    circleIds = new Set<string>(),
    passageIds = new Set<string>(),
    inviteHashes = new Set<string>();
  const prefix = "relish-release-qa-",
    hash = (s: string) => createHash("sha256").update(s).digest("hex");
  const check = (label: string) => console.log(`PASS ${label}`);
  async function call(
    who: any,
    body: unknown,
    expected = 200,
    customOrigin = origin,
  ) {
    const res = await fetch(`${origin}/api/relish/connections/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: customOrigin,
        "x-relish-consent": "chosen-connection",
        ...(who ? { Authorization: `Bearer ${who.token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    assert.equal(
      res.status,
      expected,
      `${(body as any).action}: ${data.error || "unexpected status"}`,
    );
    return data;
  }
  try {
    for (let i = 0; i < 5; i++) {
      const uid = prefix + randomUUID(),
        email = `${uid}@example.invalid`,
        password = randomBytes(28).toString("base64url");
      await auth.createUser({ uid, email, password, emailVerified: i !== 4 });
      const user: any = { uid, email, password };
      users.push(user);
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, returnSecureToken: true }),
        },
      );
      const signed = await response.json();
      assert(response.ok, "Temporary account sign-in failed");
      user.token = signed.idToken;
      user.identity = await makeIdentity(uid);
      user.keyId = await keyFingerprint(user.identity.publicKey);
    }
    const [a, b, c, outsider, unverified] = users;
    await call(null, { action: "list" }, 401);
    await call(unverified, { action: "list" }, 403);
    await call(a, { action: "list" }, 403, "https://foreign.example.invalid");
    check("unauthenticated, unverified and foreign-origin requests denied");
    await call(
      a,
      {
        action: "register",
        name: "Fictional adult",
        publicKey: a.identity.publicKey,
      },
      403,
    );
    check("online registration requires adult confirmation");
    for (const u of users.slice(0, 4))
      await call(u, {
        action: "register",
        adultConfirmed: true,
        name: `Fictional ${users.indexOf(u) + 1}`,
        publicKey: u.identity.publicKey,
      });
    await call(
      a,
      {
        action: "register",
        adultConfirmed: true,
        name: "Wrong replacement",
        publicKey: b.identity.publicKey,
      },
      409,
    );
    check("an account cannot replace another edition’s sharing key");
    await call(a, { action: "create", name: "Fictional verification family" });
    let state = await call(a, { action: "list" });
    const circle = state.circle;
    circleIds.add(circle.id);
    const invite = await call(a, { action: "invite" });
    inviteHashes.add(hash(invite.code));
    assert.equal(
      (await call(b, { action: "inspect", code: invite.code })).name,
      circle.name,
    );
    const join = await Promise.all(
      [b, c].map((u) =>
        fetch(`${origin}/api/relish/connections/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: origin,
            "x-relish-consent": "chosen-connection",
            Authorization: `Bearer ${u.token}`,
          },
          body: JSON.stringify({ action: "join", code: invite.code }),
        }),
      ),
    );
    assert.deepEqual(join.map((r) => r.status).sort(), [200, 404]);
    const notJoined = join[0].status === 200 ? c : b,
      invite2 = await call(a, { action: "invite" });
    inviteHashes.add(hash(invite2.code));
    await call(notJoined, { action: "join", code: invite2.code });
    check("one-use invitation has exactly one winner under concurrent joins");
    await call(b, { action: "invite" }, 403);
    await call(b, { action: "remove", uid: a.uid }, 403);
    check("ordinary members cannot invite or remove others");
    state = await call(a, { action: "list" });
    assert.equal(state.circle.members.length, 3);
    const passageId = randomUUID();
    passageIds.add(passageId);
    const text = {
      title: "A fictional shared line",
      text: "We built a little pebble tower and listened to each other.",
    };
    const recipients = [b, c],
      packets = Object.fromEntries(
        await Promise.all(
          recipients.map(async (u) => [
            u.uid,
            await encryptPassage(
              text,
              {
                uid: u.uid,
                name: "Fictional",
                publicKey: u.identity.publicKey,
                keyId: u.keyId,
              },
              passageId,
              circle.id,
              a.uid,
            ),
          ]),
        ),
      );
    await call(a, {
      action: "send",
      id: passageId,
      recipients: recipients.map((u) => u.uid),
      packets,
    });
    await call(a, {
      action: "send",
      id: passageId,
      recipients: recipients.map((u) => u.uid),
      packets,
    });
    check("retrying a sent invitation is idempotent");
    const bstate = await call(b, { action: "list" }),
      delivery = bstate.deliveries.find((d: any) => d.id === passageId);
    assert(delivery.packet);
    assert(!JSON.stringify(delivery).includes(packets[c.uid].ciphertext));
    assert.deepEqual(
      await decryptPassage(delivery.packet, b.identity, delivery),
      text,
    );
    const stored = (
      await db.doc(`relish_connections_passages/${passageId}`).get()
    ).data();
    assert(!JSON.stringify(stored).includes(text.text));
    assert(!JSON.stringify(stored).includes(text.title));
    assert(!JSON.stringify(stored).includes(b.identity.privateKey.d));
    check(
      "relay stores ciphertext; intended recipient decrypts the exact passage",
    );
    const outside = await call(outsider, { action: "list" });
    assert.equal(outside.deliveries.length, 0);
    await call(
      outsider,
      { action: "receipt", id: passageId, status: "accepted" },
      409,
    );
    await call(b, { action: "withdraw", id: passageId }, 403);
    const direct = await fetch(
      `https://firestore.googleapis.com/v1/projects/${env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents/relish_connections_passages/${passageId}`,
      { headers: { Authorization: `Bearer ${b.token}` } },
    );
    assert.equal(direct.status, 403);
    check("outsiders and direct database clients cannot read the relay");
    const kept = {
      ...emptyBook("Fictional recipient"),
      connections: {
        identity: b.identity,
        received: [
          {
            id: passageId,
            ...text,
            from: a.uid,
            fromName: "Fictional 1",
            createdAt: delivery.createdAt,
            acceptedAt: new Date().toISOString(),
          },
        ],
      },
    };
    const vault = await createVault(kept, "Fictional verification passphrase");
    assert.deepEqual(
      (
        await unlockVault(
          JSON.stringify(vault.envelope),
          "Fictional verification passphrase",
        )
      ).book,
      kept,
    );
    await call(b, { action: "receipt", id: passageId, status: "accepted" });
    assert(
      !(await call(b, { action: "list" })).deliveries.find(
        (d: any) => d.id === passageId,
      ).packet,
    );
    check(
      "acceptance keeps an encrypted local copy and removes the delivery packet",
    );
    await call(a, {
      action: "send",
      id: passageId,
      recipients: recipients.map((u) => u.uid),
      packets,
    });
    assert(
      !(await call(b, { action: "list" })).deliveries.find(
        (d: any) => d.id === passageId,
      ).packet,
    );
    check("retry after acceptance does not recreate a delivery packet");
    await call(a, { action: "remove", uid: c.uid });
    const removed = await call(c, { action: "list" });
    assert.equal(removed.circle, null);
    assert.equal(removed.deliveries.length, 0);
    await call(
      c,
      { action: "receipt", id: passageId, status: "accepted" },
      409,
    );
    check("removed members lose access to pending passages");
    await call(a, { action: "withdraw", id: passageId });
    assert(
      (await call(b, { action: "list" })).deliveries.find(
        (d: any) => d.id === passageId,
      ).revoked,
    );
    check(
      "withdrawal removes outstanding ciphertext without claiming to recall saved copies",
    );
    if (process.env.RELISH_VERIFY_AI === "1") {
      const response = await fetch(`${origin}/api/relish/assist/`, {
        method: "POST",
        headers: {
          Origin: origin,
          "Content-Type": "application/json",
          "x-relish-consent": "selected-excerpt",
          Authorization: `Bearer ${a.token}`,
        },
        body: JSON.stringify({
          provider: "cloud",
          excerpt:
            "Fictional release check: We enjoyed building a little stone tower together, and each person had a turn. Offer one gentle reflection.",
        }),
      });
      const answer = await response.json();
      assert.equal(
        response.status,
        200,
        "Hosted AI should return a real response",
      );
      assert(typeof answer.text === "string" && answer.text.length > 20);
      check(
        "hosted AI returned a real response for the reviewed fictional excerpt",
      );
    }
    if (process.env.RELISH_KEEP_QA !== "1") {
      await call(
        a,
        { action: "deleteAccount", confirmation: "DELETE ONLINE ACCOUNT" },
        409,
      );
      assert(
        (await db.doc(`relish_connections_profiles/${a.uid}`).get()).exists,
      );
      await call(b, {
        action: "deleteAccount",
        confirmation: "DELETE ONLINE ACCOUNT",
      });
      assert(
        !(await db.doc(`relish_connections_profiles/${b.uid}`).get()).exists,
      );
      await assert.rejects(auth.getUser(b.uid));
      const remaining = (
        await db.doc(`relish_connections_passages/${passageId}`).get()
      ).data()!;
      assert(!remaining.recipients.includes(b.uid));
      assert(!remaining.receipts[b.uid]);
      await call(a, {
        action: "deleteAccount",
        confirmation: "DELETE ONLINE ACCOUNT",
      });
      await assert.rejects(auth.getUser(a.uid));
      assert(
        !(await db.doc(`relish_connections_passages/${passageId}`).get())
          .exists,
      );
      assert(
        !(await db.doc(`relish_connections_circles/${circle.id}`).get()).exists,
      );
      check(
        "self-service deletion removes only the chosen accounts and their relay records",
      );
    }
    await auth.revokeRefreshTokens(outsider.uid);
    await call(outsider, { action: "list" }, 401);
    check("revoked account sessions rejected");
    if (process.env.RELISH_KEEP_QA === "1") {
      const folder = "/private/tmp/relish-release-browser-qa";
      await fs.mkdir(folder, { recursive: true, mode: 0o700 });
      for (const u of [a, b]) {
        const book = {
          ...emptyBook(`Fictional ${u === a ? "A" : "B"}`),
          connections: { identity: u.identity, received: [] },
        };
        const v = await createVault(book, "Fictional verification passphrase");
        await fs.writeFile(
          `${folder}/${u === a ? "a" : "b"}.json`,
          JSON.stringify(v.envelope),
          { mode: 0o600 },
        );
      }
      await fs.writeFile(
        `${folder}/accounts.json`,
        JSON.stringify({
          users: users.map((u) => ({
            uid: u.uid,
            email: u.email,
            password: u.password,
          })),
          circleIds: [...circleIds],
          passageIds: [...passageIds],
          inviteHashes: [...inviteHashes],
        }),
        { mode: 0o600 },
      );
      console.log(
        "PASS browser-only fictional fixtures prepared in a private temporary directory",
      );
    }
    check("live release checks completed");
  } finally {
    if (process.env.RELISH_KEEP_QA !== "1") {
      for (const u of users) {
        assert(u.uid.startsWith(prefix));
        const p = (
          await db.doc(`relish_connections_profiles/${u.uid}`).get()
        ).data();
        if (p?.circleId) circleIds.add(p.circleId);
      }
      for (const uid of users.map((u) => u.uid)) {
        await db.recursiveDelete(db.doc(`relish_connections_profiles/${uid}`));
        await db.doc(`relish_connections_usage/${hash(uid)}`).delete();
        await db.doc(`relish_ai_usage/user-${hash(uid)}`).delete();
        await auth.deleteUser(uid).catch((e) => {
          if (e.code !== "auth/user-not-found") throw e;
        });
      }
      for (const id of circleIds)
        await db.doc(`relish_connections_circles/${id}`).delete();
      for (const id of passageIds)
        await db.doc(`relish_connections_passages/${id}`).delete();
      for (const id of inviteHashes)
        await db.doc(`relish_connections_invites/${id}`).delete();
      console.log("Temporary fictional accounts and records removed.");
    }
  }
}
main().catch((e) => {
  console.error(
    "Live release verification failed:",
    e instanceof assert.AssertionError
      ? e.message.split("\n")[0]
      : e.code || e.name,
  );
  process.exitCode = 1;
});
