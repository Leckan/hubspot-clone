/**
 * Property-Based Test for Input Validation
 * Feature: hubspot-clone, Property 31: Input validation before storage
 * Validates: Requirements 7.1
 */

import * as fc from 'fast-check'
import {
  CreateContactSchema,
  CreateCompanySchema,
  CreateDealSchema,
  CreateActivitySchema,
  CreateUserSchema,
  EmailSchema,
  PhoneSchema,
  OrganizationIdSchema,
  DealStageSchema
} from '@/lib/validations'
import test from 'node:test'
import test from 'node:test'
import test from 'node:test'
import test from 'node:test'
import test from 'node:test'
import test from 'node:test'
import test from 'node:test'
import test from 'node:test'
import test from 'node:test'
import test from 'node:test'
import test from 'node:test'
import test from 'node:test'
import test from 'node:test'
import test from 'node:test'
import test from 'node:test'
import { describe } from 'zod'

// Simple generators for valid data that match the validation patterns
const validEmailArb = fc.tuple(
  fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[A-Za-z0-9_+-]+$/.test(s)),
  fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[A-Za-z][A-Za-z0-9-]*[A-Za-z0-9]$/.test(s) || /^[A-Za-z0-9]$/.test(s)),
  fc.constantFrom('com', 'org', 'net', 'edu', 'gov')
).map(([local, domain, tld]) => `${local}@${domain}.${tld}`)

const validPhoneArb = fc.integer({ min: 1, max: 9 }).chain(firstDigit => 
  fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 9, maxLength: 14 })
    .map(digits => `+${firstDigit}${digits.join('')}`)
)
const validOrganizationIdArb = fc.string({ minLength: 8, maxLength: 32 }).filter(s => /^[a-zA-Z0-9]+$/.test(s))
const validNameArb = fc.string({ minLength: 2, maxLength: 50 }).filter(s => /^[a-zA-Z\s]+$/.test(s) && s.trim().length >= 2)
const validStringArb = fc.string({ minLength: 2, maxLength: 100 }).filter(s => /^[a-zA-Z0-9\s]+$/.test(s) && s.trim().length >= 2)
const validNonEmptyStringArb = fc.string({ minLength: 8, maxLength: 32 }).filter(s => /^[a-zA-Z0-9]+$/.test(s))
const validUrlArb = fc.webUrl()
const validAmountArb = fc.float({ min: Math.fround(0.01), max: Math.fround(1000000), noNaN: true })
const validProbabilityArb = fc.integer({ min: 0, max: 100 })

// Generators for invalid data
const invalidEmailArb = fc.oneof(
  fc.string().filter(s => !s.includes('@')),
  fc.constant(''),
  fc.constant('invalid-email'),
  fc.constant('@domain.com'),
  fc.constant('user@'),
  fc.constant('user@.com')
)

const invalidPhoneArb = fc.oneof(
  fc.string({ minLength: 1, maxLength: 5 }).filter(s => !/^[\+]?[1-9][\d]{0,15}$/.test(s)),
  fc.string().filter(s => /[a-zA-Z]/.test(s) || s.startsWith('0')),
  fc.constant(''),
  fc.constant('0123456789'), // starts with 0, invalid
  fc.constant('abc-def-ghij')
)

const emptyStringArb = fc.constant('')
const tooLongStringArb = fc.string({ minLength: 256, maxLength: 500 })
const negativeNumberArb = fc.float({ max: Math.fround(-0.01) })
const invalidProbabilityArb = fc.oneof(
  fc.integer({ max: -1 }),
  fc.integer({ min: 101 })
)

// Valid data generators for each schema
const validContactDataArb = fc.record({
  firstName: validNameArb,
  lastName: validNameArb,
  email: validEmailArb,
  phone: fc.option(validPhoneArb, { nil: undefined }),
  jobTitle: fc.option(validStringArb, { nil: undefined }),
  companyId: fc.option(validNonEmptyStringArb, { nil: undefined }),
  organizationId: validOrganizationIdArb
})

const validCompanyDataArb = fc.record({
  name: validNameArb,
  domain: fc.option(validUrlArb, { nil: undefined }),
  industry: fc.option(validStringArb, { nil: undefined }),
  size: fc.option(fc.constantFrom('startup', 'small', 'medium', 'large', 'enterprise'), { nil: undefined }),
  phone: fc.option(validPhoneArb, { nil: undefined }),
  address: fc.option(validStringArb, { nil: undefined }),
  organizationId: validOrganizationIdArb
})

