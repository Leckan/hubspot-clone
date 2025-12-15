/**
 * Integration Tests for Business Logic and Data Flow
 * Tests cross-component interactions through business logic layer
 * Validates: All requirements integration
 */

import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { CreateContactSchema, CreateDealSchema, CreateCompanySchema } from '@/lib/validations'
import { sanitizeContactInput, sanitizeDealInput, sanitizeCompanyInput } from '@/lib/sanitization'

// Test data setup
const testOrganizationId = 'integration-test-org-123'
const testUserId = 'integration-test-user-123'

describe('Business Logic Integration Tests', () => {
  let testUser: any

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.activity.deleteMany({ where: { organizationId: testOrganizationId } })
    await prisma.deal.deleteMany({ where: { organizationId: testOrganizationId } })
    await prisma.contact.deleteMany({ where: { organizationId: testOrganizationId } })
    await prisma.company.deleteMany({ where: { organizationId: testOrganizationId } })
    await prisma.user.deleteMany({ where: { organizationId: testOrganizationId } })
  })

  beforeEach(async () => {
    // Create test user
    const hashedPassword = await bcrypt.hash('testpassword123', 12)
    testUser = await prisma.user.create({
      data: {
        id: testUserId,
        email: 'integration@example.com',
        name: 'Integration Test User',
        password: hashedPassword,
        organizationId: testOrganizationId,
        role: 'user',
      },
    })
  })

  afterEach(async () => {
    // Clean up test data
    await prisma.activity.deleteMany({ where: { organizationId: testOrganizationId } })
    await prisma.deal.deleteMany({ where: { organizationId: testOrganizationId } })
    await prisma.contact.deleteMany({ where: { organizationId: testOrganizationId } })
    await prisma.company.deleteMany({ where: { organizationId: testOrganizationId } })
    await prisma.user.deleteMany({ where: { organizationId: testOrganizationId } })
    
    jest.clearAllMocks()
  })

  afterAll(async () => {
    // Final cleanup
    await prisma.activity.deleteMany({ where: { organizationId: testOrganizationId } })
    await prisma.deal.deleteMany({ where: { organizationId: testOrganizationId } })
    await prisma.contact.deleteMany({ where: { organizationId: testOrganizationId } })
    await prisma.company.deleteMany({ where: { organizationId: testOrganizationId } })
    await prisma.user.deleteMany({ where: { organizationId: testOrganizationId } })
  })

  /**
   * Test 1: Complete CRM Workflow Integration
   * Tests the full business workflow from company creation to deal closure
   */
  test('Complete CRM Workflow Integration', async () => {
    // Step 1: Create and validate company
    const companyInput = {
      name: 'Integration Test Corp',
      domain: 'integration.com',
      industry: 'Technology',
      size: 'medium' as const,
      phone: '+15550123',
      address: '123 Integration St, Test City, TC 12345',
      organizationId: testOrganizationId,
    }

    const sanitizedCompanyInput = sanitizeCompanyInput(companyInput)
    const validatedCompanyData = CreateCompanySchema.parse(sanitizedCompanyInput)

    const company = await prisma.company.create({
      data: validatedCompanyData,
    })

    expect(company).toBeDefined()
    expect(company.name).toBe('Integration Test Corp')
    expect(company.organizationId).toBe(testOrganizationId)

    // Step 2: Create and validate contact with company association
    const contactInput = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@integration.com',
      phone: '+1-555-0124',
      jobTitle: 'CEO',
      companyId: company.id,
      organizationId: testOrganizationId,
    }

    const sanitizedContactInput = sanitizeContactInput(contactInput)
    const validatedContactData = CreateContactSchema.parse(sanitizedContactInput)

    // Verify company exists before creating contact
    const existingCompany = await prisma.company.findFirst({
      where: {
        id: validatedContactData.companyId,
        organizationId: testOrganizationId,
      },
    })
    expect(existingCompany).toBeDefined()

    const contact = await prisma.contact.create({
      data: validatedContactData,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            domain: true,
          },
        },
      },
    })

    expect(contact).toBeDefined()
    expect(contact.email).toBe('john.doe@integration.com')
    expect(contact.companyId).toBe(company.id)
    expect(contact.company?.name).toBe('Integration Test Corp')

    // Step 3: Create and validate deal with contact and company associations
    const dealInput = {
      title: 'Enterprise Software License',
      amount: 50000,
      stage: 'lead' as const,
      probability: 25,
      expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      contactId: contact.id,
      companyId: company.id,
      ownerId: testUserId,
      organizationId: testOrganizationId,
    }

    const sanitizedDealInput = sanitizeDealInput(dealInput)
    const validatedDealData = CreateDealSchema.parse(sanitizedDealInput)

    // Verify contact and company exist before creating deal
    const existingContact = await prisma.contact.findFirst({
      where: {
        id: validatedDealData.contactId,
        organizationId: testOrganizationId,
      },
    })
    expect(existingContact).toBeDefined()

    const deal = await prisma.deal.create({
      data: validatedDealData,
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
            domain: true,
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    expect(deal).toBeDefined()
    expect(deal.title).toBe('Enterprise Software License')
    expect(deal.contactId).toBe(contact.id)
    expect(deal.companyId).toBe(company.id)
    expect(deal.stage).toBe('lead')
    expect(deal.contact?.email).toBe('john.doe@integration.com')
    expect(deal.company?.name).toBe('Integration Test Corp')

    // Step 4: Create activity associated with both contact and deal
    const activity = await prisma.activity.create({
      data: {
        type: 'call',
        subject: 'Initial Discovery Call',
        description: 'Discussed requirements and timeline',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        contactId: contact.id,
        dealId: deal.id,
        userId: testUserId,
        organizationId: testOrganizationId,
      },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        deal: {
          select: {
            id: true,
            title: true,
            stage: true,
          },
        },
      },
    })

    expect(activity).toBeDefined()
    expect(activity.subject).toBe('Initial Discovery Call')
    expect(activity.contactId).toBe(contact.id)
    expect(activity.dealId).toBe(deal.id)
    expect(activity.contact?.email).toBe('john.doe@integration.com')
    expect(activity.deal?.title).toBe('Enterprise Software License')

    // Step 5: Verify cross-component data integrity
    // Check contact with related data
    const contactWithRelations = await prisma.contact.findFirst({
      where: { id: contact.id },
      include: {
        company: true,
        _count: {
          select: {
            deals: true,
            activities: true,
          },
        },
      },
    })

    expect(contactWithRelations?._count.deals).toBe(1)
    expect(contactWithRelations?._count.activities).toBe(1)
    expect(contactWithRelations?.company?.name).toBe('Integration Test Corp')

    // Check deal with related data
    const dealWithRelations = await prisma.deal.findFirst({
      where: { id: deal.id },
      include: {
        contact: true,
        company: true,
        _count: {
          select: {
            activities: true,
          },
        },
      },
    })

    expect(dealWithRelations?._count.activities).toBe(1)
    expect(dealWithRelations?.contact?.email).toBe('john.doe@integration.com')
    expect(dealWithRelations?.company?.name).toBe('Integration Test Corp')

    // Step 6: Test deal stage progression
    const updatedDeal = await prisma.deal.update({
      where: { id: deal.id },
      data: {
        stage: 'won',
        probability: 100,
      },
    })

    expect(updatedDeal.stage).toBe('won')
    expect(updatedDeal.probability).toBe(100)

    // Step 7: Calculate dashboard metrics
    const [
      totalContacts,
      totalCompanies,
      totalDeals,
      totalRevenue,
      wonDeals,
      activitiesCount,
    ] = await Promise.all([
      prisma.contact.count({ where: { organizationId: testOrganizationId } }),
      prisma.company.count({ where: { organizationId: testOrganizationId } }),
      prisma.deal.count({ where: { organizationId: testOrganizationId } }),
      prisma.deal.aggregate({
        where: { organizationId: testOrganizationId, stage: 'won' },
        _sum: { amount: true },
      }),
      prisma.deal.count({ where: { organizationId: testOrganizationId, stage: 'won' } }),
      prisma.activity.count({ where: { organizationId: testOrganizationId } }),
    ])

    expect(totalContacts).toBe(1)
    expect(totalCompanies).toBe(1)
    expect(totalDeals).toBe(1)
    expect(Number(totalRevenue._sum.amount)).toBe(50000)
    expect(wonDeals).toBe(1)
    expect(activitiesCount).toBe(1)
  })

  /**
   * Test 2: Data Validation and Error Handling Integration
   * Tests validation and error handling across components
   */
  test('Data Validation and Error Handling Integration', async () => {
    // Test duplicate email validation
    const contactData = {
      firstName: 'Test',
      lastName: 'User',
      email: 'duplicate@example.com',
      organizationId: testOrganizationId,
    }

    // Create first contact
    const sanitizedInput1 = sanitizeContactInput(contactData)
    const validatedData1 = CreateContactSchema.parse(sanitizedInput1)
    
    const firstContact = await prisma.contact.create({
      data: validatedData1,
    })
    expect(firstContact).toBeDefined()

    // Try to create duplicate contact (should be prevented by unique constraint)
    const sanitizedInput2 = sanitizeContactInput(contactData)
    const validatedData2 = CreateContactSchema.parse(sanitizedInput2)

    await expect(
      prisma.contact.create({
        data: validatedData2,
      })
    ).rejects.toThrow()

    // Test invalid data validation
    expect(() => {
      const invalidContactData = {
        firstName: '', // Empty required field
        lastName: 'Test',
        email: 'invalid-email', // Invalid email format
        organizationId: testOrganizationId,
      }
      
      const sanitizedInvalidInput = sanitizeContactInput(invalidContactData)
      CreateContactSchema.parse(sanitizedInvalidInput)
    }).toThrow()

    // Test referential integrity - create deal with invalid amount
    expect(() => {
      const invalidDealData = {
        title: 'Invalid Deal',
        amount: -10000, // Negative amount should fail
        contactId: 'valid-contact-id',
        companyId: 'valid-company-id',
        ownerId: testUserId,
        organizationId: testOrganizationId,
      }
      
      const sanitizedInvalidDeal = sanitizeDealInput(invalidDealData)
      CreateDealSchema.parse(sanitizedInvalidDeal)
    }).toThrow()

    // Verify only valid data exists
    const totalContacts = await prisma.contact.count({
      where: { organizationId: testOrganizationId },
    })
    expect(totalContacts).toBe(1) // Only the first valid contact
  })

  /**
   * Test 3: Search and Filtering Integration
   * Tests search and filtering functionality across entities
   */
  test('Search and Filtering Integration', async () => {
    // Create test data
    const companies = await Promise.all([
      prisma.company.create({
        data: {
          name: 'Search Tech Solutions',
          domain: 'searchtech.com',
          organizationId: testOrganizationId,
        },
      }),
      prisma.company.create({
        data: {
          name: 'Filter Industries',
          domain: 'filter.com',
          organizationId: testOrganizationId,
        },
      }),
    ])

    const contacts = await Promise.all([
      prisma.contact.create({
        data: {
          firstName: 'Search',
          lastName: 'Expert',
          email: 'search@searchtech.com',
          companyId: companies[0].id,
          organizationId: testOrganizationId,
        },
      }),
      prisma.contact.create({
        data: {
          firstName: 'Filter',
          lastName: 'Specialist',
          email: 'filter@filter.com',
          companyId: companies[1].id,
          organizationId: testOrganizationId,
        },
      }),
    ])

    const deals = await Promise.all([
      prisma.deal.create({
        data: {
          title: 'Search Technology Implementation',
          amount: 40000,
          stage: 'proposal',
          contactId: contacts[0].id,
          companyId: companies[0].id,
          ownerId: testUserId,
          organizationId: testOrganizationId,
        },
      }),
      prisma.deal.create({
        data: {
          title: 'Filter System Upgrade',
          amount: 25000,
          stage: 'qualified',
          contactId: contacts[1].id,
          companyId: companies[1].id,
          ownerId: testUserId,
          organizationId: testOrganizationId,
        },
      }),
    ])

    // Test contact search by name
    const contactsByName = await prisma.contact.findMany({
      where: {
        organizationId: testOrganizationId,
        OR: [
          { firstName: { contains: 'search', mode: 'insensitive' } },
          { lastName: { contains: 'search', mode: 'insensitive' } },
          { email: { contains: 'search', mode: 'insensitive' } },
        ],
      },
      include: { company: true },
    })

    expect(contactsByName).toHaveLength(1)
    expect(contactsByName[0].firstName).toBe('Search')
    expect(contactsByName[0].company?.name).toBe('Search Tech Solutions')

    // Test deal search by title
    const dealsByTitle = await prisma.deal.findMany({
      where: {
        organizationId: testOrganizationId,
        title: { contains: 'technology', mode: 'insensitive' },
      },
      include: { contact: true, company: true },
    })

    expect(dealsByTitle).toHaveLength(1)
    expect(dealsByTitle[0].title).toBe('Search Technology Implementation')
    expect(dealsByTitle[0].contact?.firstName).toBe('Search')

    // Test deal filtering by stage
    const dealsByStage = await prisma.deal.findMany({
      where: {
        organizationId: testOrganizationId,
        stage: 'proposal',
      },
    })

    expect(dealsByStage).toHaveLength(1)
    expect(dealsByStage[0].stage).toBe('proposal')

    // Test deal filtering by amount range
    const dealsByAmount = await prisma.deal.findMany({
      where: {
        organizationId: testOrganizationId,
        amount: {
          gte: 30000,
          lte: 50000,
        },
      },
    })

    expect(dealsByAmount).toHaveLength(1)
    expect(Number(dealsByAmount[0].amount)).toBe(40000)

    // Test contact filtering by company
    const contactsByCompany = await prisma.contact.findMany({
      where: {
        organizationId: testOrganizationId,
        companyId: companies[0].id,
      },
      include: { company: true },
    })

    expect(contactsByCompany).toHaveLength(1)
    expect(contactsByCompany[0].companyId).toBe(companies[0].id)
    expect(contactsByCompany[0].company?.name).toBe('Search Tech Solutions')
  })

  /**
   * Test 4: Cascading Operations and Data Integrity
   * Tests cascading operations and referential integrity
   */
  test('Cascading Operations and Data Integrity', async () => {
    // Create complete data set
    const company = await prisma.company.create({
      data: {
        name: 'Cascade Test Company',
        organizationId: testOrganizationId,
      },
    })

    const contact = await prisma.contact.create({
      data: {
        firstName: 'Cascade',
        lastName: 'User',
        email: 'cascade@example.com',
        companyId: company.id,
        organizationId: testOrganizationId,
      },
    })

    const deal = await prisma.deal.create({
      data: {
        title: 'Cascade Deal',
        amount: 30000,
        stage: 'qualified',
        contactId: contact.id,
        companyId: company.id,
        ownerId: testUserId,
        organizationId: testOrganizationId,
      },
    })

    const activity = await prisma.activity.create({
      data: {
        type: 'meeting',
        subject: 'Cascade Meeting',
        contactId: contact.id,
        dealId: deal.id,
        userId: testUserId,
        organizationId: testOrganizationId,
      },
    })

    // Verify initial state
    const initialCounts = {
      contacts: await prisma.contact.count({ where: { organizationId: testOrganizationId } }),
      deals: await prisma.deal.count({ where: { organizationId: testOrganizationId } }),
      activities: await prisma.activity.count({ where: { organizationId: testOrganizationId } }),
    }

    expect(initialCounts.contacts).toBe(1)
    expect(initialCounts.deals).toBe(1)
    expect(initialCounts.activities).toBe(1)

    // Test cascading deletion using transaction
    await prisma.$transaction(async (tx) => {
      // Delete activities first
      await tx.activity.deleteMany({
        where: { contactId: contact.id },
      })

      // Update deals to remove contact association
      await tx.deal.updateMany({
        where: { contactId: contact.id },
        data: { contactId: null },
      })

      // Delete contact
      await tx.contact.delete({
        where: { id: contact.id },
      })
    })

    // Verify cascading effects
    const afterDeletionCounts = {
      contacts: await prisma.contact.count({ where: { organizationId: testOrganizationId } }),
      deals: await prisma.deal.count({ where: { organizationId: testOrganizationId } }),
      activities: await prisma.activity.count({ where: { organizationId: testOrganizationId } }),
    }

    expect(afterDeletionCounts.contacts).toBe(0) // Contact deleted
    expect(afterDeletionCounts.deals).toBe(1) // Deal preserved
    expect(afterDeletionCounts.activities).toBe(0) // Activities deleted

    // Verify deal still exists but contact association is removed
    const remainingDeal = await prisma.deal.findFirst({
      where: { id: deal.id },
    })

    expect(remainingDeal).toBeDefined()
    expect(remainingDeal?.contactId).toBeNull()
    expect(remainingDeal?.companyId).toBe(company.id) // Company association preserved
  })

  /**
   * Test 5: Concurrent Operations and Data Consistency
   * Tests concurrent operations maintain data consistency
   */
  test('Concurrent Operations and Data Consistency', async () => {
    // Create base company
    const company = await prisma.company.create({
      data: {
        name: 'Concurrent Test Company',
        organizationId: testOrganizationId,
      },
    })

    // Simulate concurrent contact creation
    const concurrentContactCreations = Array.from({ length: 5 }, (_, i) =>
      prisma.contact.create({
        data: {
          firstName: `Concurrent${i}`,
          lastName: 'User',
          email: `concurrent${i}@example.com`,
          companyId: company.id,
          organizationId: testOrganizationId,
        },
      })
    )

    const createdContacts = await Promise.all(concurrentContactCreations)
    expect(createdContacts).toHaveLength(5)

    // Verify all contacts were created with correct associations
    const allContacts = await prisma.contact.findMany({
      where: { organizationId: testOrganizationId },
      include: { company: true },
    })

    expect(allContacts).toHaveLength(5)
    expect(allContacts.every(c => c.companyId === company.id)).toBe(true)
    expect(allContacts.every(c => c.company?.name === 'Concurrent Test Company')).toBe(true)

    // Simulate concurrent deal creation for each contact
    const concurrentDealCreations = createdContacts.map((contact, i) =>
      prisma.deal.create({
        data: {
          title: `Concurrent Deal ${i}`,
          amount: 10000 + (i * 5000),
          stage: 'lead',
          contactId: contact.id,
          companyId: company.id,
          ownerId: testUserId,
          organizationId: testOrganizationId,
        },
      })
    )

    const createdDeals = await Promise.all(concurrentDealCreations)
    expect(createdDeals).toHaveLength(5)

    // Verify all deals were created with correct associations
    const allDeals = await prisma.deal.findMany({
      where: { organizationId: testOrganizationId },
      include: { contact: true, company: true },
    })

    expect(allDeals).toHaveLength(5)
    expect(allDeals.every(d => d.companyId === company.id)).toBe(true)
    expect(allDeals.every(d => d.contact !== null)).toBe(true)

    // Calculate final metrics
    const finalMetrics = {
      totalContacts: await prisma.contact.count({ where: { organizationId: testOrganizationId } }),
      totalDeals: await prisma.deal.count({ where: { organizationId: testOrganizationId } }),
      totalRevenue: await prisma.deal.aggregate({
        where: { organizationId: testOrganizationId },
        _sum: { amount: true },
      }),
      averageDealSize: await prisma.deal.aggregate({
        where: { organizationId: testOrganizationId },
        _avg: { amount: true },
      }),
    }

    expect(finalMetrics.totalContacts).toBe(5)
    expect(finalMetrics.totalDeals).toBe(5)
    expect(Number(finalMetrics.totalRevenue._sum.amount)).toBe(100000) // 10000 + 15000 + 20000 + 25000 + 30000
    expect(Number(finalMetrics.averageDealSize._avg.amount)).toBe(20000)
  })
})