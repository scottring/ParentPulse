# Vercel Deployment Guide

This guide walks you through deploying LifeManual to Vercel with Firebase backend.

## Architecture

- **Frontend (Vercel)**: Next.js application with SSR/SSG
- **Backend (Firebase)**: Cloud Functions, Firestore, Authentication

## Prerequisites

1. [Vercel account](https://vercel.com/signup)
2. Firebase project with deployed Cloud Functions
3. Vercel CLI (optional): `npm i -g vercel`

## Step 1: Deploy Firebase Cloud Functions

Before deploying to Vercel, ensure your Firebase backend is deployed:

```bash
# Deploy all Firebase services
firebase deploy

# Or deploy only functions
firebase deploy --only functions

# Deploy Firestore rules and indexes
firebase deploy --only firestore:rules,firestore:indexes
```

Verify your functions are live at:
`https://us-central1-[your-project-id].cloudfunctions.net/`

## Step 2: Prepare Environment Variables

You'll need these values from your `.env.local`:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_OPENAI_API_KEY=
NEXT_PUBLIC_ENV=production
```

## Step 3: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your Git repository (GitHub, GitLab, or Bitbucket)
3. Configure project:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `./` (leave as root)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)

4. Add environment variables:
   - Click "Environment Variables"
   - Add each variable from your `.env.local`
   - Set for: Production, Preview, Development

5. Click "Deploy"

### Option B: Deploy via CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (first time - will ask setup questions)
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your account/team
# - Link to existing project? No
# - Project name? lifemanual (or your preferred name)
# - Directory? ./
# - Override settings? No

# Add environment variables
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY
# Paste value when prompted
# Select: Production, Preview, Development

# Repeat for all environment variables...

# Deploy to production
vercel --prod
```

## Step 4: Configure Custom Domain (Optional)

1. In Vercel Dashboard, go to your project
2. Settings > Domains
3. Add your domain (e.g., `lifemanual.com`)
4. Update DNS records as instructed by Vercel
5. Vercel automatically provisions SSL certificate

## Step 5: Verify Deployment

1. Visit your Vercel deployment URL
2. Test authentication (sign up/login)
3. Create a person and manual
4. Verify Cloud Functions are being called:
   - Check Vercel logs
   - Check Firebase Functions logs: `firebase functions:log`

## Continuous Deployment

Once connected to Git:

- **Push to main branch** → Auto-deploys to production
- **Push to other branches** → Creates preview deployments
- **Pull requests** → Creates preview deployments with unique URLs

## Environment-Specific Configuration

### Development
```bash
NEXT_PUBLIC_ENV=development
```

### Production
```bash
NEXT_PUBLIC_ENV=production
```

## Troubleshooting

### Build Failures

Check build logs in Vercel Dashboard:
- Settings > Deployments > [Failed Deployment] > View Build Logs

Common issues:
- Missing environment variables
- TypeScript errors
- ESLint errors (can disable: `eslint: { ignoreDuringBuilds: true }` in `next.config.js`)

### Firebase Connection Issues

Verify Firebase credentials:
```bash
# Test locally first
npm run dev
# Check browser console for Firebase errors
```

### Cloud Functions Not Working

1. Verify functions are deployed: `firebase functions:list`
2. Check CORS is enabled on Cloud Functions
3. Verify Firebase project ID matches environment variable
4. Check Firebase Functions logs: `firebase functions:log`

### API Key Exposure

All `NEXT_PUBLIC_*` variables are exposed to the browser - this is normal for Firebase client SDK. Security is enforced by:
- Firebase Authentication
- Firestore Security Rules
- Cloud Functions with secret API keys (ANTHROPIC_API_KEY)

## Performance Optimization

### Edge Functions

For improved performance, consider using Vercel Edge Functions for:
- Authentication checks
- API route handlers

### Caching

Vercel automatically caches:
- Static assets
- Server-side rendered pages (based on `revalidate` settings)

### Analytics

Enable Vercel Analytics:
- Settings > Analytics > Enable

## Cost Considerations

### Vercel Pricing
- **Hobby**: Free (good for development/personal use)
  - 100GB bandwidth/month
  - Unlimited deployments
- **Pro**: $20/month
  - 1TB bandwidth/month
  - Advanced features

### Firebase Pricing
- **Spark Plan**: Free
  - 125K function invocations/month
  - 50K reads/day on Firestore
- **Blaze Plan**: Pay as you go
  - Required for Cloud Functions with Anthropic API calls

## Security Checklist

- [ ] All sensitive keys in environment variables (not committed to Git)
- [ ] Firestore security rules deployed and tested
- [ ] Firebase Authentication enabled
- [ ] CORS properly configured on Cloud Functions
- [ ] `ANTHROPIC_API_KEY` stored as Firebase secret (not in Vercel)
- [ ] Production environment uses `NEXT_PUBLIC_ENV=production`

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Firebase with Vercel](https://vercel.com/guides/deploying-nextjs-firebase-and-vercel)
