/**
 * Property-Based Tests for Concurrent Modifications
 * Feature: hubspot-clone, Property 33: Concurrent modification handling
 * Validates: Requirements 7.3
 */

import * as fc from 'fast-check'
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import { prisma } from '@/lib/prisma'
import { 
  OptimisticLockManager, 
  ConflictResolutionStrategy, 
  safeUpdate,
  safeBatchUpdate,
  getWithVersion,
  VersionedEntity
} from '@/lib/concurrency'
import { ConflictError } from '@/lib/errors'

// Test database cleanup
beforeEach(async () => {
  await prisma.activity.deleteMany()
  await prisma.deal.deleteMany()
  await prisma.contact.deleteMany()
  await prisma.company.deleteMany()
  await prisma.user.deleteMany()
})

afterEach(async () => {
  await prisma.activity.deleteMany()
  await prisma.deal.deleteMany()
  await prisma.contact.deleteMany()
  await prisma.company.deleteMany()
  await prisma.user.deleteMany()
})

// Test data generators
const validEntityTypeArb = fc.constantFrom('contact', 'deal', 'company', 'activity')

const validContactDataArb = fc.record({
  firstName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z\s'-]+$/.test(s.trim())),
  lastName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z\s'-]+$/.test(s.trim())),
  email: fc.emailAddress(),
  phone: fc.option(fc.string({ minLength: 10, maxLength: 15 }).filter(s => /^[\d\s\-\+\(\)]+$/.test(s))),
  jobTitle: fc.option(fc.string({ minLength: 2, maxLength: 100 })),
  organizationId: fc.string({ minLength: 8, maxLength: 32 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)),
})

