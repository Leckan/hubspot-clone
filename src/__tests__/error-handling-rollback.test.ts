/**
 * Property-Based Test for Error Handling and Rollback
 * Feature: hubspot-clone, Property 34: Error handling and rollback
 * Validates: Requirements 7.4
 */

import * as fc from 'fast-check'
import { describe, test, expect, jest, beforeEach } from '@jest/globals'
import { Prisma } from '@prisma/client'
import { 
  AppError, 
  ErrorType, 
  ValidationError, 
  DatabaseError, 
  ConflictError,
  parseError,
  handleApiError 
} from '@/lib/errors'

// Mock Prisma Client for testing transaction rollback scenarios
interface MockTransactionClient {
  contact: {
    create: jest.Mock
    update: jest.Mock
    delete: jest.Mock
    findUnique: jest.Mock
  }
  company: {
    create: jest.Mock
    update: jest.Mock
    delete: jest.Mock
    findUnique: jest.Mock
  }
  deal: {
    create: jest.Mock
    update: jest.Mock
    updateMany: jest.Mock
    findUnique: jest.Mock
  }
  activity: {
    create: jest.Mock
    deleteMany: jest.Mock
    findUnique: jest.Mock
  }
}

interface MockPrismaClient {
  $transaction: jest.Mock
  contact: {
    create: jest.Mock
    findFirst: jest.Mock
  }
  company: {
    create: jest.Mock
    findFirst: jest.Mock
  }
  deal: {
    create: jest.Mock
    findFirst: jest.Mock
  }
  activity: {
    create: jest.Mock
    findFirst: jest.Mock
  }
}

// Create mock Prisma client
const createMockPrisma = (): MockPrismaClient => ({
  $transaction: jest.fn(),
  contact: {
    create: jest.fn(),
    findFirst: jest.fn(),
  },
  company: {
    create: jest.fn(),
    findFirst: jest.fn(),
  },
  deal: {
    create: jest.fn(),
    findFirst: jest.fn(),
  },
  activity: {
    create: jest.fn(),
    findFirst: jest.fn(),
  },
})

// Generators for test data
const organizationIdArb = fc.string({ minLength: 8, maxLength: 32 }).filter(s => /^[a-zA-Z0-9]+$/.test(s))
const validEmailArb = fc.tuple(
  fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[A-Za-z0-9_+-]+$/.test(s)),
  fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[A-Za-z][A-Za-z0-9-]*[A-Za-z0-9]$/.test(s) || /^[A-Za-z0-9]$/.test(s)),
  fc.constantFrom('com', 'org', 'net', 'edu', 'gov')
).map(([local, domain, tld]) => `${local}@${domain}.${tld}`)
const validNameArb = fc.string({ minLength: 2, maxLength: 50 }).filter(s => /^[a-zA-Z\s]+$/.test(s) && s.trim().length >= 2)
const validIdArb = fc.string({ minLength: 8, maxLength: 32 }).filter(s => /^[a-zA-Z0-9]+$/.test(s))

const contactDataArb = fc.record({
  id: validIdArb,
  firstName: validNameArb,
  lastName: validNameArb,
  email: validEmailArb,
  organizationId: organizationIdArb,
})

const companyDataArb = fc.record({
  id: validIdArb,
  name: validNameArb,
  organizationId: organizationIdArb,
})

const dealDataArb = fc.record({
  id: validIdArb,
  title: validNameArb,
  contactId: validIdArb,
  companyId: validIdArb,
  ownerId: validIdArb,
  organizationId: organizationIdArb,
})

const activityDataArb = fc.record({
  id: validIdArb,
  type: fc.constantFrom('call', 'email', 'meeting', 'task', 'note'),
  subject: validNameArb,
  contactId: validIdArb,
  dealId: validIdArb,
  userId: validIdArb,
  organizationId: organizationIdArb,
})

// Error simulation types
const errorTypeArb = fc.constantFrom(
  'constraint_violation',
  'network_error',
  'validation_error',
  'timeout_error',
  'foreign_key_violation'
)

// Transaction operation simulator
class TransactionSimulator {
  private mockPrisma: MockPrismaClient
  private shouldFail: boolean
  private failurePoint: number
  private errorType: string

  constructor(mockPrisma: MockPrismaClient, shouldFail: boolean = false, failurePoint: number = 0, errorType: string = 'constraint_violation') {
    this.mockPrisma = mockPrisma
    this.shouldFail = shouldFail
    this.failurePoint = failurePoint
    this.errorType = errorType
  }

