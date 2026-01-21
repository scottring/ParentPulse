# Firestore Indexes Setup

The Weekly Workbooks system requires composite indexes in Firestore to support efficient queries. These indexes need to be created before the dashboard will work properly.

## Required Indexes

### 1. Weekly Workbooks Index

**Collection:** `weekly_workbooks`

**Fields:**
- `familyId` (Ascending)
- `status` (Ascending)
- `weekStartDate` (Ascending)

**Query scopes:** Collection

This index supports the main dashboard query that fetches active workbooks for the current week.

### 2. People/Person Manuals Index (if not already created)

**Collection:** `people`

**Fields:**
- `familyId` (Ascending)
- `addedAt` (Descending)

**Query scopes:** Collection

### 3. Workbook Observations Index

**Collection:** `workbook_observations`

**Fields:**
- `workbookId` (Ascending)
- `familyId` (Ascending)
- `timestamp` (Descending)

**Query scopes:** Collection

### 4. Behavior Tracking Index

**Collection:** `behavior_tracking`

**Fields:**
- `workbookId` (Ascending)
- `familyId` (Ascending)
- `timestamp` (Descending)

**Query scopes:** Collection

## How to Create Indexes

### Option 1: Automatic Creation (Recommended)

1. **Run the app** and navigate to the dashboard at `http://localhost:3000/dashboard`
2. **Open the browser console** (F12 or Cmd+Option+I on Mac)
3. **Look for a Firebase error** that says "Missing or insufficient permissions"
4. **Click the Firebase Console link** in the error message - it will look like:
   ```
   https://console.firebase.google.com/v1/r/project/YOUR_PROJECT/firestore/indexes?create_composite=...
   ```
5. **Click "Create Index"** in the Firebase Console
6. **Wait 1-5 minutes** for the index to build
7. **Refresh the dashboard** page

The error message will automatically include the exact index configuration needed.

### Option 2: Manual Creation

1. Go to the [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Firestore Database** → **Indexes** tab
4. Click **Create Index**
5. Enter the collection ID and fields as specified above
6. Click **Create**
7. Repeat for each required index

### Option 3: Firebase CLI

You can also create indexes using the Firebase CLI by adding them to `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "weekly_workbooks",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "familyId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "status",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "weekStartDate",
          "order": "ASCENDING"
        }
      ]
    },
    {
      "collectionGroup": "workbook_observations",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "workbookId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "familyId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "timestamp",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "behavior_tracking",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "workbookId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "familyId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "timestamp",
          "order": "DESCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
```

Then deploy:
```bash
firebase deploy --only firestore:indexes
```

## Verifying Index Status

1. Go to Firebase Console → Firestore → Indexes
2. Check the **Status** column:
   - **Building** (orange) - Index is being created, wait a few minutes
   - **Enabled** (green) - Index is ready to use
   - **Error** (red) - There was a problem, check the error message

## Troubleshooting

### "Missing or insufficient permissions" error persists

- Verify all indexes show "Enabled" status in Firebase Console
- Clear browser cache and refresh the page
- Check that your user account has a valid `familyId` in the `users` collection

### Index building is taking a long time

- Initial index builds can take 1-5 minutes for empty collections
- Larger collections may take longer
- You can monitor progress in the Firebase Console

### Queries still failing after index is created

- Ensure security rules in `firestore.rules` are deployed:
  ```bash
  firebase deploy --only firestore:rules
  ```
- Check that the user is properly authenticated
- Verify the query parameters match the index fields exactly

## Next Steps

Once all indexes are created and enabled:

1. Refresh the dashboard
2. The error message should disappear
3. If you have people with manuals in your system, you'll see workbook cards
4. If not, navigate to `/people` to add people and create manuals
5. Workbooks will be automatically created at the start of each week (or can be manually created via the hook)

## Future Indexes

As you build additional features in Phase 2-5, you may need to create additional indexes for:

- Person behavior history queries
- Weekly analysis retrieval
- Daily priorities filtering
- Cross-workbook pattern analysis

The app will automatically prompt you with the required index URLs when these features are used.
