// lib/imageCache.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CachedImage {
  uri: string;
  cachedAt: number;
  size?: number;
}

const IMAGE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE = 50; // Maximum number of images to cache
const CACHE_KEY_PREFIX = 'image_cache:';

class ImageCache {
  private cache: Map<string, CachedImage> = new Map();
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      const keys = await AsyncStorage.getAllKeys();
      const imageKeys = keys.filter(key => key.startsWith(CACHE_KEY_PREFIX));
      
      if (imageKeys.length > 0) {
        const cachedImages = await AsyncStorage.multiGet(imageKeys);
        cachedImages.forEach(([key, value]) => {
          if (value) {
            try {
              const cachedImage: CachedImage = JSON.parse(value);
              const imageId = key.replace(CACHE_KEY_PREFIX, '');
              this.cache.set(imageId, cachedImage);
            } catch (error) {
              console.warn('Failed to parse cached image:', error);
            }
          }
        });
      }
      
      this.isInitialized = true;
      console.log(`ImageCache initialized with ${this.cache.size} cached images`);
    } catch (error) {
      console.error('Failed to initialize ImageCache:', error);
    }
  }

  private isExpired(cachedAt: number): boolean {
    return Date.now() - cachedAt > IMAGE_CACHE_TTL;
  }

  private async cleanup() {
    const now = Date.now();
    const expiredKeys: string[] = [];
    const validImages: Array<{ key: string; cachedAt: number }> = [];

    // Find expired and valid images
    for (const [key, value] of this.cache.entries()) {
      if (this.isExpired(value.cachedAt)) {
        expiredKeys.push(key);
      } else {
        validImages.push({ key, cachedAt: value.cachedAt });
      }
    }

    // Remove expired images
    if (expiredKeys.length > 0) {
      expiredKeys.forEach(key => this.cache.delete(key));
      const storageKeys = expiredKeys.map(key => `${CACHE_KEY_PREFIX}${key}`);
      await AsyncStorage.multiRemove(storageKeys);
    }

    // If still over limit, remove oldest images
    if (validImages.length > MAX_CACHE_SIZE) {
      validImages.sort((a, b) => a.cachedAt - b.cachedAt);
      const toRemove = validImages.slice(0, validImages.length - MAX_CACHE_SIZE);
      
      toRemove.forEach(({ key }) => this.cache.delete(key));
      const storageKeys = toRemove.map(({ key }) => `${CACHE_KEY_PREFIX}${key}`);
      await AsyncStorage.multiRemove(storageKeys);
    }
  }

  async getCachedImage(uri: string): Promise<string | null> {
    await this.initialize();
    
    const imageId = this.generateImageId(uri);
    const cached = this.cache.get(imageId);
    
    if (cached && !this.isExpired(cached.cachedAt)) {
      return cached.uri;
    }
    
    return null;
  }

  async cacheImage(originalUri: string, cachedUri: string): Promise<void> {
    await this.initialize();
    
    const imageId = this.generateImageId(originalUri);
    const cachedImage: CachedImage = {
      uri: cachedUri,
      cachedAt: Date.now(),
    };
    
    this.cache.set(imageId, cachedImage);
    
    try {
      await AsyncStorage.setItem(
        `${CACHE_KEY_PREFIX}${imageId}`,
        JSON.stringify(cachedImage)
      );
      
      // Cleanup if needed
      if (this.cache.size > MAX_CACHE_SIZE) {
        await this.cleanup();
      }
    } catch (error) {
      console.error('Failed to cache image:', error);
    }
  }

  private generateImageId(uri: string): string {
    // Create a simple hash of the URI for use as cache key
    let hash = 0;
    for (let i = 0; i < uri.length; i++) {
      const char = uri.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const imageKeys = keys.filter(key => key.startsWith(CACHE_KEY_PREFIX));
      
      if (imageKeys.length > 0) {
        await AsyncStorage.multiRemove(imageKeys);
      }
      
      this.cache.clear();
      console.log('Image cache cleared');
    } catch (error) {
      console.error('Failed to clear image cache:', error);
    }
  }

  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: MAX_CACHE_SIZE,
    };
  }
}

export const imageCache = new ImageCache();
