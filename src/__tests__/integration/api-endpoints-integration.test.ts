/**
 * API Business Logic Integration Tests
 * Tests business logic integration with validation and database operations
 * Validates: All requirements integration - Business logic layer
 */

import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { CreateContactSchema, CreateDealSchema, CreateCompanySchema, CreateActivitySchema } from '@/lib/validations'
import { sanitizeContactInput, sanitizeDealInput, sanitizeCompanyInput } from '@/lib/sanitization'

// Test data setup
const testOrganizationId = 'api-test-org-123'
const testUserId = 'api-test-user-123'

describe('API Business Logic Integration Tests', () => {
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
        email: 'api@example.com',
        name: 'API Test User',
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
   * Test 1: Company Business Logic Integration
   * Tests company creation and validation through business logic layer
   */
  test('Company Business Logic Integration', async () => {
    // Test company creation with validation
    const companyData = {
      name: 'API Test Company',
      domain: 'apitest.com',
      industry: 'Technology',
      size: 'medium' as const,
      phone: '+15550199',
      address: '123 API St, Test City, TC 12345',
      organizationId: testOrganizationId,
    }

    // Sanitize and validate input
    const sanitizedInput = sanitizeCompanyInput(companyData)
    const validatedData = CreateCompanySchema.parse(sanitizedInput)

    // Create company through business logic
    const createdCompany = await prisma.company.create({
      data: validatedData,
    })

    expect(createdCompany.name).toBe('API Test Company')
    expect(createdCompany.domain).toBe('apitest.com')
    expect(createdCompany.organizationId).toBe(testOrganizationId)

    // Test company retrieval with filtering
    const companies = await prisma.company.findMany({
      where: { organizationId: testOrganizationId },
    })

    expect(Array.isArray(companies)).toBe(true)
    expect(companies).toHaveLength(1)
    expect(companies[0].name).toBe('API Test Company')

    // Test search functionality
    const searchResults = await prisma.company.findMany({
      where: {
        organizationId: testOrganizationId,
        OR: [
          { name: { contains: 'API', mode: 'insensitive' } },
          { domain: { contains: 'apitest', mode: 'insensitive' } },
        ],
      },
    })

    expect(searchResults).toHaveLength(1)
    expect(searchResults[0].name).toBe('API Test Company')
  })

  /**
   * Test 2: Contact Business Logic Integration
   * Tests contact creation and validation with company associations
   */
  test('Contact Business Logic Integration', async () => {
    // Setup: Create a company first
    const company = await prisma.company.create({
      data: {
        name: 'Contact Test Company',
        organizationId: testOrganizationId,
      },
    })

    // Test contact creation with validation
    const contactData = {
      firstName: 'John',
      lastName: 'API',
      email: 'john.api@example.com',
      phone: '+15550188',
      jobTitle: 'API Tester',
      companyId: company.id,
      organizationId: testOrganizationId,
    }

    // Sanitize and validate input
    const sanitizedInput = sanitizeContactInput(contactData)
    const validatedData = CreateContactSchema.parse(sanitizedInput)

    // Create contact through business logic
    const createdContact = await prisma.contact.create({
      data: validatedData,
      include: { company: true },
    })

    expect(createdContact.firstName).toBe('John')
    expect(createdContact.lastName).toBe('API')
    expect(createdContact.email).toBe('john.api@example.com')
    expect(createdContact.companyId).toBe(company.id)
    expect(createdContact.company?.name).toBe('Contact Test Company')

    // Test contact retrieval with relationships
    const contacts = await prisma.contact.findMany({
      where: { organizationId: testOrganizationId },
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

    expect(Array.isArray(contacts)).toBe(true)
    expect(contacts).toHaveLength(1)
    expect(contacts[0].firstName).toBe('John')
    expect(contacts[0].company?.name).toBe('Contact Test Company')
    expect(contacts[0]._count.deals).toBe(0)
    expect(contacts[0]._count.activities).toBe(0)

    // Test search functionality
    const searchResults = await prisma.contact.findMany({
      where: {
        organizationId: testOrganizationId,
        OR: [
          { firstName: { contains: 'john', mode: 'insensitive' } },
          { lastName: { contains: 'john', mode: 'insensitive' } },
          { email: { contains: 'john', mode: 'insensitive' } },
        ],
      },
      include: { company: true },
    })

    expect(searchResults).toHaveLength(1)
    expect(searchResults[0].firstName).toBe('John')
    expect(searchResults[0].company?.name).toBe('Contact Test Company')
  })

  /**
   * Test 3: Deal Business Logic Integration
   * Tests deal creation and pipeline management through business logic
   */
  test('Deal Business Logic Integration', async () => {
    // Setup: Create company and contact
    const company = await prisma.company.create({
      data: {
        name: 'Deal Test Company',
        organizationId: testOrganizationId,
      },
    })

    const contact = await prisma.contact.create({
      data: {
        firstName: 'Deal',
        lastName: 'Contact',
        email: 'deal@example.com',
        companyId: company.id,
        organizationId: testOrganizationId,
      },
    })

    // Test deal creation with validation
    const dealData = {
      title: 'API Integration Deal',
      amount: 75000,
      stage: 'qualified' as const,
      probability: 60,
      expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      contactId: contact.id,
      companyId: company.id,
      ownerId: testUserId,
      organizationId: testOrganizationId,
    }

    // Sanitize and validate input
    const sanitizedInput = sanitizeDealInput(dealData)
    const validatedData = CreateDealSchema.parse(sanitizedInput)

    // Create deal through business logic
    const createdDeal = await prisma.deal.create({
      data: validatedData,
      include: { contact: true, company: true },
    })

    expect(createdDeal.title).toBe('API Integration Deal')
    expect(Number(createdDeal.amount)).toBe(75000)
    expect(createdDeal.stage).toBe('qualified')
    expect(createdDeal.contactId).toBe(contact.id)
    expect(createdDeal.companyId).toBe(company.id)
    expect(createdDeal.contact?.firstName).toBe('Deal')
    expect(createdDeal.company?.name).toBe('Deal Test Company')

    // Test deal retrieval with relationships
    const deals = await prisma.deal.findMany({
      where: { organizationId: testOrganizationId },
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

    expect(Array.isArray(deals)).toBe(true)
    expect(deals).toHaveLength(1)
    expect(deals[0].title).toBe('API Integration Deal')
    expect(deals[0].contact?.firstName).toBe('Deal')
    expect(deals[0].company?.name).toBe('Deal Test Company')
    expect(deals[0]._count.activities).toBe(0)

    // Test filtering by stage
    const filteredDeals = await prisma.deal.findMany({
      where: {
        organizationId: testOrganizationId,
        stage: 'qualified',
      },
    })

    expect(filteredDeals).toHaveLength(1)
    expect(filteredDeals[0].stage).toBe('qualified')

    // Test pipeline analytics
    const pipelineAnalysis = await prisma.deal.groupBy({
      by: ['stage'],
      where: { organizationId: testOrganizationId },
      _count: { id: true },
      _sum: { amount: true },
      _avg: { probability: true },
    })

    expect(pipelineAnalysis).toHaveLength(1)
    expect(pipelineAnalysis[0].stage).toBe('qualified')
    expect(pipelineAnalysis[0]._count.id).toBe(1)
    expect(Number(pipelineAnalysis[0]._sum.amount)).toBe(75000)
  })

  /**
   * Test 4: Activity Business Logic Integration
   * Tests activity creation and task management through business logic
   */
  test('Activity Business Logic Integration', async () => {
    // Setup: Create company, contact, and deal
    const company = await prisma.company.create({
      data: {
        name: 'Activity Test Company',
        organizationId: testOrganizationId,
      },
    })

    const contact = await prisma.contact.create({
      data: {
        firstName: 'Activity',
        lastName: 'Contact',
        email: 'activity@example.com',
        companyId: company.id,
        organizationId: testOrganizationId,
      },
    })

    const deal = await prisma.deal.create({
      data: {
        title: 'Activity Deal',
        amount: 50000,
        stage: 'proposal',
        contactId: contact.id,
        companyId: company.id,
        ownerId: testUserId,
        organizationId: testOrganizationId,
      },
    })

    // Test activity creation with validation
    const activityData = {
      type: 'call' as const,
      subject: 'API Integration Call',
      description: 'Testing activity creation through business logic',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      contactId: contact.id,
      dealId: deal.id,
      userId: testUserId,
      organizationId: testOrganizationId,
    }

    // Validate input
    const validatedData = CreateActivitySchema.parse(activityData)

    // Create activity through business logic
    const createdActivity = await prisma.activity.create({
      data: validatedData,
      include: { contact: true, deal: true },
    })

    expect(createdActivity.type).toBe('call')
    expect(createdActivity.subject).toBe('API Integration Call')
    expect(createdActivity.contactId).toBe(contact.id)
    expect(createdActivity.dealId).toBe(deal.id)
    expect(createdActivity.completed).toBe(false)
    expect(createdActivity.contact?.firstName).toBe('Activity')
    expect(createdActivity.deal?.title).toBe('Activity Deal')

    // Test activity retrieval with relationships
    const activities = await prisma.activity.findMany({
      where: { organizationId: testOrganizationId },
      include: { contact: true, deal: true },
      orderBy: { createdAt: 'desc' },
    })

    expect(Array.isArray(activities)).toBe(true)
    expect(activities).toHaveLength(1)
    expect(activities[0].subject).toBe('API Integration Call')
    expect(activities[0].contact?.firstName).toBe('Activity')
    expect(activities[0].deal?.title).toBe('Activity Deal')

    // Test filtering by type
    const filteredActivities = await prisma.activity.findMany({
      where: {
        organizationId: testOrganizationId,
        type: 'call',
      },
    })

    expect(filteredActivities).toHaveLength(1)
    expect(filteredActivities[0].type).toBe('call')

    // Test task completion
    const completedActivity = await prisma.activity.update({
      where: { id: createdActivity.id },
      data: { completed: true },
    })

    expect(completedActivity.completed).toBe(true)

    // Test overdue task identification
    const overdueActivity = await prisma.activity.create({
      data: {
        type: 'task',
        subject: 'Overdue Task',
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        userId: testUserId,
        organizationId: testOrganizationId,
      },
    })

    const overdueTasks = await prisma.activity.findMany({
      where: {
        organizationId: testOrganizationId,
        type: 'task',
        completed: false,
        dueDate: { lt: new Date() },
      },
    })

    expect(overdueTasks).toHaveLength(1)
    expect(overdueTasks[0].subject).toBe('Overdue Task')
  })

  /**
   * Test 5: Dashboard Metrics Integration
   * Tests dashboard metrics calculation through business logic
   */
  test('Dashboard Metrics Integration', async () => {
    // Setup: Create comprehensive test data
    const company = await prisma.company.create({
      data: {
        name: 'Dashboard Test Company',
        organizationId: testOrganizationId,
      },
    })

    const contacts = await Promise.all([
      prisma.contact.create({
        data: {
          firstName: 'Contact',
          lastName: 'One',
          email: 'contact1@dashboard.com',
          companyId: company.id,
          organizationId: testOrganizationId,
        },
      }),
      prisma.contact.create({
        data: {
          firstName: 'Contact',
          lastName: 'Two',
          email: 'contact2@dashboard.com',
          companyId: company.id,
          organizationId: testOrganizationId,
        },
      }),
    ])

    const deals = await Promise.all([
      prisma.deal.create({
        data: {
          title: 'Dashboard Deal 1',
          amount: 25000,
          stage: 'won',
          probability: 100,
          contactId: contacts[0].id,
          companyId: company.id,
          ownerId: testUserId,
          organizationId: testOrganizationId,
        },
      }),
      prisma.deal.create({
        data: {
          title: 'Dashboard Deal 2',
          amount: 50000,
          stage: 'proposal',
          probability: 70,
          contactId: contacts[1].id,
          companyId: company.id,
          ownerId: testUserId,
          organizationId: testOrganizationId,
        },
      }),
    ])

    await Promise.all([
      prisma.activity.create({
        data: {
          type: 'call',
          subject: 'Dashboard Call',
          completed: true,
          contactId: contacts[0].id,
          dealId: deals[0].id,
          userId: testUserId,
          organizationId: testOrganizationId,
        },
      }),
      prisma.activity.create({
        data: {
          type: 'task',
          subject: 'Dashboard Task',
          completed: false,
          dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Overdue
          dealId: deals[1].id,
          userId: testUserId,
          organizationId: testOrganizationId,
        },
      }),
    ])

    // Calculate dashboard metrics through business logic
    const [
      totalContacts,
      totalCompanies,
      totalDeals,
      totalRevenue,
      pipelineValue,
      totalActivities,
      completedActivities,
      overdueActivities,
      pipelineBreakdown,
    ] = await Promise.all([
      prisma.contact.count({ where: { organizationId: testOrganizationId } }),
      prisma.company.count({ where: { organizationId: testOrganizationId } }),
      prisma.deal.count({ where: { organizationId: testOrganizationId } }),
      prisma.deal.aggregate({
        where: { organizationId: testOrganizationId, stage: 'won' },
        _sum: { amount: true },
      }),
      prisma.deal.aggregate({
        where: { 
          organizationId: testOrganizationId, 
          stage: { notIn: ['won', 'lost'] },
        },
        _sum: { amount: true },
      }),
      prisma.activity.count({ where: { organizationId: testOrganizationId } }),
      prisma.activity.count({
        where: { organizationId: testOrganizationId, completed: true },
      }),
      prisma.activity.count({
        where: {
          organizationId: testOrganizationId,
          type: 'task',
          completed: false,
          dueDate: { lt: new Date() },
        },
      }),
      prisma.deal.groupBy({
        by: ['stage'],
        where: { organizationId: testOrganizationId },
        _count: { id: true },
        _sum: { amount: true },
      }),
    ])

    // Verify metrics
    expect(totalContacts).toBe(2)
    expect(totalCompanies).toBe(1)
    expect(totalDeals).toBe(2)
    expect(Number(totalRevenue._sum.amount)).toBe(25000) // Only won deals
    expect(Number(pipelineValue._sum.amount)).toBe(50000) // Active deals
    expect(totalActivities).toBe(2)
    expect(completedActivities).toBe(1)
    expect(overdueActivities).toBe(1)

    // Verify pipeline breakdown
    expect(Array.isArray(pipelineBreakdown)).toBe(true)
    expect(pipelineBreakdown).toHaveLength(2) // won and proposal stages

    const wonStage = pipelineBreakdown.find(stage => stage.stage === 'won')
    const proposalStage = pipelineBreakdown.find(stage => stage.stage === 'proposal')
    
    expect(wonStage?._count.id).toBe(1)
    expect(Number(wonStage?._sum.amount)).toBe(25000)
    expect(proposalStage?._count.id).toBe(1)
    expect(Number(proposalStage?._sum.amount)).toBe(50000)

    // Calculate conversion rate
    const closedDeals = await prisma.deal.count({
      where: {
        organizationId: testOrganizationId,
        stage: { in: ['won', 'lost'] },
      },
    })
    const wonDeals = await prisma.deal.count({
      where: { organizationId: testOrganizationId, stage: 'won' },
    })
    
    const conversionRate = closedDeals > 0 ? (wonDeals / closedDeals) * 100 : 0
    expect(conversionRate).toBe(100) // 1 won out of 1 closed deal
  })

  /**
   * Test 6: Validation and Error Handling Integration
   * Tests validation and error handling across business logic components
   */
  test('Validation and Error Handling Integration', async () => {
    // Test invalid contact creation
    expect(() => {
      const invalidContactData = {
        firstName: '', // Empty required field
        lastName: 'Test',
        email: 'invalid-email', // Invalid email format
        organizationId: testOrganizationId,
      }
      
      const sanitizedInput = sanitizeContactInput(invalidContactData)
      CreateContactSchema.parse(sanitizedInput)
    }).toThrow()

    // Test invalid deal creation
    expect(() => {
      const invalidDealData = {
        title: 'Invalid Deal',
        amount: -10000, // Negative amount should fail
        stage: 'invalid-stage', // Invalid stage
        organizationId: testOrganizationId,
      }
      
      const sanitizedInput = sanitizeDealInput(invalidDealData)
      CreateDealSchema.parse(sanitizedInput)
    }).toThrow()

    // Test duplicate email constraint
    const validContactData = {
      firstName: 'Test',
      lastName: 'User',
      email: 'duplicate@example.com',
      organizationId: testOrganizationId,
    }

    // Create first contact
    const sanitizedInput1 = sanitizeContactInput(validContactData)
    const validatedData1 = CreateContactSchema.parse(sanitizedInput1)
    
    await prisma.contact.create({
      data: validatedData1,
    })

    // Try to create duplicate contact (should be prevented by unique constraint)
    const sanitizedInput2 = sanitizeContactInput(validContactData)
    const validatedData2 = CreateContactSchema.parse(sanitizedInput2)

    await expect(
      prisma.contact.create({
        data: validatedData2,
      })
    ).rejects.toThrow()

    // Verify only valid data exists
    const totalContacts = await prisma.contact.count({
      where: { organizationId: testOrganizationId },
    })
    expect(totalContacts).toBe(1) // Only the first valid contact
  })
})