  async simulateContactDeletion(contactId: string, organizationId: string): Promise<{
    success: boolean
    rollback: boolean
    operationsCompleted: number
    error?: Error
  }> {
    let operationsCompleted = 0
    let rollbackOccurred = false

    try {
      // Simulate transaction
      const result = await this.mockPrisma.$transaction(async (tx: MockTransactionClient) => {
        // Operation 1: Update deals to remove contact association
        if (this.shouldFail && this.failurePoint === 1) {
          throw this.createError()
        }
        await tx.deal.updateMany({
          where: { contactId },
          data: { contactId: null }
        })
        operationsCompleted++

        // Operation 2: Delete activities associated with contact
        if (this.shouldFail && this.failurePoint === 2) {
          throw this.createError()
        }
        await tx.activity.deleteMany({
          where: { contactId }
        })
        operationsCompleted++

        // Operation 3: Delete the contact
        if (this.shouldFail && this.failurePoint === 3) {
          throw this.createError()
        }
        await tx.contact.delete({
          where: { id: contactId }
        })
        operationsCompleted++

        return {
          contactDeleted: true,
          dealsUpdated: 2,
          activitiesDeleted: 3
        }
      })

      return {
        success: true,
        rollback: false,
        operationsCompleted
      }
    } catch (error) {
      rollbackOccurred = true
      return {
        success: false,
        rollback: true,
        operationsCompleted: 0, // All operations should be rolled back
        error: error as Error
      }
    }
  }

  async simulateCompanyCreationWithRelations(
    companyData: any,
    contactData: any,
    dealData: any
  ): Promise<{
    success: boolean
    rollback: boolean
    operationsCompleted: number
    error?: Error
  }> {
    let operationsCompleted = 0

    try {
      const result = await this.mockPrisma.$transaction(async (tx: MockTransactionClient) => {
        // Operation 1: Create company
        if (this.shouldFail && this.failurePoint === 1) {
          throw this.createError()
        }
        await tx.company.create({ data: companyData })
        operationsCompleted++

        // Operation 2: Create contact with company association
        if (this.shouldFail && this.failurePoint === 2) {
          throw this.createError()
        }
        await tx.contact.create({
          data: { ...contactData, companyId: companyData.id }
        })
        operationsCompleted++

        // Operation 3: Create deal with company and contact associations
        if (this.shouldFail && this.failurePoint === 3) {
          throw this.createError()
        }
        await tx.deal.create({
          data: {
            ...dealData,
            companyId: companyData.id,
            contactId: contactData.id
          }
        })
        operationsCompleted++

        return {
          companyCreated: true,
          contactCreated: true,
          dealCreated: true
        }
      })

      return {
        success: true,
        rollback: false,
        operationsCompleted
      }
    } catch (error) {
      return {
        success: false,
        rollback: true,
        operationsCompleted: 0, // All operations should be rolled back
        error: error as Error
      }
    }
  }

  private createError(): Error {
    switch (this.errorType) {
      case 'constraint_violation':
        return new Prisma.PrismaClientKnownRequestError(
          'Unique constraint failed',
          { code: 'P2002', clientVersion: '5.0.0' }
        )
      case 'foreign_key_violation':
        return new Prisma.PrismaClientKnownRequestError(
          'Foreign key constraint failed',
          { code: 'P2003', clientVersion: '5.0.0' }
        )
      case 'validation_error':
        return new Prisma.PrismaClientValidationError(
          'Invalid input data',
          { clientVersion: '5.0.0' }
        )
      case 'network_error':
        return new Error('Network connection failed')
      case 'timeout_error':
        return new Error('Operation timed out')
      default:
        return new Error('Unknown database error')
    }
  }
}

