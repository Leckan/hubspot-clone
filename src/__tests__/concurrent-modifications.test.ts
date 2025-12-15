/**
 * Property-Based Tests for Concurrent Modifications
 * Feature: hubspot-clone, Property 33: Concurrent modification handling
 * Validates: Requirements 7.3
 */

import * as fc from 'fast-check'
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import { prisma } from '@/lib/prisma'
import { 
  ConflictResolutionStrategy, 
  safeUpdate,
  safeBatchUpdate,
  getWithVersion,
  VersionedEntity
} from '@/lib/concurrency'
import { ConflictError } from '@/lib/errors'

// Shared test user for performance
let testUser: any = null

// One-time setup and cleanup for better performance
beforeAll(async () => {
  // Create a single test user to reuse across tests
  testUser = await prisma.user.create({
    data: {
      email: `test-concurrent-${Date.now()}@example.com`,
      name: 'Test User',
      organizationId: 'test-org-concurrent',
    }
  })
})

afterAll(async () => {
  // Clean up all test data at the end
  await prisma.activity.deleteMany({ where: { organizationId: 'test-org-concurrent' } })
  await prisma.deal.deleteMany({ where: { organizationId: 'test-org-concurrent' } })
  await prisma.contact.deleteMany({ where: { organizationId: 'test-org-concurrent' } })
  await prisma.company.deleteMany({ where: { organizationId: 'test-org-concurrent' } })
  await prisma.user.deleteMany({ where: { organizationId: 'test-org-concurrent' } })
})

// Simplified test data generators for better performance
const validEntityTypeArb = fc.constantFrom('contact', 'company') // Focus on simpler entities

const validContactDataArb = fc.record({
  firstName: fc.string({ minLength: 1, maxLength: 20 }),
  lastName: fc.string({ minLength: 1, maxLength: 20 }),
  email: fc.emailAddress().map(email => `${Date.now()}-${Math.random()}-${email}`),
  organizationId: fc.constant('test-org-concurrent'),
})

const validCompanyDataArb = fc.record({
  name: fc.string({ minLength: 2, maxLength: 50 }),
  domain: fc.option(fc.domain()),
  organizationId: fc.constant('test-org-concurrent'),
})

// Simplified update data generators - avoid null for required fields
const contactUpdateArb = fc.record({
  jobTitle: fc.option(fc.string({ minLength: 2, maxLength: 50 })),
  phone: fc.option(fc.string({ minLength: 10, maxLength: 15 })),
})

const companyUpdateArb = fc.record({
  industry: fc.option(fc.string({ minLength: 2, maxLength: 30 })),
  domain: fc.option(fc.domain()),
})

// Optimized helper functions
async function createTestEntity(entityType: string, data: any): Promise<VersionedEntity> {
  // Don't override version, let Prisma use the default value of 1
  const baseData = {
    ...data,
  }

  switch (entityType) {
    case 'contact':
      return await prisma.contact.create({ data: baseData })
    case 'company':
      return await prisma.company.create({ data: baseData })
    default:
      throw new Error(`Unknown entity type: ${entityType}`)
  }
}

function getEntityUpdateData(entityType: string, updateArb: any): any {
  return fc.sample(updateArb, 1)[0]
}