const validDealDataArb = fc.record({
  title: validNameArb,
  amount: fc.option(validAmountArb, { nil: undefined }),
  stage: fc.constantFrom('lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'),
  probability: validProbabilityArb,
  expectedCloseDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }), { nil: undefined }),
  contactId: fc.option(validNonEmptyStringArb, { nil: undefined }),
  companyId: fc.option(validNonEmptyStringArb, { nil: undefined }),
  ownerId: validNonEmptyStringArb,
  organizationId: validOrganizationIdArb
})

const validActivityDataArb = fc.record({
  type: fc.constantFrom('call', 'email', 'meeting', 'task', 'note'),
  subject: validNameArb,
  description: fc.option(validStringArb, { nil: undefined }),
  dueDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }), { nil: undefined }),
  completed: fc.boolean(),
  contactId: fc.option(validNonEmptyStringArb, { nil: undefined }),
  dealId: fc.option(validNonEmptyStringArb, { nil: undefined }),
  userId: validNonEmptyStringArb,
  organizationId: validOrganizationIdArb
})

const validUserDataArb = fc.record({
  email: validEmailArb,
  name: validNameArb,
  password: fc.option(fc.string({ minLength: 8, maxLength: 50 }), { nil: undefined }),
  role: fc.constantFrom('admin', 'user', 'manager'),
  organizationId: validOrganizationIdArb
})

