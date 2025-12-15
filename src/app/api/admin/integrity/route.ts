/**
 * Data Integrity Check API Endpoint
 * Provides endpoints for validating data consistency and cache management
 */

import { NextRequest } from "next/server"
import { 
  withErrorHandler, 
  requireAuth, 
  requireRole,
  createSuccessResponse 
} from "@/lib/api-error-handler"
import { 
  DataIntegrityValidator, 
  CacheManager 
} from "@/lib/data-integrity"

// GET /api/admin/integrity - Get integrity check results
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { userId, organizationId, role } = await requireAuth(request)
  
  // Require admin role for integrity checks
  requireRole(role, 'admin')
  
  const { searchParams } = new URL(request.url)
  const entityType = searchParams.get('entityType')
  const entityId = searchParams.get('entityId')
  const checkOrganization = searchParams.get('organization') === 'true'

  let results

  if (checkOrganization) {
    // Run organization-wide integrity check
    results = await DataIntegrityValidator.validateOrganization(organizationId)
  } else if (entityType && entityId) {
    // Check specific entity
    switch (entityType) {
      case 'contact':
        results = [await DataIntegrityValidator.validateContact(entityId)]
        break
      case 'deal':
        results = [await DataIntegrityValidator.validateDeal(entityId)]
        break
      case 'company':
        results = [await DataIntegrityValidator.validateCompany(entityId)]
        break
      default:
        throw new Error(`Unsupported entity type: ${entityType}`)
    }
  } else {
    // Return cache statistics
    results = {
      cacheStats: CacheManager.getCacheStats(),
      message: 'Specify entityType and entityId for specific checks, or organization=true for full check'
    }
  }

  return createSuccessResponse(results)
})

// POST /api/admin/integrity - Run integrity checks and repairs
export const POST = withErrorHandler(async (request: NextRequest) => {
  const { userId, organizationId, role } = await requireAuth(request)
  
  // Require admin role for integrity operations
  requireRole(role, 'admin')
  
  const body = await request.json()
  const { action, entityType, entityId } = body

  let result

  switch (action) {
    case 'validate':
      if (entityType && entityId) {
        switch (entityType) {
          case 'contact':
            result = await DataIntegrityValidator.validateContact(entityId)
            break
          case 'deal':
            result = await DataIntegrityValidator.validateDeal(entityId)
            break
          case 'company':
            result = await DataIntegrityValidator.validateCompany(entityId)
            break
          default:
            throw new Error(`Unsupported entity type: ${entityType}`)
        }
      } else {
        result = await DataIntegrityValidator.validateOrganization(organizationId)
      }
      break

    case 'invalidate_cache':
      if (entityType && entityId) {
        CacheManager.invalidateEntityCache(entityType, entityId)
        result = { message: `Cache invalidated for ${entityType}:${entityId}` }
      } else {
        CacheManager.invalidateOrganizationCache(organizationId)
        result = { message: `Organization cache invalidated for ${organizationId}` }
      }
      break

    case 'cache_stats':
      result = CacheManager.getCacheStats()
      break

    default:
      throw new Error(`Unsupported action: ${action}`)
  }

  return createSuccessResponse(result, `Integrity ${action} completed successfully`)
})