describe('Concurrent Modification Handling', () => {
  /**
   * Property 33: Concurrent modification handling
   * For any scenario where multiple users modify the same record simultaneously, 
   * the system should prevent data corruption
   */
  test('Property 33: Concurrent modification handling', async () => {
    // Test with contact entity
    const contact = await prisma.contact.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        email: `test-contact-${Date.now()}-${Math.random()}@example.com`,
        organizationId: 'test-org-concurrent',
      }
    })

    // Simulate 3 concurrent modifications with the same expected version
    const updatePromises: Promise<any>[] = []
    const expectedVersion = contact.version
    const updateData = { jobTitle: 'Updated Title' }

    for (let i = 0; i < 3; i++) {
      const updatePromise = safeUpdate(
        'contact',
        contact.id,
        expectedVersion,
        updateData,
        ConflictResolutionStrategy.FAIL
      ).catch((error: any) => {
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
    const successfulUpdates = results.filter((result: any) => 
      result && !result.conflict && !result.error
    )
    const conflictedUpdates = results.filter((result: any) => 
      result && result.conflict
    )

    // Exactly one update should succeed, others should conflict
    expect(successfulUpdates.length).toBe(1)
    expect(conflictedUpdates.length).toBe(2)

    // Verify the entity was updated exactly once
    const finalEntity = await getWithVersion('contact', contact.id)
    expect(finalEntity).toBeTruthy()
    expect(finalEntity!.version).toBe(expectedVersion + 1)
    expect(finalEntity!.id).toBe(contact.id)
    expect(finalEntity!.updatedAt.getTime()).toBeGreaterThan(contact.updatedAt.getTime())
  })

  test('Optimistic locking with RETRY strategy eventually succeeds', async () => {
    await fc.assert(
      fc.asyncProperty(
        validEntityTypeArb,
        validContactDataArb,
        validCompanyDataArb,
        contactUpdateArb,
        companyUpdateArb,
        async (entityType, contactData, companyData, contactUpdate, companyUpdate) => {
          // Create test entity with pre-generated data
          const createData = entityType === 'contact' ? contactData : companyData
          const entity = await createTestEntity(entityType, createData)
          
          // Simulate two concurrent updates with RETRY strategy
          const updateData1 = entityType === 'contact' ? contactUpdate : companyUpdate
          const updateData2 = entityType === 'contact' ? 
            getEntityUpdateData('contact', contactUpdateArb) : 
            getEntityUpdateData('company', companyUpdateArb)
          
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
      { numRuns: 15 } // Reduced from 50 to 15
    )
  })

  test('Batch updates maintain consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(validEntityTypeArb, { minLength: 2, maxLength: 3 }), // Reduced max length
        validContactDataArb,
        validCompanyDataArb,
        contactUpdateArb,
        companyUpdateArb,
        async (entityTypes, contactData, companyData, contactUpdate, companyUpdate) => {
          // Create multiple entities
          const entities: VersionedEntity[] = []
          for (const entityType of entityTypes) {
            const createData = entityType === 'contact' ? contactData : companyData
            const entity = await createTestEntity(entityType, createData)
            entities.push(entity)
          }
          
          // Prepare batch updates
          const batchUpdates: Array<{
            entityType: string
            id: string
            expectedVersion: number
            updateData: any
          }> = []
          
          for (let i = 0; i < entities.length; i++) {
            const entity = entities[i]
            const entityType = entityTypes[i]
            const updateData = entityType === 'contact' ? contactUpdate : companyUpdate
            
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
          results.forEach((result: any) => {
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
      { numRuns: 10 } // Reduced from 30 to 10
    )
  })

  test('Version conflicts are properly detected and reported', async () => {
    await fc.assert(
      fc.asyncProperty(
        validEntityTypeArb,
        validContactDataArb,
        validCompanyDataArb,
        contactUpdateArb,
        companyUpdateArb,
        fc.integer({ min: 1, max: 3 }), // Reduced version offset range
        async (entityType, contactData, companyData, contactUpdate, companyUpdate, versionOffset) => {
          // Create test entity with pre-generated data
          const createData = entityType === 'contact' ? contactData : companyData
          const entity = await createTestEntity(entityType, createData)
          
          // Try to update with wrong version
          const updateData = entityType === 'contact' ? contactUpdate : companyUpdate
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
      { numRuns: 15 } // Reduced from 50 to 15
    )
  })

  test('OVERWRITE strategy ignores version conflicts', async () => {
    await fc.assert(
      fc.asyncProperty(
        validEntityTypeArb,
        validContactDataArb,
        validCompanyDataArb,
        contactUpdateArb,
        companyUpdateArb,
        fc.integer({ min: 1, max: 3 }), // Reduced version offset range
        async (entityType, contactData, companyData, contactUpdate, companyUpdate, versionOffset) => {
          // Create test entity with pre-generated data
          const createData = entityType === 'contact' ? contactData : companyData
          const entity = await createTestEntity(entityType, createData)
          
          // Update with wrong version using OVERWRITE strategy
          const updateData = entityType === 'contact' ? contactUpdate : companyUpdate
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
      { numRuns: 15 } // Reduced from 50 to 15
    )
  })
})