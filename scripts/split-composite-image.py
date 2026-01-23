#!/usr/bin/env python3
"""
Split composite storybook image into individual day images
"""

from PIL import Image
import os

# Input composite image path
composite_path = input("Enter the path to your composite image: ").strip()

# Output directory
output_dir = os.path.join(os.path.dirname(__file__), '..', 'demo-story-images')
os.makedirs(output_dir, exist_ok=True)

# Load the composite image
img = Image.open(composite_path)
width, height = img.size

print(f"Composite image size: {width} x {height}")

# Based on the layout, there are 3 rows:
# Row 1: Day 1, Day 2, Day 3
# Row 2: Day 4, Day 5 (unlabeled middle)
# Row 3: Day 6, Day 7, (empty or Day 7 on right)

# Let's assume 3 columns, 3 rows with some potentially empty
# We'll split into a 3x3 grid and extract the 7 images

# Calculate approximate dimensions for each cell
cell_width = width // 3
cell_height = height // 3

# Define which cells contain which days (row, col) -> day number
# Row 0: Days 1, 2, 3
# Row 1: Days 4, 5, (skip)
# Row 2: Days 6, 7, (skip)
day_positions = [
    (0, 0, 1),  # Day 1
    (0, 1, 2),  # Day 2
    (0, 2, 3),  # Day 3
    (1, 0, 4),  # Day 4
    (1, 1, 5),  # Day 5
    (2, 0, 6),  # Day 6
    (2, 1, 7),  # Day 7
]

for row, col, day_num in day_positions:
    # Calculate crop box
    left = col * cell_width
    top = row * cell_height
    right = left + cell_width
    bottom = top + cell_height

    # Crop the image
    cropped = img.crop((left, top, right, bottom))

    # Save
    output_path = os.path.join(output_dir, f'alex-story-day-{day_num}.png')
    cropped.save(output_path)
    print(f"✓ Saved Day {day_num}: {output_path}")

print(f"\n✅ All 7 images saved to: {output_dir}")
print("\nNext step: Upload these images to Firebase Storage at demo-story-images/")
