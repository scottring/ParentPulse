# ParentPulse Setup Guide

## 🔥 Firebase Setup (Do This First!)

I've opened three Firebase Console tabs in your browser. Follow these steps:

### Step 1: Enable Email/Password Authentication
**Tab 1: Authentication Providers**
1. Look for "Email/Password" in the list of sign-in providers
2. Click on it
3. Toggle the first "Enable" switch to ON (leave "Email link" disabled)
4. Click "Save"
5. You should see a green checkmark next to Email/Password

### Step 2: Create Firestore Database
**Tab 2: Firestore Database**
1. If you see "Create database" button, click it
2. Choose "Start in production mode" (we'll deploy security rules next)
3. Select location: `us-central1` (or closest to you)
4. Click "Enable"
5. Wait for the database to be created (takes ~30 seconds)

### Step 3: Enable Cloud Storage
**Tab 3: Storage**
1. If you see "Get started" button, click it
2. Start in production mode
3. Use same location as Firestore
4. Click "Done"

### Step 4: Deploy Security Rules & Indexes
Back in your terminal, run these commands:

```bash
cd /Users/scottkaufman/parentpulse-web

# Deploy Firestore rules and indexes
firebase deploy --only firestore

# Deploy Storage rules  
firebase deploy --only storage
```

You should see success messages for both commands.

### Step 5: Verify Setup
Go back to the Firebase Console and verify:
- ✅ Email/Password is enabled in Authentication
- ✅ Firestore Database is created and empty
- ✅ Storage bucket is created
- ✅ Rules show "Last modified: a few seconds ago"

---

## 🐙 GitHub Setup

### Option A: Create a new GitHub repository (Recommended)

1. Go to: https://github.com/new
2. Fill in:
   - Repository name: `parentpulse-web`
   - Description: "Interactive parenting app with journaling, AI insights, and child check-ins"
   - Choose: Private (recommended for personal use)
3. DO NOT initialize with README, .gitignore, or license (we already have these)
4. Click "Create repository"

5. Then run these commands in your terminal:
```bash
cd /Users/scottkaufman/parentpulse-web

# Add all files
git add .

# Commit your work
git commit -m "Initial commit: Complete authentication, journal system, and design"

# Add GitHub remote (replace YOUR_GITHUB_USERNAME)
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/parentpulse-web.git

# Push to GitHub
git push -u origin main
```

### Option B: Use existing repository
If you already have a repository:
```bash
cd /Users/scottkaufman/parentpulse-web
git add .
git commit -m "Initial commit: Complete authentication, journal system, and design"
git remote add origin YOUR_REPO_URL
git push -u origin main
```

---

## 📁 Local Storage Organization

Your project is already well-organized at:
```
/Users/scottkaufman/parentpulse-web/
```

### Current Structure:
```
parentpulse-web/
├── .firebaserc          # Firebase project config
├── .gitignore           # Git ignore rules
├── firebase.json        # Firebase services config
├── firestore.rules      # Database security rules
├── firestore.indexes.json  # Database query indexes
├── storage.rules        # Storage security rules
├── FIREBASE_SETUP.md    # Detailed Firebase instructions
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
├── tailwind.config.ts   # Tailwind CSS config
├── next.config.ts       # Next.js config
└── src/
    ├── app/
    │   ├── globals.css        # Design system
    │   ├── layout.tsx         # Root layout
    │   ├── page.tsx           # Landing page
    │   ├── login/             # Login page
    │   ├── register/          # Registration page
    │   ├── dashboard/         # Parent dashboard
    │   ├── journal/
    │   │   ├── page.tsx       # Journal list
    │   │   ├── new/           # New entry form
    │   │   └── [id]/          # Entry detail
    │   └── child/             # Child interface
    ├── context/
    │   └── AuthContext.tsx    # Auth state management
    ├── hooks/
    │   ├── useJournal.ts      # Journal operations
    │   └── useChildren.ts     # Child management
    ├── lib/
    │   └── firebase.ts        # Firebase initialization
    └── types/
        └── index.ts           # TypeScript definitions
```

### Recommended: Create a backup
```bash
# Create a backup directory
mkdir -p ~/Documents/ParentPulse-Backups

# Create a timestamped backup
cp -r /Users/scottkaufman/parentpulse-web ~/Documents/ParentPulse-Backups/parentpulse-web-$(date +%Y%m%d-%H%M%S)
```

---

## ✅ Testing Your Setup

After completing Firebase and GitHub setup:

1. **Test the app:**
```bash
cd /Users/scottkaufman/parentpulse-web
npm run dev
```

2. **Open http://localhost:3001**

3. **Try to register:**
   - Go to /register
   - Create an account
   - You should be redirected to /dashboard

4. **Test journal entry:**
   - Click "Today's Journal" on dashboard
   - Fill out the form
   - Submit
   - Entry should appear in journal list

5. **Check Firebase Console:**
   - Go to Firestore tab
   - You should see `families`, `users`, and `journal_entries` collections
   - Click into them to see your data!

---

## 🚀 Next Steps

Once everything is working:

1. **Add children to your family** (next feature to build)
2. **Set up child check-ins** (Phase 3)
3. **Implement chip economy** (Phase 4)
4. **Integrate AI insights** (Phase 5)
5. **Deploy to Vercel** (when ready for production)

---

## 🆘 Troubleshooting

### "Missing or insufficient permissions"
- Make sure you enabled Email/Password authentication
- Make sure Firestore database is created
- Make sure you deployed the security rules: `firebase deploy --only firestore,storage`

### "Cannot find module '@/...' "
- Run `npm install` to ensure all dependencies are installed

### Git push rejected
- Make sure you created the GitHub repository first
- Make sure the remote URL is correct: `git remote -v`
- Try: `git pull origin main --allow-unrelated-histories` then `git push`

### Firebase deploy fails
- Make sure you're logged in: `firebase login`
- Make sure project is selected: `firebase use parentpulse-d68ba`

---

Need help? Check FIREBASE_SETUP.md for more detailed Firebase instructions!