const validCompanyDataArb = fc.record({
  name: fc.string({ minLength: 2, maxLength: 100 }).filter(s => /^[a-zA-Z0-9\s&.,'-]+$/.test(s.trim())),
  domain: fc.option(fc.domain()),
  industry: fc.option(fc.string({ minLength: 2, maxLength: 50 })),
  size: fc.option(fc.constantFrom('1-10', '11-50', '51-200', '201-1000', '1000+')),
  phone: fc.option(fc.string({ minLength: 10, maxLength: 15 }).filter(s => /^[\d\s\-\+\(\)]+$/.test(s))),
  organizationId: fc.string({ minLength: 8, maxLength: 32 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)),
})

const validDealDataArb = fc.record({
  title: fc.string({ minLength: 2, maxLength: 100 }).filter(s => /^[a-zA-Z0-9\s&.,'-]+$/.test(s.trim())),
  amount: fc.option(fc.float({ min: Math.fround(0.01), max: Math.fround(1000000), noNaN: true })),
  stage: fc.constantFrom('lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'),
  probability: fc.integer({ min: 0, max: 100 }),
  organizationId: fc.string({ minLength: 8, maxLength: 32 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)),
})

const validActivityDataArb = fc.record({
  type: fc.constantFrom('call', 'email', 'meeting', 'task', 'note'),
  subject: fc.string({ minLength: 2, maxLength: 100 }).filter(s => s.trim().length >= 2),
  description: fc.option(fc.string({ minLength: 5, maxLength: 500 })),
  dueDate: fc.option(fc.date({ min: new Date(), max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) })),
  completed: fc.boolean(),
  organizationId: fc.string({ minLength: 8, maxLength: 32 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)),
})

// Update data generators
const contactUpdateArb = fc.record({
  firstName: fc.option(fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z\s'-]+$/.test(s.trim()))),
  lastName: fc.option(fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-zA-Z\s'-]+$/.test(s.trim()))),
  phone: fc.option(fc.string({ minLength: 10, maxLength: 15 }).filter(s => /^[\d\s\-\+\(\)]+$/.test(s))),
  jobTitle: fc.option(fc.string({ minLength: 2, maxLength: 100 })),
})

const companyUpdateArb = fc.record({
  name: fc.option(fc.string({ minLength: 2, maxLength: 100 }).filter(s => /^[a-zA-Z0-9\s&.,'-]+$/.test(s.trim()))),
  industry: fc.option(fc.string({ minLength: 2, maxLength: 50 })),
  size: fc.option(fc.constantFrom('1-10', '11-50', '51-200', '201-1000', '1000+')),
})

const dealUpdateArb = fc.record({
  title: fc.option(fc.string({ minLength: 2, maxLength: 100 }).filter(s => /^[a-zA-Z0-9\s&.,'-]+$/.test(s.trim()))),
  amount: fc.option(fc.float({ min: Math.fround(0.01), max: Math.fround(1000000), noNaN: true })),
  stage: fc.option(fc.constantFrom('lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
  probability: fc.option(fc.integer({ min: 0, max: 100 })),
})

const activityUpdateArb = fc.record({
  subject: fc.option(fc.string({ minLength: 2, maxLength: 100 }).filter(s => s.trim().length >= 2)),
  description: fc.option(fc.string({ minLength: 5, maxLength: 500 })),
  completed: fc.option(fc.boolean()),
})

// Helper functions
async function createTestEntity(entityType: string, data: any): Promise<VersionedEntity> {
  const baseData = {
    ...data,
    version: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  switch (entityType) {
    case 'contact':
      return await prisma.contact.create({ data: baseData })
    case 'company':
      return await prisma.company.create({ data: baseData })
    case 'deal':
      // Create a user first for deal ownership
      const user = await prisma.user.create({
        data: {
          email: `test-${Date.now()}@example.com`,
          name: 'Test User',
          organizationId: data.organizationId,
          version: 0,
        }
      })
      return await prisma.deal.create({ 
        data: { 
          ...baseData, 
          ownerId: user.id 
        } 
      })
    case 'activity':
      // Create a user first for activity ownership
      const activityUser = await prisma.user.create({
        data: {
          email: `test-activity-${Date.now()}@example.com`,
          name: 'Test User',
          organizationId: data.organizationId,
          version: 0,
        }
      })
      return await prisma.activity.create({ 
        data: { 
          ...baseData, 
          userId: activityUser.id 
        } 
      })
    default:
      throw new Error(`Unknown entity type: ${entityType}`)
  }
}

async function getEntityUpdateData(entityType: string): Promise<any> {
  switch (entityType) {
    case 'contact':
      return fc.sample(contactUpdateArb, 1)[0]
    case 'company':
      return fc.sample(companyUpdateArb, 1)[0]
    case 'deal':
      return fc.sample(dealUpdateArb, 1)[0]
    case 'activity':
      return fc.sample(activityUpdateArb, 1)[0]
    default:
      throw new Error(`Unknown entity type: ${entityType}`)
  }
}

async function getEntityCreateData(entityType: string): Promise<any> {
  switch (entityType) {
    case 'contact':
      return fc.sample(validContactDataArb, 1)[0]
    case 'company':
      return fc.sample(validCompanyDataArb, 1)[0]
    case 'deal':
      return fc.sample(validDealDataArb, 1)[0]
    case 'activity':
      return fc.sample(validActivityDataArb, 1)[0]
    default:
      throw new Error(`Unknown entity type: ${entityType}`)
  }
}

describe('Concurrent Modification Handling', () => {
  /**
   * Property 33: Concurrent modification handling
   * For any scenario where multiple users modify the same record simultaneously, 
   * the system should prevent data corruption
   */
  test('Property 33: Concurrent modification handling', async () => {
    await fc.assert(
      fc.asyncProperty(
        validEntityTypeArb,
        fc.integer({ min: 2, max: 5 }), // Number of concurrent modifications
        async (entityType, concurrentCount) => {
          // Create test entity
          const createData = await getEntityCreateData(entityType)
          const entity = await createTestEntity(entityType, createData)
          
          // Simulate concurrent modifications
          const updatePromises: Promise<any>[] = []
          const expectedVersion = entity.version
          
          for (let i = 0; i < concurrentCount; i++) {
            const updateData = await getEntityUpdateData(entityType)
            
            // Each concurrent update uses the same expected version
            const updatePromise = safeUpdate(
              entityType,
              entity.id,
              expectedVersion,
              updateData,
              ConflictResolutionStrategy.FAIL
            ).catch(error => {
              // Expect ConflictError for all but one update
              if (error instanceof ConflictError) {
                return { conflict: true, error }
              }
              throw error
            })
            
            updatePromises.push(updatePromise)
          }
          
          // Wait for all updates to complete
          const results = await Promise.all(updatePromises)
          
          // Verify that only one update succeeded
          const successfulUpdates = results.filter(result => 
            result && !result.conflict && !result.error
          )
          const conflictedUpdates = results.filter(result => 
            result && result.conflict
          )
          
          // Exactly one update should succeed, others should conflict
          expect(successfulUpdates.length).toBe(1)
          expect(conflictedUpdates.length).toBe(concurrentCount - 1)
          
          // Verify the entity was updated exactly once
          const finalEntity = await getWithVersion(entityType, entity.id)
          expect(finalEntity).toBeTruthy()
          expect(finalEntity!.version).toBe(expectedVersion + 1)
          
          // Verify data integrity - entity should have valid data
          expect(finalEntity!.id).toBe(entity.id)
          expect(finalEntity!.updatedAt.getTime()).toBeGreaterThan(entity.updatedAt.getTime())
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Optimistic locking with RETRY strategy eventually succeeds', async () => {
    await fc.assert(
      fc.asyncProperty(
        validEntityTypeArb,
        async (entityType) => {
          // Create test entity
          const createData = await getEntityCreateData(entityType)
          const entity = await createTestEntity(entityType, createData)
          
          // Simulate two concurrent updates with RETRY strategy
          const updateData1 = await getEntityUpdateData(entityType)
          const updateData2 = await getEntityUpdateData(entityType)
          
          const [result1, result2] = await Promise.all([
            safeUpdate(
              entityType,
              entity.id,
              entity.version,
              updateData1,
              ConflictResolutionStrategy.RETRY
            ),
            safeUpdate(
              entityType,
              entity.id,
              entity.version,
              updateData2,
              ConflictResolutionStrategy.RETRY
            )
          ])
          
          // Both updates should eventually succeed with RETRY strategy
          expect(result1).toBeTruthy()
          expect(result2).toBeTruthy()
          
          // Final entity should have version incremented twice
          const finalEntity = await getWithVersion(entityType, entity.id)
          expect(finalEntity!.version).toBe(entity.version + 2)
        }
      ),
      { numRuns: 50 }
    )
  })

  test('Batch updates maintain consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(validEntityTypeArb, { minLength: 2, maxLength: 5 }),
        async (entityTypes) => {
          // Create multiple entities
          const entities: VersionedEntity[] = []
          for (const entityType of entityTypes) {
            const createData = await getEntityCreateData(entityType)
            const entity = await createTestEntity(entityType, createData)
            entities.push(entity)
          }
          
          // Prepare batch updates
          const batchUpdates = []
          for (let i = 0; i < entities.length; i++) {
            const entity = entities[i]
            const entityType = entityTypes[i]
            const updateData = await getEntityUpdateData(entityType)
            
            batchUpdates.push({
              entityType,
              id: entity.id,
              expectedVersion: entity.version,
              updateData
            })
          }
          
          // Execute batch update with FAIL strategy
          const results = await safeBatchUpdate(
            batchUpdates,
            ConflictResolutionStrategy.FAIL
          )
          
          // All updates should succeed in batch
          expect(results.length).toBe(entities.length)
          results.forEach(result => {
            expect(result.success).toBe(true)
            expect(result.data).toBeTruthy()
          })
          
          // Verify all entities were updated
          for (let i = 0; i < entities.length; i++) {
            const entity = entities[i]
            const entityType = entityTypes[i]
            const updatedEntity = await getWithVersion(entityType, entity.id)
            
            expect(updatedEntity!.version).toBe(entity.version + 1)
          }
        }
      ),
      { numRuns: 30 }
    )
  })

  test('Version conflicts are properly detected and reported', async () => {
    await fc.assert(
      fc.asyncProperty(
        validEntityTypeArb,
        fc.integer({ min: 1, max: 5 }), // Version offset
        async (entityType, versionOffset) => {
          // Create test entity
          const createData = await getEntityCreateData(entityType)
          const entity = await createTestEntity(entityType, createData)
          
          // Try to update with wrong version
          const updateData = await getEntityUpdateData(entityType)
          const wrongVersion = entity.version + versionOffset
          
          // Should throw ConflictError
          await expect(
            safeUpdate(
              entityType,
              entity.id,
              wrongVersion,
              updateData,
              ConflictResolutionStrategy.FAIL
            )
          ).rejects.toThrow(ConflictError)
          
          // Entity should remain unchanged
          const unchangedEntity = await getWithVersion(entityType, entity.id)
          expect(unchangedEntity!.version).toBe(entity.version)
          expect(unchangedEntity!.updatedAt.getTime()).toBe(entity.updatedAt.getTime())
        }
      ),
      { numRuns: 50 }
    )
  })

  test('OVERWRITE strategy ignores version conflicts', async () => {
    await fc.assert(
      fc.asyncProperty(
        validEntityTypeArb,
        fc.integer({ min: 1, max: 5 }), // Version offset
        async (entityType, versionOffset) => {
          // Create test entity
          const createData = await getEntityCreateData(entityType)
          const entity = await createTestEntity(entityType, createData)
          
          // Update with wrong version using OVERWRITE strategy
          const updateData = await getEntityUpdateData(entityType)
          const wrongVersion = entity.version + versionOffset
          
          const result = await safeUpdate(
            entityType,
            entity.id,
            wrongVersion,
            updateData,
            ConflictResolutionStrategy.OVERWRITE
          )
          
          // Update should succeed despite version mismatch
          expect(result).toBeTruthy()
          expect(result.version).toBe(entity.version + 1)
          
          // Entity should be updated
          const updatedEntity = await getWithVersion(entityType, entity.id)
          expect(updatedEntity!.version).toBe(entity.version + 1)
          expect(updatedEntity!.updatedAt.getTime()).toBeGreaterThan(entity.updatedAt.getTime())
        }
      ),
      { numRuns: 50 }
    )
  })
})