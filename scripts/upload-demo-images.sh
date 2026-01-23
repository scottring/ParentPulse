#!/bin/bash

# Upload Demo Story Images to Firebase Storage
# This script uploads the generated demo images to Firebase Storage

echo "📤 Uploading demo story images to Firebase Storage..."
echo ""

# Get the storage bucket from .env
BUCKET=$(grep EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET .env | cut -d '=' -f2)

if [ -z "$BUCKET" ]; then
    echo "❌ Error: Could not find EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET in .env"
    exit 1
fi

echo "Bucket: $BUCKET"
echo ""

# Upload each image
for i in {1..7}; do
    FILE="demo-story-images/alex-story-day-${i}.png"
    DEST="gs://${BUCKET}/demo-story-images/alex-story-day-${i}.png"

    echo "⬆️  Uploading day ${i}..."
    gsutil -h "Cache-Control:public,max-age=31536000" \
           -h "Content-Type:image/png" \
           cp "$FILE" "$DEST"

    # Make it public
    gsutil acl ch -u AllUsers:R "$DEST"

    echo "✓ Day ${i} uploaded and made public"
    echo ""
done

echo "✅ All images uploaded successfully!"
echo ""
echo "📝 Public URLs:"
echo "========================================"
echo ""

for i in {1..7}; do
    URL="https://storage.googleapis.com/${BUCKET}/demo-story-images/alex-story-day-${i}.png"
    echo "Day ${i}: $URL"
done

echo ""
echo "========================================"
echo ""
echo "Copy these URLs into functions/sample-story-data.js"
