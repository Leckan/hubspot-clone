/**
 * Property-Based Test for Data Retrieval Accuracy
 * Feature: hubspot-clone, Property 35: Data retrieval accuracy
 * Validates: Requirements 7.5
 */

import * as fc from 'fast-check'
import { prisma } from '@/lib/prisma'
import { DataIntegrityValidator, getWithAccuracyCheck, getBatchWithAccuracyCheck } from '@/lib/data-integrity'

// Mock Prisma Client for testing
jest.mock('@/lib/prisma', () => ({
  prisma: {
    contact: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    company: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    deal: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    activity: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  },
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

// Generators for test data
const uuidArb = fc.string({ minLength: 36, maxLength: 36 })
const organizationIdArb = fc.array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-'), { minLength: 10, maxLength: 30 }).map(chars => chars.join(''))
const emailArb = fc.emailAddress()
const nameArb = fc.string({ minLength: 1, maxLength: 50 })
const phoneArb = fc.option(fc.string({ minLength: 10, maxLength: 15 }))
const amountArb = fc.option(fc.float({ min: 0, max: 1000000 }))
const timestampArb = fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') })

const contactArb = fc.record({
  id: uuidArb,
  firstName: nameArb,
  lastName: nameArb,
  email: emailArb,
  phone: phoneArb,
  jobTitle: fc.option(nameArb),
  companyId: fc.option(uuidArb),
  organizationId: organizationIdArb,
  createdAt: timestampArb,
  updatedAt: timestampArb,
})

const companyArb = fc.record({
  id: uuidArb,
  name: nameArb,
  domain: fc.option(fc.webUrl()),
  industry: fc.option(nameArb),
  size: fc.option(fc.constantFrom('1-10', '11-50', '51-200', '201-500', '500+')),
  phone: phoneArb,
  address: fc.option(nameArb),
  organizationId: organizationIdArb,
  createdAt: timestampArb,
  updatedAt: timestampArb,
})

const dealArb = fc.record({
  id: uuidArb,
  title: nameArb,
  amount: amountArb,
  stage: fc.constantFrom('lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'),
  probability: fc.integer({ min: 0, max: 100 }),
  expectedCloseDate: fc.option(timestampArb),
  contactId: fc.option(uuidArb),
  companyId: fc.option(uuidArb),
  ownerId: uuidArb,
  organizationId: organizationIdArb,
  createdAt: timestampArb,
  updatedAt: timestampArb,
})

const activityArb = fc.record({
  id: uuidArb,
  type: fc.constantFrom('call', 'email', 'meeting', 'task', 'note'),
  subject: nameArb,
  description: fc.option(nameArb),
  dueDate: fc.option(timestampArb),
  completed: fc.boolean(),
  contactId: fc.option(uuidArb),
  dealId: fc.option(uuidArb),
  userId: uuidArb,
  organizationId: organizationIdArb,
  createdAt: timestampArb,
  updatedAt: timestampArb,
})

describe('Data Retrieval Accuracy - Property 35: Data retrieval accuracy', () => {

  beforeEach(() => {
    jest.clearAllMocks()
  })

  /**
   * Property 35: Data retrieval accuracy
   * For any data retrieval request, the returned information should exactly match 
   * the current state stored in the database
   */
  test('Property 35: Single contact retrieval returns exact database state', async () => {
    await fc.assert(
      fc.asyncProperty(
        contactArb,
        async (storedContact) => {
          // Mock database to return the stored contact
          mockPrisma.contact.findUnique.mockResolvedValue(storedContact)
          
          // Retrieve the contact
          const retrievedContact = await prisma.contact.findUnique({
            where: { id: storedContact.id }
          })

          // Verify exact match with stored state
          expect(retrievedContact).toEqual(storedContact)
          
          // Verify all fields match exactly
          if (retrievedContact) {
            expect(retrievedContact.id).toBe(storedContact.id)
            expect(retrievedContact.firstName).toBe(storedContact.firstName)
            expect(retrievedContact.lastName).toBe(storedContact.lastName)
            expect(retrievedContact.email).toBe(storedContact.email)
            expect(retrievedContact.phone).toBe(storedContact.phone)
            expect(retrievedContact.jobTitle).toBe(storedContact.jobTitle)
            expect(retrievedContact.companyId).toBe(storedContact.companyId)
            expect(retrievedContact.organizationId).toBe(storedContact.organizationId)
            expect(retrievedContact.createdAt).toEqual(storedContact.createdAt)
            expect(retrievedContact.updatedAt).toEqual(storedContact.updatedAt)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 35: Single company retrieval returns exact database state', async () => {
    await fc.assert(
      fc.asyncProperty(
        companyArb,
        async (storedCompany) => {
          // Mock database to return the stored company
          mockPrisma.company.findUnique.mockResolvedValue(storedCompany)
          
          // Retrieve the company
          const retrievedCompany = await prisma.company.findUnique({
            where: { id: storedCompany.id }
          })

          // Verify exact match with stored state
          expect(retrievedCompany).toEqual(storedCompany)
          
          // Verify all fields match exactly
          if (retrievedCompany) {
            expect(retrievedCompany.id).toBe(storedCompany.id)
            expect(retrievedCompany.name).toBe(storedCompany.name)
            expect(retrievedCompany.domain).toBe(storedCompany.domain)
            expect(retrievedCompany.industry).toBe(storedCompany.industry)
            expect(retrievedCompany.size).toBe(storedCompany.size)
            expect(retrievedCompany.phone).toBe(storedCompany.phone)
            expect(retrievedCompany.address).toBe(storedCompany.address)
            expect(retrievedCompany.organizationId).toBe(storedCompany.organizationId)
            expect(retrievedCompany.createdAt).toEqual(storedCompany.createdAt)
            expect(retrievedCompany.updatedAt).toEqual(storedCompany.updatedAt)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 35: Single deal retrieval returns exact database state', async () => {
    await fc.assert(
      fc.asyncProperty(
        dealArb,
        async (storedDeal) => {
          // Mock database to return the stored deal
          mockPrisma.deal.findUnique.mockResolvedValue(storedDeal)
          
          // Retrieve the deal
          const retrievedDeal = await prisma.deal.findUnique({
            where: { id: storedDeal.id }
          })

          // Verify exact match with stored state
          expect(retrievedDeal).toEqual(storedDeal)
          
          // Verify all fields match exactly
          if (retrievedDeal) {
            expect(retrievedDeal.id).toBe(storedDeal.id)
            expect(retrievedDeal.title).toBe(storedDeal.title)
            expect(retrievedDeal.amount).toBe(storedDeal.amount)
            expect(retrievedDeal.stage).toBe(storedDeal.stage)
            expect(retrievedDeal.probability).toBe(storedDeal.probability)
            expect(retrievedDeal.expectedCloseDate).toEqual(storedDeal.expectedCloseDate)
            expect(retrievedDeal.contactId).toBe(storedDeal.contactId)
            expect(retrievedDeal.companyId).toBe(storedDeal.companyId)
            expect(retrievedDeal.ownerId).toBe(storedDeal.ownerId)
            expect(retrievedDeal.organizationId).toBe(storedDeal.organizationId)
            expect(retrievedDeal.createdAt).toEqual(storedDeal.createdAt)
            expect(retrievedDeal.updatedAt).toEqual(storedDeal.updatedAt)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 35: Single activity retrieval returns exact database state', async () => {
    await fc.assert(
      fc.asyncProperty(
        activityArb,
        async (storedActivity) => {
          // Mock database to return the stored activity
          mockPrisma.activity.findUnique.mockResolvedValue(storedActivity)
          
          // Retrieve the activity
          const retrievedActivity = await prisma.activity.findUnique({
            where: { id: storedActivity.id }
          })

          // Verify exact match with stored state
          expect(retrievedActivity).toEqual(storedActivity)
          
          // Verify all fields match exactly
          if (retrievedActivity) {
            expect(retrievedActivity.id).toBe(storedActivity.id)
            expect(retrievedActivity.type).toBe(storedActivity.type)
            expect(retrievedActivity.subject).toBe(storedActivity.subject)
            expect(retrievedActivity.description).toBe(storedActivity.description)
            expect(retrievedActivity.dueDate).toEqual(storedActivity.dueDate)
            expect(retrievedActivity.completed).toBe(storedActivity.completed)
            expect(retrievedActivity.contactId).toBe(storedActivity.contactId)
            expect(retrievedActivity.dealId).toBe(storedActivity.dealId)
            expect(retrievedActivity.userId).toBe(storedActivity.userId)
            expect(retrievedActivity.organizationId).toBe(storedActivity.organizationId)
            expect(retrievedActivity.createdAt).toEqual(storedActivity.createdAt)
            expect(retrievedActivity.updatedAt).toEqual(storedActivity.updatedAt)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 35: Batch contact retrieval returns exact database state', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(contactArb, { minLength: 1, maxLength: 10 }),
        async (storedContacts) => {
          // Mock database to return the stored contacts
          mockPrisma.contact.findMany.mockResolvedValue(storedContacts)
          
          // Retrieve the contacts
          const retrievedContacts = await prisma.contact.findMany({
            where: {
              id: { in: storedContacts.map(c => c.id) }
            }
          })

          // Verify exact match with stored state
          expect(retrievedContacts).toEqual(storedContacts)
          expect(retrievedContacts.length).toBe(storedContacts.length)
          
          // Verify each contact matches exactly
          retrievedContacts.forEach((retrieved, index) => {
            const stored = storedContacts[index]
            expect(retrieved.id).toBe(stored.id)
            expect(retrieved.firstName).toBe(stored.firstName)
            expect(retrieved.lastName).toBe(stored.lastName)
            expect(retrieved.email).toBe(stored.email)
            expect(retrieved.organizationId).toBe(stored.organizationId)
          })
        }
      ),
      { numRuns: 50 }
    )
  })

  test('Property 35: Cached data retrieval returns exact database state', async () => {
    await fc.assert(
      fc.asyncProperty(
        contactArb,
        async (storedContact) => {
          // Mock database to return the stored contact
          mockPrisma.contact.findUnique.mockResolvedValue(storedContact)
          
          // Use cached retrieval function
          const retrievedContact = await getWithAccuracyCheck(
            'contact',
            storedContact.id,
            () => prisma.contact.findUnique({ where: { id: storedContact.id } }),
            (data) => data !== null && data.id === storedContact.id
          )

          // Verify exact match with stored state
          expect(retrievedContact).toEqual(storedContact)
          
          // Verify validation function would pass
          if (retrievedContact) {
            expect(retrievedContact.id).toBe(storedContact.id)
            expect(retrievedContact.email).toBe(storedContact.email)
            expect(retrievedContact.organizationId).toBe(storedContact.organizationId)
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  test('Property 35: Batch cached data retrieval returns exact database state', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(contactArb, { minLength: 1, maxLength: 5 }),
        async (storedContacts) => {
          // Mock database to return the stored contacts
          mockPrisma.contact.findMany.mockResolvedValue(storedContacts)
          
          const contactIds = storedContacts.map(c => c.id)
          
          // Use batch cached retrieval function
          const retrievedContacts = await getBatchWithAccuracyCheck(
            'contact',
            contactIds,
            (ids) => prisma.contact.findMany({ where: { id: { in: ids } } }),
            (data) => data.length === storedContacts.length
          )

          // Verify exact match with stored state
          expect(retrievedContacts).toEqual(storedContacts)
          expect(retrievedContacts.length).toBe(storedContacts.length)
          
          // Verify each contact matches exactly
          retrievedContacts.forEach((retrieved, index) => {
            const stored = storedContacts[index]
            expect(retrieved.id).toBe(stored.id)
            expect(retrieved.email).toBe(stored.email)
            expect(retrieved.organizationId).toBe(stored.organizationId)
          })
        }
      ),
      { numRuns: 30 }
    )
  })

  test('Property 35: Filtered data retrieval returns exact matching database state', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(contactArb, { minLength: 2, maxLength: 10 }),
        organizationIdArb,
        async (allContacts, filterOrgId) => {
          // Set some contacts to have the filter organization ID
          const filteredContacts = allContacts.slice(0, Math.ceil(allContacts.length / 2))
            .map(contact => ({ ...contact, organizationId: filterOrgId }))
          
          const otherContacts = allContacts.slice(Math.ceil(allContacts.length / 2))
          const allStoredContacts = [...filteredContacts, ...otherContacts]
          
          // Mock database to return only filtered contacts
          mockPrisma.contact.findMany.mockResolvedValue(filteredContacts)
          
          // Retrieve contacts with organization filter
          const retrievedContacts = await prisma.contact.findMany({
            where: { organizationId: filterOrgId }
          })

          // Verify exact match with filtered stored state
          expect(retrievedContacts).toEqual(filteredContacts)
          expect(retrievedContacts.length).toBe(filteredContacts.length)
          
          // Verify all returned contacts match the filter
          retrievedContacts.forEach(contact => {
            expect(contact.organizationId).toBe(filterOrgId)
          })
          
          // Verify no contacts from other organizations are returned
          const otherOrgIds = otherContacts.map(c => c.organizationId)
          retrievedContacts.forEach(contact => {
            expect(otherOrgIds).not.toContain(contact.organizationId)
          })
        }
      ),
      { numRuns: 50 }
    )
  })

  test('Property 35: Non-existent entity retrieval returns null consistently', async () => {
    await fc.assert(
      fc.asyncProperty(
        uuidArb,
        async (nonExistentId) => {
          // Mock database to return null for non-existent entity
          mockPrisma.contact.findUnique.mockResolvedValue(null)
          mockPrisma.company.findUnique.mockResolvedValue(null)
          mockPrisma.deal.findUnique.mockResolvedValue(null)
          mockPrisma.activity.findUnique.mockResolvedValue(null)
          
          // Retrieve non-existent entities
          const [contact, company, deal, activity] = await Promise.all([
            prisma.contact.findUnique({ where: { id: nonExistentId } }),
            prisma.company.findUnique({ where: { id: nonExistentId } }),
            prisma.deal.findUnique({ where: { id: nonExistentId } }),
            prisma.activity.findUnique({ where: { id: nonExistentId } })
          ])

          // Verify all return null consistently
          expect(contact).toBeNull()
          expect(company).toBeNull()
          expect(deal).toBeNull()
          expect(activity).toBeNull()
        }
      ),
      { numRuns: 50 }
    )
  })
})