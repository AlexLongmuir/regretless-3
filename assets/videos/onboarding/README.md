# Onboarding Intro Images

**Note:** This component now uses images instead of videos. The image carousel is implemented in `app/onboarding/intro.tsx`.

## Current Implementation

The intro screen uses 4 placeholder images from `assets/images/onboarding/`:
- Individuality Amidst Motion
- Golden City Sunrise
- Swirling Abstract Energy
- Silhouette Moving Forward

## To Customize

Edit the `imageData` array in `app/onboarding/intro.tsx` to:
1. Replace image sources with your custom images
2. Update the `benefitText` for each image

Images auto-advance every 3 seconds, and users can tap to skip to the next image.
