/**
 * Preload Onboarding Images Utility
 * 
 * Preloads all onboarding images when the onboarding flow starts.
 * This eliminates delays when screens render by caching images in memory.
 * 
 * Uses Image.resolveAssetSource() to resolve local image sources and
 * Image.prefetch() to preload them into React Native's image cache.
 */

import { Image } from 'react-native';

/**
 * All onboarding images that need to be preloaded
 * Organized by screen for easy reference
 */
const onboardingImages = {
  // Welcome screen
  individualityImage: require('../assets/images/onboarding/20250916_0844_Individuality Amidst Motion_simple_compose_01k58qptvqfr5awmazzyd181js.png'),
  
  // Name screen
  cityImage: require('../assets/images/onboarding/20250916_0840_Golden City Sunrise_simple_compose_01k58qf6d3ekhv8gkph5ac0ygy.png'),
  
  // Understanding screen
  silhouetteImage: require('../assets/images/onboarding/20250916_0855_Silhouette Moving Forward_simple_compose_01k58r9xcefs5rm7mgk7c0b9r5.png'),
  
  // Realistic goal screen
  goldenHourImage: require('../assets/images/onboarding/20250916_0844_Golden-Hour Energy_simple_compose_01k58qq3znfbt9k5x9xktgcb5t.png'),
  
  // Generating screen
  swirlingAbstractImage: require('../assets/images/onboarding/20250916_0842_Swirling Abstract Energy_simple_compose_01k58qjb1ae89sraq48r9636ze.png'),
  
  // Rating screen - user images
  userImage1: require('../assets/images/onboarding/user-images/20250916_1911_Professional Woman Portrait_simple_compose_01k59vj1yje2vrjgm9xmqk2jz1.png'),
  userImage2: require('../assets/images/onboarding/user-images/20250916_1912_Cafe Portrait Relaxation_simple_compose_01k59vhpmvfhxr16vh7ckf2nke.png'),
  userImage3: require('../assets/images/onboarding/user-images/20250916_1906_Casual Indoor Selfie_simple_compose_01k59v95vsfgrb7s3sftspaqnc.png'),
  userImage4: require('../assets/images/onboarding/user-images/20250916_1907_Street Selfie Moment_simple_compose_01k59vbb8te8vs2fe7yv8c4t92.png'),
  userImage5: require('../assets/images/onboarding/user-images/20250916_1904_Golden Hour Portrait_simple_compose_01k59v5jqpfy5t97a7p5rqck6b.png'),
  userImage6: require('../assets/images/onboarding/user-images/20250916_1904_Cafe Portrait Relaxation_simple_compose_01k59v5zd1f7aa9dpecjwgh8xe.png'),
  
  // Achievement comparison screen
  chartImage: require('../assets/images/onboarding/chart.png'),
  
  // Intro screen - dream images
  lifecoachImage: require('../assets/images/lifecoach.png'),
  transcendImage: require('../assets/images/transcend.png'),
  rocketshipImage: require('../assets/images/3drocketship.png'),
};

/**
 * Preloads all onboarding images
 * 
 * This function resolves all local image sources and prefetches them
 * into React Native's image cache. Images will be ready instantly when
 * screens render.
 * 
 * @returns Promise that resolves when all images are preloaded
 *          (or when preload attempts complete, even if some fail)
 */
export const preloadOnboardingImages = async (): Promise<void> => {
  try {
    // Convert all image requires to an array
    const imageSources = Object.values(onboardingImages);
    
    // Resolve all asset sources and prefetch them in parallel
    const preloadPromises = imageSources.map((imageSource) => {
      try {
        // Resolve the asset source to get the URI
        const resolvedSource = Image.resolveAssetSource(imageSource);
        
        if (resolvedSource?.uri) {
          // Prefetch the image - this caches it in React Native's image cache
          return Image.prefetch(resolvedSource.uri).catch((error) => {
            // Silently fail individual prefetches - don't block other images
            console.warn('Failed to preload image:', resolvedSource.uri, error);
            return Promise.resolve();
          });
        }
        
        return Promise.resolve();
      } catch (error) {
        // Silently fail individual image resolution
        console.warn('Failed to resolve image source:', error);
        return Promise.resolve();
      }
    });
    
    // Wait for all preload attempts to complete
    await Promise.all(preloadPromises);
    
    console.log('Onboarding images preloaded successfully');
  } catch (error) {
    // Don't throw - preload failures shouldn't block onboarding
    console.warn('Error preloading onboarding images:', error);
  }
};

