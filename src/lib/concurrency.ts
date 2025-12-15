/**
 * Concurrent Modification Handling System
 * Implements optimistic locking and conflict resolution for data updates
 */

import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { ConflictError, DatabaseError } from "@/lib/errors"

// Version tracking interface for optimistic locking
export interface VersionedEntity {
  id: string
  version: number
  updatedAt: Date
}

// Conflict resolution strategies
export enum ConflictResolutionStrategy {
  FAIL = "FAIL",                    // Fail the operation and return error
  OVERWRITE = "OVERWRITE",          // Overwrite with new data (last write wins)
  MERGE = "MERGE",                  // Attempt to merge changes
  RETRY = "RETRY"                   // Retry the operation with fresh data
}

// Conflict information
export interface ConflictInfo {
  entityType: string
  entityId: string
  expectedVersion: number
  actualVersion: number
  conflictingFields?: string[]
}

// Update operation result
export interface UpdateResult<T> {
  success: boolean
  data?: T
  conflict?: ConflictInfo
  retryCount?: number
}

// Optimistic lock manager
export class OptimisticLockManager {
  private static readonly MAX_RETRIES = 3
  private static readonly RETRY_DELAY_MS = 100

  /**
   * Perform an optimistic update with version checking
   */
  static async updateWithVersion<T extends VersionedEntity>(
    entityType: string,
    id: string,
    expectedVersion: number,
    updateData: Partial<T>,
    strategy: ConflictResolutionStrategy = ConflictResolutionStrategy.FAIL
  ): Promise<UpdateResult<T>> {
    let retryCount = 0

    while (retryCount <= this.MAX_RETRIES) {
      try {
        // Get current entity with version
        const currentEntity = await this.getCurrentEntity<T>(entityType, id)
        
        if (!currentEntity) {
          throw new DatabaseError(`${entityType} with id ${id} not found`)
        }

        // Check for version conflict
        if (currentEntity.version !== expectedVersion) {
          const conflict: ConflictInfo = {
            entityType,
            entityId: id,
            expectedVersion,
            actualVersion: currentEntity.version
          }

          // Handle conflict based on strategy
          switch (strategy) {
            case ConflictResolutionStrategy.FAIL:
              return {
                success: false,
                conflict,
                retryCount
              }

            case ConflictResolutionStrategy.OVERWRITE:
              // Continue with update, ignoring version conflict
              break

            case ConflictResolutionStrategy.RETRY:
              if (retryCount < this.MAX_RETRIES) {
                retryCount++
                await this.delay(this.RETRY_DELAY_MS * retryCount)
                expectedVersion = currentEntity.version // Use current version
                continue
              } else {
                return {
                  success: false,
                  conflict,
                  retryCount
                }
              }

            case ConflictResolutionStrategy.MERGE:
              // Attempt to merge changes (implementation depends on entity type)
              const mergedData = await this.mergeChanges(
                currentEntity,
                updateData,
                entityType
              )
              updateData = mergedData
              break
          }
        }

        // Perform the update with version increment
        const updatedEntity = await this.performVersionedUpdate<T>(
          entityType,
          id,
          expectedVersion,
          updateData
        )

        return {
          success: true,
          data: updatedEntity,
          retryCount
        }

      } catch (error) {
        if (this.isVersionConflictError(error)) {
          // Version conflict occurred during update
          if (strategy === ConflictResolutionStrategy.RETRY && retryCount < this.MAX_RETRIES) {
            retryCount++
            await this.delay(this.RETRY_DELAY_MS * retryCount)
            continue
          } else {
            throw new ConflictError(
              `Concurrent modification detected for ${entityType} ${id}`,
              { retryCount, entityType, entityId: id }
            )
          }
        }
        throw error
      }
    }

    throw new ConflictError(
      `Failed to update ${entityType} ${id} after ${this.MAX_RETRIES} retries`
    )
  }

