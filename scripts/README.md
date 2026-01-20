# Admin Scripts

This directory contains administrative scripts for managing the Relish Firebase backend.

## Prerequisites

All scripts require the Firebase Admin SDK service account key:
- `parentpulse-d68ba-firebase-adminsdk-fbsvc-dc25ebe3ac.json` must be in the project root

## User Management Scripts

### check-orphaned-users.js
Diagnostic script to identify orphaned Firebase Auth accounts.

**What it does:**
- Lists all Firebase Auth users
- Checks each for corresponding Firestore user document
- Identifies "orphaned" auth accounts (auth exists but no Firestore doc)

**When to use:**
- When you see "User document not found in Firestore" errors
- To audit auth/Firestore sync after registration issues
- Before cleaning up test accounts

**Usage:**
```bash
node scripts/check-orphaned-users.js
```

**Output:**
- ✅ Valid users with Firestore documents
- ❌ Orphaned users missing Firestore documents
- Summary count and cleanup instructions

---

### cleanup-orphaned-users.js
**⚠️ DESTRUCTIVE** - Deletes orphaned Firebase Auth accounts.

**What it does:**
- Finds auth accounts without Firestore documents
- Prompts for confirmation before deletion
- Permanently deletes orphaned auth accounts

**When to use:**
- After confirming orphaned users exist via `check-orphaned-users.js`
- To clean up failed registration attempts
- To remove test accounts that didn't complete setup

**Usage:**
```bash
node scripts/cleanup-orphaned-users.js
```

**Safety:**
- Requires manual "yes" confirmation
- Shows full list of accounts to be deleted
- Cannot be undone - use with caution

---

## Database Management Scripts

### clear-database.js
Clears all collections in the database.

### wipe-database.js
Complete database wipe (use with extreme caution).

### check-kaleb.js
Development script to inspect specific child records.

### reset-kaleb.js
Development script to reset specific child data.

---

## Common Issues

### "User document not found in Firestore"

**Cause:** Firebase Auth account exists but Firestore user document is missing.

**This happens when:**
- Registration flow fails after auth creation
- Manual testing creates auth accounts without Firestore docs
- Network issues interrupt registration
- Development database operations delete user docs

**Resolution:**
1. Run `node scripts/check-orphaned-users.js` to diagnose
2. If orphaned users found, run `node scripts/cleanup-orphaned-users.js`
3. User will need to register again

**Prevention:** The app includes automatic orphaned user protection:
- Detects missing Firestore documents during login
- Automatically signs out orphaned users
- Prevents incomplete account states
- Registration flow includes cleanup on failure (lines 214-221 in AuthContext.tsx)

---

## Development Best Practices

1. **Always check before cleanup:** Run diagnostic scripts before destructive operations
2. **Backup important data:** Consider exporting Firestore data before major operations
3. **Test in staging:** Test scripts against development/staging environment first
4. **Review output carefully:** Check exactly what will be deleted before confirming
5. **Document changes:** Update this README when adding new scripts

---

## Script Template

When creating new admin scripts, follow this pattern:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('../parentpulse-d68ba-firebase-adminsdk-fbsvc-dc25ebe3ac.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function yourScriptFunction() {
  try {
    // Your logic here
    console.log('Operation complete');
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

yourScriptFunction().catch(console.error);
```
