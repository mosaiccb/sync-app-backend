import NodeCache from 'node-cache';

export class CacheService {
  private cache: NodeCache;

  constructor() {
    this.cache = new NodeCache({
      stdTTL: 300, // Default TTL of 5 minutes
      checkperiod: 60, // Check for expired keys every 60 seconds
      useClones: false
    });
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | undefined {
    return this.cache.get<T>(key);
  }

  /**
   * Set a value in cache with optional TTL
   */
  set<T>(key: string, value: T, ttl?: number): boolean {
    return this.cache.set(key, value, ttl || 0);
  }

  /**
   * Delete a value from cache
   */
  del(key: string): number {
    return this.cache.del(key);
  }

  /**
   * Delete multiple values from cache
   */
  delMany(keys: string[]): number {
    return this.cache.del(keys);
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Get all keys from cache
   */
  keys(): string[] {
    return this.cache.keys();
  }

  /**
   * Clear all cache entries
   */
  flushAll(): void {
    this.cache.flushAll();
  }

  /**
   * Get cache statistics
   */
  getStats(): NodeCache.Stats {
    return this.cache.getStats();
  }
}

// Export singleton instance
export const cache = new CacheService();