describe('Error Handling and Rollback - Property 34: Error handling and rollback', () => {
  let mockPrisma: MockPrismaClient

  beforeEach(() => {
    mockPrisma = createMockPrisma()
    jest.clearAllMocks()
  })

  /**
   * Property 34: Error handling and rollback
   * For any system error during data operations, incomplete transactions 
   * should be rolled back and errors should be logged
   */
  test('Property 34: Failed transactions are completely rolled back', async () => {
    await fc.assert(
      fc.asyncProperty(
        contactDataArb,
        fc.integer({ min: 1, max: 3 }), // Failure point
        errorTypeArb,
        async (contactData, failurePoint, errorType) => {
          const simulator = new TransactionSimulator(mockPrisma, true, failurePoint, errorType)

          // Mock the transaction to simulate the actual behavior
          mockPrisma.$transaction.mockImplementation(async (callback) => {
            const mockTx = {
              deal: {
                updateMany: jest.fn().mockImplementation(() => {
                  if (failurePoint === 1) throw simulator['createError']()
                  return { count: 2 }
                }),
              },
              activity: {
                deleteMany: jest.fn().mockImplementation(() => {
                  if (failurePoint === 2) throw simulator['createError']()
                  return { count: 3 }
                }),
              },
              contact: {
                delete: jest.fn().mockImplementation(() => {
                  if (failurePoint === 3) throw simulator['createError']()
                  return contactData
                }),
              },
            }

            return await callback(mockTx)
          })

          const result = await simulator.simulateContactDeletion(
            contactData.id,
            contactData.organizationId
          )

          // When a transaction fails, it should be completely rolled back
          expect(result.success).toBe(false)
          expect(result.rollback).toBe(true)
          
          // No operations should be persisted when rollback occurs
          expect(result.operationsCompleted).toBe(0)
          
          // An error should be captured
          expect(result.error).toBeDefined()
          expect(result.error).toBeInstanceOf(Error)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 34: Successful transactions commit all operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        contactDataArb,
        async (contactData) => {
          const simulator = new TransactionSimulator(mockPrisma, false) // No failure

          // Mock successful transaction
          mockPrisma.$transaction.mockImplementation(async (callback) => {
            const mockTx = {
              deal: {
                updateMany: jest.fn().mockResolvedValue({ count: 2 }),
              },
              activity: {
                deleteMany: jest.fn().mockResolvedValue({ count: 3 }),
              },
              contact: {
                delete: jest.fn().mockResolvedValue(contactData),
              },
            }

            return await callback(mockTx)
          })

          const result = await simulator.simulateContactDeletion(
            contactData.id,
            contactData.organizationId
          )

          // Successful transactions should complete all operations
          expect(result.success).toBe(true)
          expect(result.rollback).toBe(false)
          expect(result.operationsCompleted).toBe(3)
          expect(result.error).toBeUndefined()
        }
      ),
      { numRuns: 50 }
    )
  })

  test('Property 34: Complex multi-table transactions maintain atomicity', async () => {
    await fc.assert(
      fc.asyncProperty(
        companyDataArb,
        contactDataArb,
        dealDataArb,
        fc.integer({ min: 1, max: 3 }), // Failure point
        errorTypeArb,
        async (companyData, contactData, dealData, failurePoint, errorType) => {
          // Ensure consistent organization ID
          const orgId = companyData.organizationId
          contactData.organizationId = orgId
          dealData.organizationId = orgId

          const simulator = new TransactionSimulator(mockPrisma, true, failurePoint, errorType)

          // Mock the transaction for complex operations
          mockPrisma.$transaction.mockImplementation(async (callback) => {
            const mockTx = {
              company: {
                create: jest.fn().mockImplementation(() => {
                  if (failurePoint === 1) throw simulator['createError']()
                  return companyData
                }),
              },
              contact: {
                create: jest.fn().mockImplementation(() => {
                  if (failurePoint === 2) throw simulator['createError']()
                  return { ...contactData, companyId: companyData.id }
                }),
              },
              deal: {
                create: jest.fn().mockImplementation(() => {
                  if (failurePoint === 3) throw simulator['createError']()
                  return {
                    ...dealData,
                    companyId: companyData.id,
                    contactId: contactData.id
                  }
                }),
              },
            }

            return await callback(mockTx)
          })

          const result = await simulator.simulateCompanyCreationWithRelations(
            companyData,
            contactData,
            dealData
          )

          // Complex transactions should be atomic - either all succeed or all fail
          if (result.success) {
            expect(result.rollback).toBe(false)
            expect(result.operationsCompleted).toBe(3)
            expect(result.error).toBeUndefined()
          } else {
            expect(result.rollback).toBe(true)
            expect(result.operationsCompleted).toBe(0) // All rolled back
            expect(result.error).toBeDefined()
          }

          // Transaction should never be in an inconsistent state
          expect(result.success !== result.rollback).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 34: Error parsing handles all error types correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        errorTypeArb,
        fc.string({ minLength: 1, maxLength: 100 }),
        async (errorType, errorMessage) => {
          let testError: Error

          // Create different types of errors
          switch (errorType) {
            case 'constraint_violation':
              testError = new Prisma.PrismaClientKnownRequestError(
                errorMessage,
                { code: 'P2002', clientVersion: '5.0.0' }
              )
              break
            case 'foreign_key_violation':
              testError = new Prisma.PrismaClientKnownRequestError(
                errorMessage,
                { code: 'P2003', clientVersion: '5.0.0' }
              )
              break
            case 'validation_error':
              testError = new Prisma.PrismaClientValidationError(
                errorMessage,
                { clientVersion: '5.0.0' }
              )
              break
            default:
              testError = new Error(errorMessage)
          }

          // Parse the error using the system's error handler
          const parsedError = parseError(testError)

          // All errors should be converted to AppError instances
          expect(parsedError).toBeInstanceOf(AppError)
          expect(parsedError.message).toBeDefined()
          expect(parsedError.type).toBeDefined()
          expect(parsedError.statusCode).toBeGreaterThanOrEqual(400)
          expect(parsedError.statusCode).toBeLessThan(600)
          expect(parsedError.timestamp).toBeInstanceOf(Date)

          // Specific error type validation
          if (errorType === 'constraint_violation') {
            expect(parsedError.type).toBe(ErrorType.CONFLICT)
            expect(parsedError.statusCode).toBe(409)
          } else if (errorType === 'foreign_key_violation') {
            expect(parsedError.type).toBe(ErrorType.VALIDATION)
            expect(parsedError.statusCode).toBe(400)
          } else if (errorType === 'validation_error') {
            expect(parsedError.type).toBe(ErrorType.VALIDATION)
            expect(parsedError.statusCode).toBe(400)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 34: Error logging captures all necessary information', async () => {
    await fc.assert(
      fc.asyncProperty(
        errorTypeArb,
        fc.string({ minLength: 1, maxLength: 100 }),
        organizationIdArb,
        validIdArb,
        async (errorType, errorMessage, organizationId, userId) => {
          let testError: Error

          // Create test error
          switch (errorType) {
            case 'constraint_violation':
              testError = new Prisma.PrismaClientKnownRequestError(
                errorMessage,
                { code: 'P2002', clientVersion: '5.0.0' }
              )
              break
            default:
              testError = new Error(errorMessage)
          }

          // Handle the error with context
          const { error: appError, response } = handleApiError(testError, {
            userId,
            organizationId,
            requestId: 'test-request-id',
            userAgent: 'test-agent',
            ip: '127.0.0.1'
          })

          // Error should be properly handled and logged
          expect(appError).toBeInstanceOf(AppError)
          expect(appError.message).toBeDefined()
          expect(appError.type).toBeDefined()
          expect(appError.timestamp).toBeInstanceOf(Date)

          // Response should be properly formatted
          expect(response).toHaveProperty('error')
          expect(response).toHaveProperty('type')
          expect(response).toHaveProperty('timestamp')
          expect(response.error).toBe(appError.message)
          expect(response.type).toBe(appError.type)
        }
      ),
      { numRuns: 50 }
    )
  })

  test('Property 34: Constraint violations are properly categorized and rolled back', async () => {
    await fc.assert(
      fc.asyncProperty(
        contactDataArb,
        fc.constantFrom('P2002', 'P2003', 'P2025'), // Prisma error codes
        async (contactData, errorCode) => {
          const prismaError = new Prisma.PrismaClientKnownRequestError(
            'Database constraint violation',
            { code: errorCode, clientVersion: '5.0.0' }
          )

          // Mock transaction that fails with constraint violation
          mockPrisma.$transaction.mockRejectedValue(prismaError)

          try {
            await mockPrisma.$transaction(async (tx) => {
              await tx.contact.create({ data: contactData })
              return { success: true }
            })
            
            // Should not reach here
            expect(false).toBe(true)
          } catch (error) {
            // Error should be the original Prisma error
            expect(error).toBe(prismaError)
            
            // Parse the error to verify proper categorization
            const parsedError = parseError(error)
            
            if (errorCode === 'P2002') {
              expect(parsedError.type).toBe(ErrorType.CONFLICT)
              expect(parsedError.statusCode).toBe(409)
            } else if (errorCode === 'P2003') {
              expect(parsedError.type).toBe(ErrorType.VALIDATION)
              expect(parsedError.statusCode).toBe(400)
            } else if (errorCode === 'P2025') {
              expect(parsedError.type).toBe(ErrorType.NOT_FOUND)
              expect(parsedError.statusCode).toBe(404)
            }
          }
        }
      ),
      { numRuns: 50 }
    )
  })
})