# Firebase Setup Instructions

Your app is getting "Missing or insufficient permissions" because Firebase services aren't fully enabled yet. Follow these steps:

## 1. Enable Email/Password Authentication

1. Go to: https://console.firebase.google.com/project/parentpulse-d68ba/authentication/providers
2. Click on "Email/Password" provider
3. Toggle "Enable" to ON
4. Click "Save"

## 2. Enable Firestore Database

1. Go to: https://console.firebase.google.com/project/parentpulse-d68ba/firestore
2. Click "Create Database"
3. Choose "Start in production mode" (we'll deploy security rules next)
4. Select a region (preferably close to you, e.g., `us-central1`)
5. Click "Enable"

## 3. Deploy Firestore Security Rules

From your terminal in the project directory:

```bash
cd /Users/scottkaufman/parentpulse-web
firebase deploy --only firestore:rules
```

If you don't have Firebase CLI installed:
```bash
npm install -g firebase-tools
firebase login
firebase use parentpulse-d68ba
firebase deploy --only firestore:rules
```

## 4. Enable Cloud Storage

1. Go to: https://console.firebase.google.com/project/parentpulse-d68ba/storage
2. Click "Get Started"
3. Use default rules for now (we'll deploy custom rules next)
4. Click "Done"

## 5. Deploy Storage Security Rules

```bash
firebase deploy --only storage
```

## 6. Test Your App

Once all services are enabled, try these steps in your app:

1. Go to http://localhost:3001/register
2. Create an account with:
   - Your name
   - Email address
   - Family name (e.g., "The Smith Family")
   - Password (minimum 6 characters)
3. You should be redirected to the dashboard
4. Try creating a journal entry

## Troubleshooting

If you still see errors:

1. **Check authentication is enabled**: Look for a green checkmark next to "Email/Password" in Authentication providers
2. **Check Firestore is created**: You should see the Firestore database with collections appearing as you use the app
3. **Check security rules deployed**: Run `firebase deploy --only firestore:rules,storage` again
4. **Clear browser cache**: Sometimes Firebase caches old configurations

## Security Rules Files

Your security rules are located at:
- Firestore: `/Users/scottkaufman/parentpulse-web/firestore.rules`
- Storage: `/Users/scottkaufman/parentpulse-web/storage.rules`

These rules implement role-based access control:
- **Parents**: Full access to family data, can create journal entries, manage children
- **Children**: Can only create check-ins and view their own chip balance

## What's Working So Far

- ✅ Beautiful design system (parent and child themes)
- ✅ Login and registration pages
- ✅ Dashboard
- ✅ Journal entry creation (new!)
- ✅ Journal list view (new!)
- ✅ Security rules configured
- ⏳ Waiting for Firebase services to be enabled

Once Firebase is set up, you'll be able to:
- Create and save journal entries
- View your journal history with filters
- Add children to your family
- Track parenting patterns over time
