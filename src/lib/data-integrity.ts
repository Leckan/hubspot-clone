/**
 * Data Integrity and Accuracy Validation System
 * Ensures data consistency and implements cache invalidation strategies
 */

import { prisma } from "@/lib/prisma"
import { DatabaseError } from "@/lib/errors"

// Data integrity check results
export interface IntegrityCheckResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  checkedAt: Date
  entityType: string
  entityId?: string
}

// Cache invalidation strategies
export enum CacheInvalidationStrategy {
  IMMEDIATE = "IMMEDIATE",     // Invalidate immediately after write
  LAZY = "LAZY",              // Invalidate on next read
  TTL = "TTL",                // Time-based expiration
  DEPENDENCY = "DEPENDENCY"    // Invalidate based on dependencies
}

// Cache entry interface
interface CacheEntry<T> {
  data: T
  timestamp: Date
  ttl?: number
  dependencies?: string[]
  version?: number
}

// Simple in-memory cache implementation
class DataCache {
  private cache = new Map<string, CacheEntry<any>>()
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes

  set<T>(
    key: string, 
    data: T, 
    ttl?: number, 
    dependencies?: string[],
    version?: number
  ): void {
    this.cache.set(key, {
      data,
      timestamp: new Date(),
      ttl: ttl || this.DEFAULT_TTL,
      dependencies,
      version
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    // Check TTL expiration
    if (entry.ttl && Date.now() - entry.timestamp.getTime() > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  invalidate(key: string): void {
    this.cache.delete(key)
  }

  invalidateByPattern(pattern: RegExp): void {
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key)
      }
    }
  }

  invalidateByDependency(dependency: string): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.dependencies?.includes(dependency)) {
        this.cache.delete(key)
      }
    }
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

// Global cache instance
export const dataCache = new DataCache()

// Data integrity validator
export class DataIntegrityValidator {
  
