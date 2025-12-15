/**
 * Integration Tests for End-to-End Workflows
 * Tests complete user workflows and cross-component interactions
 * Validates: All requirements integration - End-to-end scenarios
 */

import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { CreateContactSchema, CreateDealSchema, CreateCompanySchema, CreateActivitySchema } from '@/lib/validations'
import { sanitizeContactInput, sanitizeDealInput, sanitizeCompanyInput } from '@/lib/sanitization'

// Test data setup
const testOrganizationId = 'e2e-test-org-123'
const testUserId = 'e2e-test-user-123'

describe('End-to-End Workflows Integration Tests', () => {
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
        email: 'e2e@example.com',
        name: 'E2E Test User',
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
   * Test 1: Sales Representative Daily Workflow
   * Simulates a complete day in the life of a sales representative
   */
  test('Sales Representative Daily Workflow', async () => {
    // Morning: Review dashboard and overdue tasks
    const initialDashboard = await Promise.all([
      prisma.contact.count({ where: { organizationId: testOrganizationId } }),
      prisma.deal.count({ where: { organizationId: testOrganizationId } }),
      prisma.activity.count({
        where: {
          organizationId: testOrganizationId,
          type: 'task',
          completed: false,
          dueDate: { lt: new Date() },
        },
      }),
    ])

    expect(initialDashboard[0]).toBe(0) // No contacts initially
    expect(initialDashboard[1]).toBe(0) // No deals initially
    expect(initialDashboard[2]).toBe(0) // No overdue tasks initially

    // 9 AM: Add new prospect company
    const companyInput = {
      name: 'Prospect Industries',
      domain: 'prospect.com',
      industry: 'Manufacturing',
      size: 'large' as const,
      organizationId: testOrganizationId,
    }

    const sanitizedCompanyInput = sanitizeCompanyInput(companyInput)
    const validatedCompanyData = CreateCompanySchema.parse(sanitizedCompanyInput)

    const company = await prisma.company.create({
      data: validatedCompanyData,
    })

    // 9:15 AM: Add contact from the company
    const contactInput = {
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah.johnson@prospect.com',
      phone: '+15551234567',
      jobTitle: 'VP of Operations',
      companyId: company.id,
      organizationId: testOrganizationId,
    }

    const sanitizedContactInput = sanitizeContactInput(contactInput)
    const validatedContactData = CreateContactSchema.parse(sanitizedContactInput)

    const contact = await prisma.contact.create({
      data: validatedContactData,
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

    expect(contact.company?.name).toBe('Prospect Industries')
    expect(contact._count.deals).toBe(0)
    expect(contact._count.activities).toBe(0)

    // 10 AM: Schedule initial call
    const callActivity = await prisma.activity.create({
      data: {
        type: 'call',
        subject: 'Initial Discovery Call',
        description: 'Discuss current challenges and potential solutions',
        dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        contactId: contact.id,
        userId: testUserId,
        organizationId: testOrganizationId,
      },
    })

    // 12 PM: Complete the call and create deal
    await prisma.activity.update({
      where: { id: callActivity.id },
      data: { completed: true },
    })

    const dealInput = {
      title: 'Manufacturing Process Optimization',
      amount: 75000,
      stage: 'qualified' as const,
      probability: 30,
      expectedCloseDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days
      contactId: contact.id,
      companyId: company.id,
      ownerId: testUserId,
      organizationId: testOrganizationId,
    }

    const sanitizedDealInput = sanitizeDealInput(dealInput)
    const validatedDealData = CreateDealSchema.parse(sanitizedDealInput)

    const deal = await prisma.deal.create({
      data: validatedDealData,
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

    expect(deal.contact?.email).toBe('sarah.johnson@prospect.com')
    expect(deal.company?.name).toBe('Prospect Industries')
    expect(deal._count.activities).toBe(0) // No activities directly on deal yet

    // 2 PM: Schedule follow-up meeting
    const meetingActivity = await prisma.activity.create({
      data: {
        type: 'meeting',
        subject: 'Technical Requirements Review',
        description: 'Deep dive into technical requirements and implementation timeline',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
        contactId: contact.id,
        dealId: deal.id,
        userId: testUserId,
        organizationId: testOrganizationId,
      },
    })

    // 3 PM: Create follow-up task
    const taskActivity = await prisma.activity.create({
      data: {
        type: 'task',
        subject: 'Send proposal document',
        description: 'Prepare and send detailed proposal based on discovery call',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
        dealId: deal.id,
        userId: testUserId,
        organizationId: testOrganizationId,
      },
    })

    // End of day: Review updated dashboard
    const endOfDayDashboard = await Promise.all([
      prisma.contact.count({ where: { organizationId: testOrganizationId } }),
      prisma.company.count({ where: { organizationId: testOrganizationId } }),
      prisma.deal.count({ where: { organizationId: testOrganizationId } }),
      prisma.activity.count({ where: { organizationId: testOrganizationId } }),
      prisma.activity.count({
        where: {
          organizationId: testOrganizationId,
          completed: true,
        },
      }),
      prisma.deal.aggregate({
        where: { organizationId: testOrganizationId },
        _sum: { amount: true },
        _avg: { amount: true },
      }),
    ])

    expect(endOfDayDashboard[0]).toBe(1) // 1 contact
    expect(endOfDayDashboard[1]).toBe(1) // 1 company
    expect(endOfDayDashboard[2]).toBe(1) // 1 deal
    expect(endOfDayDashboard[3]).toBe(3) // 3 activities total
    expect(endOfDayDashboard[4]).toBe(1) // 1 completed activity
    expect(Number(endOfDayDashboard[5]._sum.amount)).toBe(75000) // Total pipeline value
    expect(Number(endOfDayDashboard[5]._avg.amount)).toBe(75000) // Average deal size

    // Verify cross-component relationships
    const contactWithUpdatedCounts = await prisma.contact.findFirst({
      where: { id: contact.id },
      include: {
        _count: {
          select: {
            deals: true,
            activities: true,
          },
        },
      },
    })

    expect(contactWithUpdatedCounts?._count.deals).toBe(1)
    expect(contactWithUpdatedCounts?._count.activities).toBe(2) // Call and meeting

    const dealWithUpdatedCounts = await prisma.deal.findFirst({
      where: { id: deal.id },
      include: {
        _count: {
          select: {
            activities: true,
          },
        },
      },
    })

    expect(dealWithUpdatedCounts?._count.activities).toBe(2) // Meeting and task
  })

  /**
   * Test 2: Sales Manager Pipeline Review Workflow
   * Simulates a sales manager reviewing and managing the pipeline
   */
  test('Sales Manager Pipeline Review Workflow', async () => {
    // Setup: Create multiple deals in different stages
    const companies = await Promise.all([
      prisma.company.create({
        data: {
          name: 'Alpha Corp',
          organizationId: testOrganizationId,
        },
      }),
      prisma.company.create({
        data: {
          name: 'Beta Industries',
          organizationId: testOrganizationId,
        },
      }),
      prisma.company.create({
        data: {
          name: 'Gamma Solutions',
          organizationId: testOrganizationId,
        },
      }),
    ])

    const contacts = await Promise.all([
      prisma.contact.create({
        data: {
          firstName: 'Alice',
          lastName: 'Alpha',
          email: 'alice@alpha.com',
          companyId: companies[0].id,
          organizationId: testOrganizationId,
        },
      }),
      prisma.contact.create({
        data: {
          firstName: 'Bob',
          lastName: 'Beta',
          email: 'bob@beta.com',
          companyId: companies[1].id,
          organizationId: testOrganizationId,
        },
      }),
      prisma.contact.create({
        data: {
          firstName: 'Charlie',
          lastName: 'Gamma',
          email: 'charlie@gamma.com',
          companyId: companies[2].id,
          organizationId: testOrganizationId,
        },
      }),
    ])

    const deals = await Promise.all([
      prisma.deal.create({
        data: {
          title: 'Alpha Enterprise Deal',
          amount: 100000,
          stage: 'proposal',
          probability: 60,
          contactId: contacts[0].id,
          companyId: companies[0].id,
          ownerId: testUserId,
          organizationId: testOrganizationId,
        },
      }),
      prisma.deal.create({
        data: {
          title: 'Beta Starter Package',
          amount: 25000,
          stage: 'negotiation',
          probability: 80,
          contactId: contacts[1].id,
          companyId: companies[1].id,
          ownerId: testUserId,
          organizationId: testOrganizationId,
        },
      }),
      prisma.deal.create({
        data: {
          title: 'Gamma Custom Solution',
          amount: 150000,
          stage: 'qualified',
          probability: 40,
          contactId: contacts[2].id,
          companyId: companies[2].id,
          ownerId: testUserId,
          organizationId: testOrganizationId,
        },
      }),
    ])

    // Manager Review: Analyze pipeline by stage
    const pipelineAnalysis = await prisma.deal.groupBy({
      by: ['stage'],
      where: { organizationId: testOrganizationId },
      _count: { id: true },
      _sum: { amount: true },
      _avg: { probability: true },
    })

    expect(pipelineAnalysis).toHaveLength(3) // 3 different stages
    
    const stageMap = pipelineAnalysis.reduce((acc, stage) => {
      acc[stage.stage] = {
        count: stage._count.id,
        totalValue: Number(stage._sum.amount || 0),
        avgProbability: Number(stage._avg.probability || 0),
      }
      return acc
    }, {} as Record<string, any>)

    expect(stageMap.proposal.count).toBe(1)
    expect(stageMap.proposal.totalValue).toBe(100000)
    expect(stageMap.negotiation.count).toBe(1)
    expect(stageMap.negotiation.totalValue).toBe(25000)
    expect(stageMap.qualified.count).toBe(1)
    expect(stageMap.qualified.totalValue).toBe(150000)

    // Manager Action: Move high-probability deal to won
    await prisma.deal.update({
      where: { id: deals[1].id }, // Beta deal with 80% probability
      data: {
        stage: 'won',
        probability: 100,
      },
    })

    // Manager Action: Move low-performing deal to lost
    await prisma.deal.update({
      where: { id: deals[2].id }, // Gamma deal with 40% probability
      data: {
        stage: 'lost',
        probability: 0,
      },
    })

    // Review updated pipeline metrics
    const updatedMetrics = await Promise.all([
      prisma.deal.count({
        where: { organizationId: testOrganizationId, stage: 'won' },
      }),
      prisma.deal.count({
        where: { organizationId: testOrganizationId, stage: 'lost' },
      }),
      prisma.deal.aggregate({
        where: { organizationId: testOrganizationId, stage: 'won' },
        _sum: { amount: true },
      }),
      prisma.deal.count({
        where: {
          organizationId: testOrganizationId,
          stage: { in: ['won', 'lost'] },
        },
      }),
    ])

    const wonDeals = updatedMetrics[0]
    const lostDeals = updatedMetrics[1]
    const wonRevenue = Number(updatedMetrics[2]._sum.amount || 0)
    const totalClosedDeals = updatedMetrics[3]

    expect(wonDeals).toBe(1)
    expect(lostDeals).toBe(1)
    expect(wonRevenue).toBe(25000)
    
    const conversionRate = totalClosedDeals > 0 ? (wonDeals / totalClosedDeals) * 100 : 0
    expect(conversionRate).toBe(50) // 1 won out of 2 closed deals

    // Verify remaining active pipeline
    const activePipeline = await prisma.deal.findMany({
      where: {
        organizationId: testOrganizationId,
        stage: { notIn: ['won', 'lost'] },
      },
      include: {
        contact: true,
        company: true,
      },
    })

    expect(activePipeline).toHaveLength(1) // Only Alpha deal remains active
    expect(activePipeline[0].title).toBe('Alpha Enterprise Deal')
    expect(activePipeline[0].stage).toBe('proposal')
  })

  /**
   * Test 3: Customer Onboarding and Activity Management Workflow
   * Simulates the complete customer onboarding process with activity tracking
   */
  test('Customer Onboarding and Activity Management Workflow', async () => {
    // Setup: Won deal that needs onboarding
    const company = await prisma.company.create({
      data: {
        name: 'Onboarding Corp',
        domain: 'onboarding.com',
        organizationId: testOrganizationId,
      },
    })

    const contact = await prisma.contact.create({
      data: {
        firstName: 'David',
        lastName: 'Onboard',
        email: 'david@onboarding.com',
        jobTitle: 'Implementation Manager',
        companyId: company.id,
        organizationId: testOrganizationId,
      },
    })

    const deal = await prisma.deal.create({
      data: {
        title: 'Onboarding Implementation',
        amount: 50000,
        stage: 'won',
        probability: 100,
        contactId: contact.id,
        companyId: company.id,
        ownerId: testUserId,
        organizationId: testOrganizationId,
      },
    })

    // Week 1: Initial onboarding activities
    const onboardingActivities = await Promise.all([
      prisma.activity.create({
        data: {
          type: 'call',
          subject: 'Kickoff Call',
          description: 'Project kickoff and timeline review',
          dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
          contactId: contact.id,
          dealId: deal.id,
          userId: testUserId,
          organizationId: testOrganizationId,
        },
      }),
      prisma.activity.create({
        data: {
          type: 'task',
          subject: 'Send welcome package',
          description: 'Send onboarding materials and access credentials',
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          dealId: deal.id,
          userId: testUserId,
          organizationId: testOrganizationId,
        },
      }),
      prisma.activity.create({
        data: {
          type: 'meeting',
          subject: 'Technical Setup Session',
          description: 'Configure system and train users',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          contactId: contact.id,
          dealId: deal.id,
          userId: testUserId,
          organizationId: testOrganizationId,
        },
      }),
    ])

    // Complete activities as they happen
    await prisma.activity.update({
      where: { id: onboardingActivities[0].id },
      data: { completed: true },
    })

    await prisma.activity.update({
      where: { id: onboardingActivities[1].id },
      data: { completed: true },
    })

    // Week 2: Follow-up activities
    const followUpActivities = await Promise.all([
      prisma.activity.create({
        data: {
          type: 'call',
          subject: 'Progress Check-in',
          description: 'Review implementation progress and address issues',
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          contactId: contact.id,
          dealId: deal.id,
          userId: testUserId,
          organizationId: testOrganizationId,
        },
      }),
      prisma.activity.create({
        data: {
          type: 'task',
          subject: 'Schedule training sessions',
          description: 'Coordinate user training for all departments',
          dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          dealId: deal.id,
          userId: testUserId,
          organizationId: testOrganizationId,
        },
      }),
    ])

    // Analyze activity completion and timeline
    const activityAnalysis = await Promise.all([
      prisma.activity.count({
        where: {
          organizationId: testOrganizationId,
          dealId: deal.id,
        },
      }),
      prisma.activity.count({
        where: {
          organizationId: testOrganizationId,
          dealId: deal.id,
          completed: true,
        },
      }),
      prisma.activity.count({
        where: {
          organizationId: testOrganizationId,
          dealId: deal.id,
          dueDate: { lt: new Date() },
          completed: false,
        },
      }),
      prisma.activity.findMany({
        where: {
          organizationId: testOrganizationId,
          dealId: deal.id,
        },
        include: {
          contact: true,
          deal: true,
        },
        orderBy: {
          dueDate: 'asc',
        },
      }),
    ])

    const totalActivities = activityAnalysis[0]
    const completedActivities = activityAnalysis[1]
    const overdueActivities = activityAnalysis[2]
    const allActivities = activityAnalysis[3]

    expect(totalActivities).toBe(5) // 3 initial + 2 follow-up
    expect(completedActivities).toBe(2) // Kickoff call and welcome package
    expect(overdueActivities).toBe(0) // No overdue activities yet

    // Verify activity timeline and associations
    expect(allActivities.every(a => a.dealId === deal.id)).toBe(true)
    expect(allActivities.filter(a => a.contactId === contact.id)).toHaveLength(3) // 3 activities with contact
    expect(allActivities.filter(a => a.contactId === null)).toHaveLength(2) // 2 tasks without contact

    // Calculate completion rate
    const completionRate = totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0
    expect(completionRate).toBe(40) // 2 out of 5 completed

    // Verify deal and contact activity counts
    const dealWithCounts = await prisma.deal.findFirst({
      where: { id: deal.id },
      include: {
        _count: {
          select: {
            activities: true,
          },
        },
      },
    })

    const contactWithCounts = await prisma.contact.findFirst({
      where: { id: contact.id },
      include: {
        _count: {
          select: {
            activities: true,
          },
        },
      },
    })

    expect(dealWithCounts?._count.activities).toBe(5)
    expect(contactWithCounts?._count.activities).toBe(3)
  })

  /**
   * Test 4: Multi-User Organization Data Isolation
   * Tests that data is properly isolated between organizations
   */
  test('Multi-User Organization Data Isolation', async () => {
    // Create second organization and user
    const secondOrgId = 'second-org-456'
    const secondUserId = 'second-user-456'

    const hashedPassword = await bcrypt.hash('testpassword123', 12)
    const secondUser = await prisma.user.create({
      data: {
        id: secondUserId,
        email: 'second@example.com',
        name: 'Second User',
        password: hashedPassword,
        organizationId: secondOrgId,
        role: 'user',
      },
    })

    // Create data in first organization
    const firstOrgCompany = await prisma.company.create({
      data: {
        name: 'First Org Company',
        organizationId: testOrganizationId,
      },
    })

    const firstOrgContact = await prisma.contact.create({
      data: {
        firstName: 'First',
        lastName: 'User',
        email: 'first@firstorg.com',
        companyId: firstOrgCompany.id,
        organizationId: testOrganizationId,
      },
    })

    // Create data in second organization
    const secondOrgCompany = await prisma.company.create({
      data: {
        name: 'Second Org Company',
        organizationId: secondOrgId,
      },
    })

    const secondOrgContact = await prisma.contact.create({
      data: {
        firstName: 'Second',
        lastName: 'User',
        email: 'second@secondorg.com',
        companyId: secondOrgCompany.id,
        organizationId: secondOrgId,
      },
    })

    // Verify data isolation - first org should only see its data
    const firstOrgData = await Promise.all([
      prisma.company.findMany({ where: { organizationId: testOrganizationId } }),
      prisma.contact.findMany({ where: { organizationId: testOrganizationId } }),
    ])

    expect(firstOrgData[0]).toHaveLength(1)
    expect(firstOrgData[0][0].name).toBe('First Org Company')
    expect(firstOrgData[1]).toHaveLength(1)
    expect(firstOrgData[1][0].email).toBe('first@firstorg.com')

    // Verify data isolation - second org should only see its data
    const secondOrgData = await Promise.all([
      prisma.company.findMany({ where: { organizationId: secondOrgId } }),
      prisma.contact.findMany({ where: { organizationId: secondOrgId } }),
    ])

    expect(secondOrgData[0]).toHaveLength(1)
    expect(secondOrgData[0][0].name).toBe('Second Org Company')
    expect(secondOrgData[1]).toHaveLength(1)
    expect(secondOrgData[1][0].email).toBe('second@secondorg.com')

    // Verify cross-organization queries return empty results
    const crossOrgQueries = await Promise.all([
      prisma.contact.findMany({
        where: {
          organizationId: testOrganizationId,
          companyId: secondOrgCompany.id, // Wrong org company
        },
      }),
      prisma.contact.findMany({
        where: {
          organizationId: secondOrgId,
          companyId: firstOrgCompany.id, // Wrong org company
        },
      }),
    ])

    expect(crossOrgQueries[0]).toHaveLength(0)
    expect(crossOrgQueries[1]).toHaveLength(0)

    // Clean up second organization data
    await prisma.contact.deleteMany({ where: { organizationId: secondOrgId } })
    await prisma.company.deleteMany({ where: { organizationId: secondOrgId } })
    await prisma.user.deleteMany({ where: { organizationId: secondOrgId } })
  })

  /**
   * Test 5: Performance and Scalability Simulation
   * Tests system behavior with larger datasets
   */
  test('Performance and Scalability Simulation', async () => {
    // Create base company
    const company = await prisma.company.create({
      data: {
        name: 'Scale Test Company',
        organizationId: testOrganizationId,
      },
    })

    // Create multiple contacts in batches
    const contactBatches = []
    for (let batch = 0; batch < 3; batch++) {
      const batchContacts = Array.from({ length: 10 }, (_, i) => ({
        firstName: `Contact${batch * 10 + i}`,
        lastName: 'ScaleTest',
        email: `contact${batch * 10 + i}@scale.com`,
        companyId: company.id,
        organizationId: testOrganizationId,
      }))

      contactBatches.push(
        prisma.contact.createMany({
          data: batchContacts,
        })
      )
    }

    await Promise.all(contactBatches)

    // Verify all contacts were created
    const totalContacts = await prisma.contact.count({
      where: { organizationId: testOrganizationId },
    })
    expect(totalContacts).toBe(30)

    // Get all contacts for deal creation
    const allContacts = await prisma.contact.findMany({
      where: { organizationId: testOrganizationId },
    })

    // Create deals for subset of contacts
    const dealCreations = allContacts.slice(0, 15).map((contact, i) =>
      prisma.deal.create({
        data: {
          title: `Scale Deal ${i}`,
          amount: 5000 + (i * 1000),
          stage: ['lead', 'qualified', 'proposal'][i % 3] as any,
          probability: 10 + (i * 5),
          contactId: contact.id,
          companyId: company.id,
          ownerId: testUserId,
          organizationId: testOrganizationId,
        },
      })
    )

    await Promise.all(dealCreations)

    // Test pagination and filtering performance
    const paginatedContacts = await prisma.contact.findMany({
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
      orderBy: { createdAt: 'desc' },
      take: 10,
      skip: 0,
    })

    expect(paginatedContacts).toHaveLength(10)
    expect(paginatedContacts.every(c => c.company !== null)).toBe(true)

    // Test search performance
    const searchResults = await prisma.contact.findMany({
      where: {
        organizationId: testOrganizationId,
        OR: [
          { firstName: { contains: 'Contact1', mode: 'insensitive' } },
          { lastName: { contains: 'ScaleTest', mode: 'insensitive' } },
        ],
      },
    })

    expect(searchResults.length).toBeGreaterThan(0)
    expect(searchResults.length).toBeLessThanOrEqual(30)

    // Test aggregation performance
    const aggregations = await Promise.all([
      prisma.deal.groupBy({
        by: ['stage'],
        where: { organizationId: testOrganizationId },
        _count: { id: true },
        _sum: { amount: true },
        _avg: { amount: true },
      }),
      prisma.contact.aggregate({
        where: { organizationId: testOrganizationId },
        _count: { id: true },
      }),
      prisma.deal.aggregate({
        where: { organizationId: testOrganizationId },
        _sum: { amount: true },
        _avg: { amount: true },
        _count: { id: true },
      }),
    ])

    const dealsByStage = aggregations[0]
    const contactStats = aggregations[1]
    const dealStats = aggregations[2]

    expect(dealsByStage.length).toBeGreaterThan(0)
    expect(contactStats._count.id).toBe(30)
    expect(dealStats._count.id).toBe(15)
    expect(Number(dealStats._sum.amount)).toBeGreaterThan(0)
    expect(Number(dealStats._avg.amount)).toBeGreaterThan(0)

    // Verify data consistency after bulk operations
    const finalConsistencyCheck = await Promise.all([
      prisma.contact.count({ where: { organizationId: testOrganizationId } }),
      prisma.deal.count({ where: { organizationId: testOrganizationId } }),
      prisma.company.count({ where: { organizationId: testOrganizationId } }),
    ])

    expect(finalConsistencyCheck[0]).toBe(30) // All contacts
    expect(finalConsistencyCheck[1]).toBe(15) // All deals
    expect(finalConsistencyCheck[2]).toBe(1) // One company
  })
})