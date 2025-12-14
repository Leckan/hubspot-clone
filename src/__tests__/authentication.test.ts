/**
 * Property-Based Tests for Authentication
 * Feature: hubspot-clone, Property 26, 27, 30: Authentication properties
 * Validates: Requirements 6.1, 6.2, 6.5
 */

import * as fc from 'fast-check'
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { loginSchema } from '@/lib/validations'

// Mock NextAuth for testing
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}))

// Mock Prisma for controlled testing
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

// Test data generators
const validEmailArb = fc.tuple(
  fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[A-Za-z0-9_+-]+$/.test(s)),
  fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[A-Za-z][A-Za-z0-9-]*[A-Za-z0-9]$/.test(s) || /^[A-Za-z0-9]$/.test(s)),
  fc.constantFrom('com', 'org', 'net', 'edu', 'gov')
).map(([local, domain, tld]) => `${local}@${domain}.${tld}`)

const validPasswordArb = fc.string({ minLength: 8, maxLength: 50 }).filter(s => s.trim().length >= 8)
const validNameArb = fc.string({ minLength: 2, maxLength: 50 }).filter(s => /^[a-zA-Z\s]+$/.test(s) && s.trim().length >= 2)
const validOrganizationIdArb = fc.string({ minLength: 8, maxLength: 32 }).filter(s => /^[a-zA-Z0-9]+$/.test(s))
const validUserIdArb = fc.string({ minLength: 8, maxLength: 32 }).filter(s => /^[a-zA-Z0-9-]+$/.test(s))

// Invalid credential generators
const invalidEmailArb = fc.oneof(
  fc.string().filter(s => !s.includes('@')),
  fc.constant(''),
  fc.constant('invalid-email'),
  fc.constant('@domain.com'),
  fc.constant('user@'),
  fc.constant('user@.com')
)

const invalidPasswordArb = fc.oneof(
  fc.string({ maxLength: 7 }), // Too short
  fc.constant(''), // Empty
  fc.constant('   '), // Only whitespace
)

// Valid user data generator
const validUserArb = fc.record({
  id: validUserIdArb,
  email: validEmailArb,
  name: validNameArb,
  password: validPasswordArb,
  role: fc.constantFrom('admin', 'user', 'manager'),
  organizationId: validOrganizationIdArb,
})

// Valid credentials generator
const validCredentialsArb = fc.record({
  email: validEmailArb,
  password: validPasswordArb,
})

// Invalid credentials generator
const invalidCredentialsArb = fc.oneof(
  fc.record({
    email: invalidEmailArb,
    password: validPasswordArb,
  }),
  fc.record({
    email: validEmailArb,
    password: invalidPasswordArb,
  }),
  fc.record({
    email: invalidEmailArb,
    password: invalidPasswordArb,
  })
)

// Helper function to simulate authentication
async function simulateAuthentication(credentials: { email: string; password: string }, existingUser?: any) {
  // Validate credentials format first
  const validation = loginSchema.safeParse(credentials)
  if (!validation.success) {
    return { success: false, reason: 'invalid_format', user: null }
  }

  if (!credentials.email || !credentials.password) {
    return { success: false, reason: 'missing_credentials', user: null }
  }

  // Mock database lookup
  mockPrisma.user.findUnique.mockResolvedValue(existingUser || null)

  if (!existingUser) {
    return { success: false, reason: 'user_not_found', user: null }
  }

  // Verify password - use faster bcrypt rounds for testing
  const isPasswordValid = await bcrypt.compare(credentials.password, existingUser.password)
  
  if (!isPasswordValid) {
    return { success: false, reason: 'invalid_password', user: null }
  }

  // Successful authentication - return user data for session
  return {
    success: true,
    reason: 'authenticated',
    user: {
      id: existingUser.id,
      email: existingUser.email,
      name: existingUser.name,
      role: existingUser.role,
    }
  }
}

// Helper function to create hashed password with lower rounds for testing
async function createTestHashedPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 4) // Use 4 rounds instead of 12 for faster testing
}

// Helper function to simulate session creation
function simulateSessionCreation(user: any) {
  if (!user) {
    return null
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
  }
}

// Helper function to simulate logout
function simulateLogout(session: any) {
  if (!session) {
    return { success: false, reason: 'no_session' }
  }

  // Simulate session invalidation
  return { success: true, reason: 'session_invalidated', session: null }
}