  /**
   * Validate contact data integrity
   */
  static async validateContact(contactId: string): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      isValid: true,
      errors: [],
      warnings: [],
      checkedAt: new Date(),
      entityType: 'contact',
      entityId: contactId
    }

    try {
      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
        include: {
          company: true,
          deals: true,
          activities: true
        }
      })

      if (!contact) {
        result.isValid = false
        result.errors.push('Contact not found')
        return result
      }

      // Check email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(contact.email)) {
        result.isValid = false
        result.errors.push('Invalid email format')
      }

      // Check company relationship integrity
      if (contact.companyId && !contact.company) {
        result.isValid = false
        result.errors.push('Company reference exists but company not found')
      }

      // Check for orphaned deals
      const orphanedDeals = await prisma.deal.count({
        where: {
          contactId: contactId,
          contact: null
        }
      })

      if (orphanedDeals > 0) {
        result.warnings.push(`${orphanedDeals} orphaned deals found`)
      }

      // Check for orphaned activities
      const orphanedActivities = await prisma.activity.count({
        where: {
          contactId: contactId,
          contact: null
        }
      })

      if (orphanedActivities > 0) {
        result.warnings.push(`${orphanedActivities} orphaned activities found`)
      }

      // Check organization consistency
      if (contact.company && contact.company.organizationId !== contact.organizationId) {
        result.isValid = false
        result.errors.push('Contact and company belong to different organizations')
      }

    } catch (error) {
      result.isValid = false
      result.errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return result
  }

  /**
   * Validate deal data integrity
   */
  static async validateDeal(dealId: string): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      isValid: true,
      errors: [],
      warnings: [],
      checkedAt: new Date(),
      entityType: 'deal',
      entityId: dealId
    }

    try {
      const deal = await prisma.deal.findUnique({
        where: { id: dealId },
        include: {
          contact: true,
          company: true,
          owner: true,
          activities: true
        }
      })

      if (!deal) {
        result.isValid = false
        result.errors.push('Deal not found')
        return result
      }

      // Check stage validity
      const validStages = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']
      if (!validStages.includes(deal.stage)) {
        result.isValid = false
        result.errors.push('Invalid deal stage')
      }

      // Check probability range
      if (deal.probability < 0 || deal.probability > 100) {
        result.isValid = false
        result.errors.push('Probability must be between 0 and 100')
      }

      // Check amount validity
      if (deal.amount && Number(deal.amount) < 0) {
        result.isValid = false
        result.errors.push('Deal amount cannot be negative')
      }

      // Check contact relationship
      if (deal.contactId && !deal.contact) {
        result.isValid = false
        result.errors.push('Contact reference exists but contact not found')
      }

      // Check company relationship
      if (deal.companyId && !deal.company) {
        result.isValid = false
        result.errors.push('Company reference exists but company not found')
      }

      // Check owner relationship
      if (!deal.owner) {
        result.isValid = false
        result.errors.push('Deal owner not found')
      }

      // Check organization consistency
      if (deal.contact && deal.contact.organizationId !== deal.organizationId) {
        result.isValid = false
        result.errors.push('Deal and contact belong to different organizations')
      }

      if (deal.company && deal.company.organizationId !== deal.organizationId) {
        result.isValid = false
        result.errors.push('Deal and company belong to different organizations')
      }

      if (deal.owner && deal.owner.organizationId !== deal.organizationId) {
        result.isValid = false
        result.errors.push('Deal and owner belong to different organizations')
      }

      // Check for logical inconsistencies
      if (deal.stage === 'won' && deal.probability !== 100) {
        result.warnings.push('Won deal should have 100% probability')
      }

      if (deal.stage === 'lost' && deal.probability !== 0) {
        result.warnings.push('Lost deal should have 0% probability')
      }

    } catch (error) {
      result.isValid = false
      result.errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return result
  }

  /**
   * Validate company data integrity
   */
  static async validateCompany(companyId: string): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      isValid: true,
      errors: [],
      warnings: [],
      checkedAt: new Date(),
      entityType: 'company',
      entityId: companyId
    }

    try {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        include: {
          contacts: true,
          deals: true
        }
      })

      if (!company) {
        result.isValid = false
        result.errors.push('Company not found')
        return result
      }

      // Check domain format if provided
      if (company.domain) {
        const domainRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/
        if (!domainRegex.test(company.domain)) {
          result.warnings.push('Invalid domain format')
        }
      }

      // Check for orphaned contacts
      const orphanedContacts = await prisma.contact.count({
        where: {
          companyId: companyId,
          company: null
        }
      })

      if (orphanedContacts > 0) {
        result.warnings.push(`${orphanedContacts} orphaned contacts found`)
      }

      // Check for orphaned deals
      const orphanedDeals = await prisma.deal.count({
        where: {
          companyId: companyId,
          company: null
        }
      })

      if (orphanedDeals > 0) {
        result.warnings.push(`${orphanedDeals} orphaned deals found`)
      }

      // Check organization consistency for related entities
      const contactsWithDifferentOrg = await prisma.contact.count({
        where: {
          companyId: companyId,
          organizationId: {
            not: company.organizationId
          }
        }
      })

      if (contactsWithDifferentOrg > 0) {
        result.isValid = false
        result.errors.push(`${contactsWithDifferentOrg} contacts belong to different organizations`)
      }

    } catch (error) {
      result.isValid = false
      result.errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return result
  }

  /**
   * Run comprehensive integrity check for an organization
   */
  static async validateOrganization(organizationId: string): Promise<IntegrityCheckResult[]> {
    const results: IntegrityCheckResult[] = []

    try {
      // Get all entities for the organization
      const [contacts, companies, deals] = await Promise.all([
        prisma.contact.findMany({ where: { organizationId }, select: { id: true } }),
        prisma.company.findMany({ where: { organizationId }, select: { id: true } }),
        prisma.deal.findMany({ where: { organizationId }, select: { id: true } })
      ])

      // Validate each entity type
      const validationPromises = [
        ...contacts.map(c => this.validateContact(c.id)),
        ...companies.map(c => this.validateCompany(c.id)),
        ...deals.map(d => this.validateDeal(d.id))
      ]

      const validationResults = await Promise.allSettled(validationPromises)
      
      validationResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          results.push({
            isValid: false,
            errors: [`Validation failed: ${result.reason}`],
            warnings: [],
            checkedAt: new Date(),
            entityType: 'unknown',
            entityId: 'unknown'
          })
        }
      })

    } catch (error) {
      results.push({
        isValid: false,
        errors: [`Organization validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        checkedAt: new Date(),
        entityType: 'organization',
        entityId: organizationId
      })
    }

    return results
  }
}

// Cache management utilities
export class CacheManager {
  
  /**
   * Get cached data with integrity validation
   */
  static async getCachedData<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttl?: number,
    validateFunction?: (data: T) => boolean
  ): Promise<T> {
    // Try to get from cache first
    let cachedData = dataCache.get<T>(key)
    
    if (cachedData) {
      // Validate cached data if validator provided
      if (validateFunction && !validateFunction(cachedData)) {
        // Invalid cached data, remove from cache
        dataCache.invalidate(key)
        cachedData = null
      }
    }

    if (!cachedData) {
      // Fetch fresh data
      const freshData = await fetchFunction()
      
      // Validate fresh data
      if (validateFunction && !validateFunction(freshData)) {
        throw new DatabaseError('Retrieved data failed validation')
      }
      
      // Cache the fresh data
      dataCache.set(key, freshData, ttl)
      return freshData
    }

    return cachedData
  }

  /**
   * Invalidate cache for entity and related entities
   */
  static invalidateEntityCache(entityType: string, entityId: string): void {
    // Invalidate direct cache
    dataCache.invalidate(`${entityType}:${entityId}`)
    
    // Invalidate related caches based on entity type
    switch (entityType) {
      case 'contact':
        dataCache.invalidateByPattern(new RegExp(`^(company|deal|activity):.*:contact:${entityId}`))
        dataCache.invalidateByDependency(`contact:${entityId}`)
        break
        
      case 'company':
        dataCache.invalidateByPattern(new RegExp(`^(contact|deal):.*:company:${entityId}`))
        dataCache.invalidateByDependency(`company:${entityId}`)
        break
        
      case 'deal':
        dataCache.invalidateByPattern(new RegExp(`^(contact|company|activity):.*:deal:${entityId}`))
        dataCache.invalidateByDependency(`deal:${entityId}`)
        break
        
      case 'activity':
        dataCache.invalidateByPattern(new RegExp(`^(contact|deal):.*:activity:${entityId}`))
        dataCache.invalidateByDependency(`activity:${entityId}`)
        break
    }
    
    // Invalidate dashboard and analytics caches
    dataCache.invalidateByPattern(new RegExp('^(dashboard|analytics|metrics):'))
  }

  /**
   * Invalidate organization-wide caches
   */
  static invalidateOrganizationCache(organizationId: string): void {
    dataCache.invalidateByPattern(new RegExp(`:${organizationId}($|:)`))
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): {
    size: number
    hitRate?: number
    missRate?: number
  } {
    return {
      size: dataCache.size()
      // TODO: Implement hit/miss tracking for production monitoring
    }
  }
}

// Data retrieval with accuracy checks
export async function getWithAccuracyCheck<T>(
  entityType: string,
  entityId: string,
  fetchFunction: () => Promise<T>,
  validateFunction?: (data: T) => boolean
): Promise<T> {
  const cacheKey = `${entityType}:${entityId}`
  
  return await CacheManager.getCachedData(
    cacheKey,
    fetchFunction,
    undefined, // Use default TTL
    validateFunction
  )
}

// Batch data retrieval with consistency checks
export async function getBatchWithAccuracyCheck<T>(
  entityType: string,
  entityIds: string[],
  fetchFunction: (ids: string[]) => Promise<T[]>,
  validateFunction?: (data: T[]) => boolean
): Promise<T[]> {
  const cacheKey = `${entityType}:batch:${entityIds.sort().join(',')}`
  
  return await CacheManager.getCachedData(
    cacheKey,
    () => fetchFunction(entityIds),
    60000, // 1 minute TTL for batch operations
    validateFunction
  )
}