  /**
   * Get current entity with version information
   */
  private static async getCurrentEntity<T extends VersionedEntity>(
    entityType: string,
    id: string
  ): Promise<T | null> {
    switch (entityType) {
      case 'contact':
        return await prisma.contact.findUnique({ where: { id } }) as T | null
      case 'deal':
        return await prisma.deal.findUnique({ where: { id } }) as T | null
      case 'company':
        return await prisma.company.findUnique({ where: { id } }) as T | null
      case 'activity':
        return await prisma.activity.findUnique({ where: { id } }) as T | null
      case 'user':
        return await prisma.user.findUnique({ where: { id } }) as T | null
      default:
        throw new Error(`Unknown entity type: ${entityType}`)
    }
  }

  /**
   * Perform versioned update using database transaction
   */
  private static async performVersionedUpdate<T extends VersionedEntity>(
    entityType: string,
    id: string,
    expectedVersion: number,
    updateData: Partial<T>
  ): Promise<T> {
    // Use transaction to ensure atomicity
    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let current: any
      let updated: any

      switch (entityType) {
        case 'contact':
          current = await tx.contact.findUnique({ where: { id } })
          if (!current || current.version !== expectedVersion) {
            throw new ConflictError(`Version conflict for ${entityType} ${id}`)
          }
          updated = await tx.contact.update({
            where: { id },
            data: {
              ...(updateData as any),
              version: expectedVersion + 1,
              updatedAt: new Date()
            }
          })
          break

        case 'deal':
          current = await tx.deal.findUnique({ where: { id } })
          if (!current || current.version !== expectedVersion) {
            throw new ConflictError(`Version conflict for ${entityType} ${id}`)
          }
          updated = await tx.deal.update({
            where: { id },
            data: {
              ...(updateData as any),
              version: expectedVersion + 1,
              updatedAt: new Date()
            }
          })
          break

        case 'company':
          current = await tx.company.findUnique({ where: { id } })
          if (!current || current.version !== expectedVersion) {
            throw new ConflictError(`Version conflict for ${entityType} ${id}`)
          }
          updated = await tx.company.update({
            where: { id },
            data: {
              ...(updateData as any),
              version: expectedVersion + 1,
              updatedAt: new Date()
            }
          })
          break

        case 'activity':
          current = await tx.activity.findUnique({ where: { id } })
          if (!current || current.version !== expectedVersion) {
            throw new ConflictError(`Version conflict for ${entityType} ${id}`)
          }
          updated = await tx.activity.update({
            where: { id },
            data: {
              ...(updateData as any),
              version: expectedVersion + 1,
              updatedAt: new Date()
            }
          })
          break

        case 'user':
          current = await tx.user.findUnique({ where: { id } })
          if (!current || current.version !== expectedVersion) {
            throw new ConflictError(`Version conflict for ${entityType} ${id}`)
          }
          updated = await tx.user.update({
            where: { id },
            data: {
              ...(updateData as any),
              version: expectedVersion + 1,
              updatedAt: new Date()
            }
          })
          break

        default:
          throw new Error(`Unknown entity type: ${entityType}`)
      }

      return updated as T
    })
  }

  /**
   * Merge changes for conflict resolution
   */
  private static async mergeChanges<T>(
    currentEntity: T,
    updateData: Partial<T>,
    entityType: string
  ): Promise<Partial<T>> {
    // Basic merge strategy - can be enhanced per entity type
    const merged = { ...updateData }

    // Entity-specific merge logic
    switch (entityType) {
      case 'contact':
        return this.mergeContactChanges(currentEntity as any, updateData as any)
      case 'deal':
        return this.mergeDealChanges(currentEntity as any, updateData as any)
      case 'company':
        return this.mergeCompanyChanges(currentEntity as any, updateData as any)
      default:
        // Default merge: prefer update data over current data
        return merged
    }
  }

  /**
   * Contact-specific merge logic
   */
  private static mergeContactChanges(
    current: any,
    update: any
  ): Partial<any> {
    const merged = { ...update }

    // Preserve important fields if not explicitly updated
    if (!update.email && current.email) {
      merged.email = current.email
    }

    // Merge custom fields if they exist
    if (current.customFields && update.customFields) {
      merged.customFields = {
        ...current.customFields,
        ...update.customFields
      }
    }

    return merged
  }

  /**
   * Deal-specific merge logic
   */
  private static mergeDealChanges(
    current: any,
    update: any
  ): Partial<any> {
    const merged = { ...update }

    // Don't allow stage to go backwards unless explicitly set
    if (update.stage && current.stage) {
      const stageOrder = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']
      const currentIndex = stageOrder.indexOf(current.stage)
      const updateIndex = stageOrder.indexOf(update.stage)
      
      if (updateIndex < currentIndex && !update.forceStageChange) {
        merged.stage = current.stage // Keep current stage
      }
    }

    // Preserve deal history
    if (current.stageHistory && !update.stageHistory) {
      merged.stageHistory = current.stageHistory
    }

    return merged
  }

  /**
   * Company-specific merge logic
   */
  private static mergeCompanyChanges(
    current: any,
    update: any
  ): Partial<any> {
    const merged = { ...update }

    // Preserve domain if not updated
    if (!update.domain && current.domain) {
      merged.domain = current.domain
    }

    return merged
  }

  /**
   * Get Prisma model for entity type
   */
  private static getModelForEntityType(entityType: string) {
    switch (entityType) {
      case 'contact':
        return prisma.contact
      case 'deal':
        return prisma.deal
      case 'company':
        return prisma.company
      case 'activity':
        return prisma.activity
      default:
        throw new Error(`Unknown entity type: ${entityType}`)
    }
  }

  /**
   * Check if error is a version conflict error
   */
  private static isVersionConflictError(error: any): boolean {
    return error instanceof ConflictError ||
           (error.code === 'P2025') || // Prisma record not found
           (error.message && error.message.includes('version conflict'))
  }

  /**
   * Delay utility for retries
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Utility functions for common operations

/**
 * Safe update wrapper that handles concurrent modifications
 */