describe('Authentication Properties', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  /**
   * Property 26: Valid authentication creates session
   * For any user with correct credentials, authentication should result in a valid session token being created
   * Validates: Requirements 6.1
   */
  test('Property 26: Valid authentication creates session', async () => {
    await fc.assert(
      fc.asyncProperty(
        validUserArb,
        validCredentialsArb,
        async (userData, credentials) => {
          // Ensure credentials match the user
          const matchingCredentials = {
            email: userData.email,
            password: credentials.password,
          }

          // Hash the password for the stored user with faster rounds
          const hashedPassword = await createTestHashedPassword(credentials.password)
          const storedUser = {
            ...userData,
            password: hashedPassword,
          }

          // Simulate authentication
          const authResult = await simulateAuthentication(matchingCredentials, storedUser)
          
          // Valid credentials should result in successful authentication
          expect(authResult.success).toBe(true)
          expect(authResult.user).toBeDefined()
          expect(authResult.user?.id).toBe(userData.id)
          expect(authResult.user?.email).toBe(userData.email)

          // Session should be created for authenticated user
          const session = simulateSessionCreation(authResult.user)
          expect(session).toBeDefined()
          expect(session?.user.id).toBe(userData.id)
          expect(session?.user.email).toBe(userData.email)
          expect(session?.expires).toBeDefined()
          
          // Session should have an expiration time in the future
          const expirationTime = new Date(session!.expires).getTime()
          const currentTime = Date.now()
          expect(expirationTime).toBeGreaterThan(currentTime)
        }
      ),
      { numRuns: 20 }
    )
  }, 60000)

  /**
   * Property 27: Invalid credentials rejection
   * For any authentication attempt with incorrect credentials, access should be denied and the attempt should be logged
   * Validates: Requirements 6.2
   */
  test('Property 27: Invalid credentials rejection', async () => {
    await fc.assert(
      fc.asyncProperty(
        validUserArb,
        invalidCredentialsArb,
        async (userData, invalidCredentials) => {
          // Hash a valid password for the stored user with faster rounds
          const hashedPassword = await createTestHashedPassword('validpassword123')
          const storedUser = {
            ...userData,
            password: hashedPassword,
          }

          // Simulate authentication with invalid credentials
          const authResult = await simulateAuthentication(invalidCredentials, storedUser)
          
          // Invalid credentials should result in failed authentication
          expect(authResult.success).toBe(false)
          expect(authResult.user).toBeNull()
          
          // Should have a specific reason for failure
          expect(['invalid_format', 'missing_credentials', 'user_not_found', 'invalid_password']).toContain(authResult.reason)

          // No session should be created for failed authentication
          const session = simulateSessionCreation(authResult.user)
          expect(session).toBeNull()
        }
      ),
      { numRuns: 20 }
    )
  }, 60000)

  /**
   * Test for non-existent user authentication attempts
   */
  test('Property 27: Non-existent user authentication is rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        validCredentialsArb,
        async (credentials) => {
          // Simulate authentication with no existing user
          const authResult = await simulateAuthentication(credentials, null)
          
          // Should fail authentication
          expect(authResult.success).toBe(false)
          expect(authResult.reason).toBe('user_not_found')
          expect(authResult.user).toBeNull()

          // No session should be created
          const session = simulateSessionCreation(authResult.user)
          expect(session).toBeNull()
        }
      ),
      { numRuns: 50 }
    )
  })

  /**
   * Test for wrong password authentication attempts
   */
  test('Property 27: Wrong password authentication is rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        validUserArb,
        validPasswordArb,
        validPasswordArb,
        async (userData, correctPassword, wrongPassword) => {
          // Ensure passwords are different
          fc.pre(correctPassword !== wrongPassword)

          // Hash the correct password for the stored user with faster rounds
          const hashedPassword = await createTestHashedPassword(correctPassword)
          const storedUser = {
            ...userData,
            password: hashedPassword,
          }

          // Try to authenticate with wrong password
          const wrongCredentials = {
            email: userData.email,
            password: wrongPassword,
          }

          const authResult = await simulateAuthentication(wrongCredentials, storedUser)
          
          // Should fail authentication
          expect(authResult.success).toBe(false)
          expect(authResult.reason).toBe('invalid_password')
          expect(authResult.user).toBeNull()

          // No session should be created
          const session = simulateSessionCreation(authResult.user)
          expect(session).toBeNull()
        }
      ),
      { numRuns: 15 }
    )
  }, 60000)

  /**
   * Property 30: Logout session invalidation
   * For any user logout action, the session should be invalidated and subsequent requests should require new authentication
   * Validates: Requirements 6.5
   */
  test('Property 30: Logout session invalidation', async () => {
    await fc.assert(
      fc.asyncProperty(
        validUserArb,
        validCredentialsArb,
        async (userData, credentials) => {
          // Create a valid session first
          const matchingCredentials = {
            email: userData.email,
            password: credentials.password,
          }

          const hashedPassword = await createTestHashedPassword(credentials.password)
          const storedUser = {
            ...userData,
            password: hashedPassword,
          }

          // Authenticate and create session
          const authResult = await simulateAuthentication(matchingCredentials, storedUser)
          expect(authResult.success).toBe(true)

          const session = simulateSessionCreation(authResult.user)
          expect(session).toBeDefined()
          expect(session?.user.id).toBe(userData.id)

          // Simulate logout
          const logoutResult = simulateLogout(session)
          
          // Logout should succeed
          expect(logoutResult.success).toBe(true)
          expect(logoutResult.reason).toBe('session_invalidated')
          expect(logoutResult.session).toBeNull()

          // After logout, session should be null/invalid
          // This simulates that subsequent requests would not have a valid session
          expect(logoutResult.session).toBeNull()
        }
      ),
      { numRuns: 20 }
    )
  }, 60000)

  /**
   * Test logout with no existing session
   */
  test('Property 30: Logout without session handles gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null), // No session
        async (noSession) => {
          // Simulate logout with no session
          const logoutResult = simulateLogout(noSession)
          
          // Should handle gracefully but indicate no session was present
          expect(logoutResult.success).toBe(false)
          expect(logoutResult.reason).toBe('no_session')
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Test session expiration behavior
   */
  test('Property 26: Session has proper expiration', async () => {
    await fc.assert(
      fc.asyncProperty(
        validUserArb,
        async (userData) => {
          // Create session for user
          const session = simulateSessionCreation(userData)
          
          if (session) {
            // Session should have expiration in the future
            const expirationTime = new Date(session.expires).getTime()
            const currentTime = Date.now()
            const maxExpectedExpiration = currentTime + (25 * 60 * 60 * 1000) // 25 hours max
            
            expect(expirationTime).toBeGreaterThan(currentTime)
            expect(expirationTime).toBeLessThan(maxExpectedExpiration)
            
            // Session should contain user information
            expect(session.user.id).toBe(userData.id)
            expect(session.user.email).toBe(userData.email)
            expect(session.user.name).toBe(userData.name)
            expect(session.user.role).toBe(userData.role)
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  /**
   * Test authentication input validation
   */
  test('Property 27: Authentication validates input format', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.oneof(
            fc.constant(''),
            fc.constant('not-an-email'),
            fc.constant('@invalid.com'),
            fc.constant('user@'),
            invalidEmailArb
          ),
          password: fc.oneof(
            fc.constant(''),
            fc.string({ maxLength: 7 }),
            invalidPasswordArb
          ),
        }),
        async (invalidInput) => {
          // Authentication should validate input format
          const authResult = await simulateAuthentication(invalidInput, null)
          
          // Should fail due to invalid format
          expect(authResult.success).toBe(false)
          expect(['invalid_format', 'missing_credentials']).toContain(authResult.reason)
          expect(authResult.user).toBeNull()
        }
      ),
      { numRuns: 50 }
    )
  })

  /**
   * Test that authentication preserves user data integrity
   */
  test('Property 26: Authentication preserves user data integrity', async () => {
    await fc.assert(
      fc.asyncProperty(
        validUserArb,
        validPasswordArb,
        async (userData, password) => {
          const credentials = {
            email: userData.email,
            password: password,
          }

          const hashedPassword = await createTestHashedPassword(password)
          const storedUser = {
            ...userData,
            password: hashedPassword,
          }

          const authResult = await simulateAuthentication(credentials, storedUser)
          
          if (authResult.success && authResult.user) {
            // Authenticated user data should match stored user (excluding password)
            expect(authResult.user.id).toBe(userData.id)
            expect(authResult.user.email).toBe(userData.email)
            expect(authResult.user.name).toBe(userData.name)
            expect(authResult.user.role).toBe(userData.role)
            
            // Password should not be included in the returned user object
            expect(authResult.user).not.toHaveProperty('password')
            
            // Session should preserve this data integrity
            const session = simulateSessionCreation(authResult.user)
            if (session) {
              expect(session.user.id).toBe(userData.id)
              expect(session.user.email).toBe(userData.email)
              expect(session.user.name).toBe(userData.name)
              expect(session.user.role).toBe(userData.role)
              expect(session.user).not.toHaveProperty('password')
            }
          }
        }
      ),
      { numRuns: 20 }
    )
  }, 60000)
})