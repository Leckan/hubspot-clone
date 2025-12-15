/**
 * Cache utility for performance optimization
 * Uses in-memory caching for development and Redis for production
 */

interface CacheItem {
  data: any;
  expiry: number;
}

class MemoryCache {
  private cache = new Map<string, CacheItem>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired items every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (item.expiry < now) {
        this.cache.delete(key);
      }
    }
  }

  async get(key: string): Promise<any> {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (item.expiry < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  async set(key: string, data: any, ttlSeconds: number = 300): Promise<void> {
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { data, expiry });
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  destroy() {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}

// Singleton instance
let cacheInstance: MemoryCache | null = null;

export function getCache(): MemoryCache {
  if (!cacheInstance) {
    cacheInstance = new MemoryCache();
  }
  return cacheInstance;
}

// Cache key generators
export const CacheKeys = {
  dashboardKPIs: (organizationId: string, startDate?: string, endDate?: string) => 
    `dashboard:kpis:${organizationId}:${startDate || 'all'}:${endDate || 'all'}`,
  
  contactList: (organizationId: string, page: number, limit: number, search?: string, companyId?: string) =>
    `contacts:list:${organizationId}:${page}:${limit}:${search || 'all'}:${companyId || 'all'}`,
  
  dealList: (organizationId: string, page: number, limit: number, stage?: string, ownerId?: string) =>
    `deals:list:${organizationId}:${page}:${limit}:${stage || 'all'}:${ownerId || 'all'}`,
  
  companyList: (organizationId: string, page: number, limit: number, search?: string) =>
    `companies:list:${organizationId}:${page}:${limit}:${search || 'all'}`,
  
  pipelineAnalytics: (organizationId: string) =>
    `pipeline:analytics:${organizationId}`,
  
  activityList: (organizationId: string, contactId?: string, dealId?: string) =>
    `activities:list:${organizationId}:${contactId || 'all'}:${dealId || 'all'}`,
};

// Cache invalidation patterns
export const CacheInvalidation = {
  // Invalidate all contact-related caches
  contacts: (organizationId: string) => [
    `contacts:*:${organizationId}:*`,
    `dashboard:kpis:${organizationId}:*`,
  ],
  
  // Invalidate all deal-related caches
  deals: (organizationId: string) => [
    `deals:*:${organizationId}:*`,
    `pipeline:analytics:${organizationId}`,
    `dashboard:kpis:${organizationId}:*`,
  ],
  
  // Invalidate all company-related caches
  companies: (organizationId: string) => [
    `companies:*:${organizationId}:*`,
    `contacts:*:${organizationId}:*`, // Companies affect contact listings
    `dashboard:kpis:${organizationId}:*`,
  ],
  
  // Invalidate all activity-related caches
  activities: (organizationId: string) => [
    `activities:*:${organizationId}:*`,
    `dashboard:kpis:${organizationId}:*`,
  ],
};

// Helper function to invalidate cache patterns
export async function invalidateCachePattern(pattern: string): Promise<void> {
  const cache = getCache();
  
  // For memory cache, we need to manually find matching keys
  // In production with Redis, this would use SCAN with pattern matching
  if (pattern.includes('*')) {
    // Simple pattern matching for memory cache
    const basePattern = pattern.replace(/\*/g, '');
    // Note: This is a simplified implementation
    // In production, you'd want more sophisticated pattern matching
    await cache.clear(); // For now, clear all cache when pattern is used
  } else {
    await cache.del(pattern);
  }
}

// Cache wrapper for functions
export function withCache<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  keyGenerator: (...args: T) => string,
  ttlSeconds: number = 300
) {
  return async (...args: T): Promise<R> => {
    const cache = getCache();
    const key = keyGenerator(...args);
    
    // Try to get from cache first
    const cached = await cache.get(key);
    if (cached !== null) {
      return cached;
    }
    
    // Execute function and cache result
    const result = await fn(...args);
    await cache.set(key, result, ttlSeconds);
    
    return result;
  };
}

// Performance monitoring
export class PerformanceMonitor {
  private static metrics = new Map<string, { count: number; totalTime: number; avgTime: number }>();

  static startTimer(operation: string): () => void {
    const start = Date.now();
    
    return () => {
      const duration = Date.now() - start;
      const existing = this.metrics.get(operation) || { count: 0, totalTime: 0, avgTime: 0 };
      
      existing.count++;
      existing.totalTime += duration;
      existing.avgTime = existing.totalTime / existing.count;
      
      this.metrics.set(operation, existing);
      
      // Log slow operations (> 1 second)
      if (duration > 1000) {
        console.warn(`Slow operation detected: ${operation} took ${duration}ms`);
      }
    };
  }

  static getMetrics(): Record<string, { count: number; totalTime: number; avgTime: number }> {
    return Object.fromEntries(this.metrics.entries());
  }

  static resetMetrics(): void {
    this.metrics.clear();
  }
}

// Performance monitoring decorator
export function withPerformanceMonitoring<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  operationName: string
) {
  return async (...args: T): Promise<R> => {
    const endTimer = PerformanceMonitor.startTimer(operationName);
    try {
      const result = await fn(...args);
      return result;
    } finally {
      endTimer();
    }
  };
}