export async function safeUpdate<T extends VersionedEntity>(
  entityType: string,
  id: string,
  expectedVersion: number,
  updateData: Partial<T>,
  strategy: ConflictResolutionStrategy = ConflictResolutionStrategy.RETRY
): Promise<T> {
  const result = await OptimisticLockManager.updateWithVersion(
    entityType,
    id,
    expectedVersion,
    updateData,
    strategy
  )

  if (!result.success) {
    if (result.conflict) {
      throw new ConflictError(
        `Concurrent modification detected: expected version ${result.conflict.expectedVersion}, got ${result.conflict.actualVersion}`,
        result.conflict
      )
    }
    throw new DatabaseError("Update failed")
  }

  return result.data!
}

/**
 * Batch update with conflict detection
 */
export async function safeBatchUpdate<T extends VersionedEntity>(
  updates: Array<{
    entityType: string
    id: string
    expectedVersion: number
    updateData: Partial<T>
  }>,
  strategy: ConflictResolutionStrategy = ConflictResolutionStrategy.FAIL
): Promise<Array<UpdateResult<T>>> {
  const results: Array<UpdateResult<T>> = []

  // Process updates in transaction if all use FAIL strategy
  if (strategy === ConflictResolutionStrategy.FAIL) {
    try {
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        for (const update of updates) {
          const result = await OptimisticLockManager.updateWithVersion(
            update.entityType,
            update.id,
            update.expectedVersion,
            update.updateData,
            strategy
          )
          
          if (!result.success) {
            throw new ConflictError("Batch update conflict", result.conflict)
          }
          
          results.push(result)
        }
      })
    } catch (error) {
      throw error
    }
  } else {
    // Process updates individually for other strategies
    for (const update of updates) {
      const result = await OptimisticLockManager.updateWithVersion(
        update.entityType,
        update.id,
        update.expectedVersion,
        update.updateData,
        strategy
      )
      results.push(result)
    }
  }

  return results
}

/**
 * Lock-free read with version information
 */
export async function getWithVersion<T extends VersionedEntity>(
  entityType: string,
  id: string
): Promise<T | null> {
  switch (entityType) {
    case 'contact':
      return await prisma.contact.findUnique({ where: { id } }) as T | null
    case 'deal':
      return await prisma.deal.findUnique({ where: { id } }) as T | null
    case 'company':
      return await prisma.company.findUnique({ where: { id } }) as T | null
    case 'activity':
      return await prisma.activity.findUnique({ where: { id } }) as T | null
    case 'user':
      return await prisma.user.findUnique({ where: { id } }) as T | null
    default:
      throw new Error(`Unknown entity type: ${entityType}`)
  }
}