describe('Input Validation - Property 31: Input validation before storage', () => {

  /**
   * Property 31: Input validation before storage
   * For any data submission, the system should validate against defined schemas 
   * and reject invalid data before database operations
   */
  test('Property 31: Valid contact data passes validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        validContactDataArb,
        async (contactData) => {
          // Valid data should pass validation without throwing
          const result = CreateContactSchema.safeParse(contactData)
          expect(result.success).toBe(true)
          
          if (result.success) {
            // Validated data should match input structure
            expect(result.data.firstName).toBe(contactData.firstName)
            expect(result.data.lastName).toBe(contactData.lastName)
            expect(result.data.email).toBe(contactData.email)
            expect(result.data.organizationId).toBe(contactData.organizationId)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 31: Invalid contact data is rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          firstName: fc.oneof(emptyStringArb, tooLongStringArb),
          lastName: validNameArb,
          email: invalidEmailArb,
          organizationId: validOrganizationIdArb
        }),
        async (invalidContactData) => {
          // Invalid data should fail validation
          const result = CreateContactSchema.safeParse(invalidContactData)
          expect(result.success).toBe(false)
          
          if (!result.success) {
            // Should have validation errors
            expect(result.error.issues.length).toBeGreaterThan(0)
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  test('Property 31: Valid company data passes validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        validCompanyDataArb,
        async (companyData) => {
          const result = CreateCompanySchema.safeParse(companyData)
          expect(result.success).toBe(true)
          
          if (result.success) {
            expect(result.data.name).toBe(companyData.name)
            expect(result.data.organizationId).toBe(companyData.organizationId)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 31: Invalid company data is rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: emptyStringArb, // Invalid: empty name
          domain: fc.constant('not-a-url'), // Invalid: not a URL
          organizationId: validOrganizationIdArb
        }),
        async (invalidCompanyData) => {
          const result = CreateCompanySchema.safeParse(invalidCompanyData)
          expect(result.success).toBe(false)
          
          if (!result.success) {
            expect(result.error.issues.length).toBeGreaterThan(0)
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  test('Property 31: Valid deal data passes validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        validDealDataArb,
        async (dealData) => {
          const result = CreateDealSchema.safeParse(dealData)
          expect(result.success).toBe(true)
          
          if (result.success) {
            expect(result.data.title).toBe(dealData.title)
            expect(result.data.ownerId).toBe(dealData.ownerId)
            expect(result.data.organizationId).toBe(dealData.organizationId)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 31: Invalid deal data is rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: emptyStringArb, // Invalid: empty title
          amount: negativeNumberArb, // Invalid: negative amount
          probability: invalidProbabilityArb, // Invalid: out of range
          ownerId: emptyStringArb, // Invalid: empty owner ID
          organizationId: validOrganizationIdArb
        }),
        async (invalidDealData) => {
          const result = CreateDealSchema.safeParse(invalidDealData)
          expect(result.success).toBe(false)
          
          if (!result.success) {
            expect(result.error.issues.length).toBeGreaterThan(0)
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  test('Property 31: Valid activity data passes validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        validActivityDataArb,
        async (activityData) => {
          const result = CreateActivitySchema.safeParse(activityData)
          expect(result.success).toBe(true)
          
          if (result.success) {
            expect(result.data.type).toBe(activityData.type)
            expect(result.data.subject).toBe(activityData.subject)
            expect(result.data.userId).toBe(activityData.userId)
            expect(result.data.organizationId).toBe(activityData.organizationId)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 31: Invalid activity data is rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          type: fc.constant('invalid-type'), // Invalid: not in enum
          subject: emptyStringArb, // Invalid: empty subject
          userId: emptyStringArb, // Invalid: empty user ID
          organizationId: validOrganizationIdArb
        }),
        async (invalidActivityData) => {
          const result = CreateActivitySchema.safeParse(invalidActivityData)
          expect(result.success).toBe(false)
          
          if (!result.success) {
            expect(result.error.issues.length).toBeGreaterThan(0)
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  test('Property 31: Valid user data passes validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        validUserDataArb,
        async (userData) => {
          const result = CreateUserSchema.safeParse(userData)
          expect(result.success).toBe(true)
          
          if (result.success) {
            expect(result.data.email).toBe(userData.email)
            expect(result.data.name).toBe(userData.name)
            expect(result.data.organizationId).toBe(userData.organizationId)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 31: Invalid user data is rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: invalidEmailArb, // Invalid: malformed email
          name: emptyStringArb, // Invalid: empty name
          password: fc.constant('short'), // Invalid: too short password
          organizationId: emptyStringArb // Invalid: empty organization ID
        }),
        async (invalidUserData) => {
          const result = CreateUserSchema.safeParse(invalidUserData)
          expect(result.success).toBe(false)
          
          if (!result.success) {
            expect(result.error.issues.length).toBeGreaterThan(0)
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  /**
   * Test individual field validation schemas
   */
  test('Property 31: Email validation rejects invalid formats', async () => {
    await fc.assert(
      fc.asyncProperty(
        invalidEmailArb,
        async (invalidEmail) => {
          const result = EmailSchema.safeParse(invalidEmail)
          expect(result.success).toBe(false)
        }
      ),
      { numRuns: 50 }
    )
  })

  test('Property 31: Phone validation rejects invalid formats', async () => {
    await fc.assert(
      fc.asyncProperty(
        invalidPhoneArb,
        async (invalidPhone) => {
          const result = PhoneSchema.safeParse(invalidPhone)
          expect(result.success).toBe(false)
        }
      ),
      { numRuns: 50 }
    )
  })

  test('Property 31: Organization ID validation rejects empty values', async () => {
    await fc.assert(
      fc.asyncProperty(
        emptyStringArb,
        async (emptyOrgId) => {
          const result = OrganizationIdSchema.safeParse(emptyOrgId)
          expect(result.success).toBe(false)
        }
      ),
      { numRuns: 20 }
    )
  })

  test('Property 31: Enum validation rejects invalid values', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string().filter(s => !['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'].includes(s)),
        async (invalidStage) => {
          const result = DealStageSchema.safeParse(invalidStage)
          expect(result.success).toBe(false)
        }
      ),
      { numRuns: 50 }
    )
  })

  /**
   * Test that validation prevents data corruption
   */
  test('Property 31: Validation prevents storage of malformed data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          // Mix of valid and invalid fields to test comprehensive validation
          firstName: fc.oneof(validNameArb, emptyStringArb, tooLongStringArb),
          lastName: fc.oneof(validNameArb, emptyStringArb),
          email: fc.oneof(validEmailArb, invalidEmailArb),
          organizationId: fc.oneof(validOrganizationIdArb, emptyStringArb)
        }),
        async (mixedData) => {
          const result = CreateContactSchema.safeParse(mixedData)
          
          // If any field is invalid, the entire validation should fail
          const hasEmptyFirstName = mixedData.firstName.trim() === ''
          const hasTooLongFirstName = mixedData.firstName.length > 255
          const hasEmptyLastName = mixedData.lastName.trim() === ''
          const hasInvalidEmail = !mixedData.email.includes('@') || mixedData.email.trim() === '' || !mixedData.email.includes('.')
          const hasEmptyOrgId = mixedData.organizationId.trim() === ''
          
          const shouldFail = hasEmptyFirstName || hasTooLongFirstName || hasEmptyLastName || hasInvalidEmail || hasEmptyOrgId
          
          if (shouldFail) {
            expect(result.success).toBe(false)
          } else {
            expect(result.success).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})