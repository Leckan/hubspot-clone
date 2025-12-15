/**
 * Performance optimization utilities
 */

// Database query optimization helpers
export const QueryOptimizations = {
  // Optimized contact search with proper indexing
  contactSearch: {
    where: (organizationId: string, search?: string, companyId?: string) => {
      const where: any = { organizationId }
      
      if (search) {
        // Use indexed fields for better performance
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ]
      }
      
      if (companyId) {
        where.companyId = companyId
      }
      
      return where
    },
    
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      jobTitle: true,
      createdAt: true,
      company: {
        select: {
          id: true,
          name: true,
          domain: true,
        }
      },
      _count: {
        select: {
          deals: true,
          activities: true,
        }
      }
    }
  },

  // Optimized deal queries
  dealSearch: {
    where: (organizationId: string, filters: any = {}) => {
      const where: any = { organizationId }
      
      if (filters.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { contact: { 
            OR: [
              { firstName: { contains: filters.search, mode: 'insensitive' } },
              { lastName: { contains: filters.search, mode: 'insensitive' } },
              { email: { contains: filters.search, mode: 'insensitive' } }
            ]
          }},
          { company: { name: { contains: filters.search, mode: 'insensitive' } }}
        ]
      }
      
      if (filters.stage) where.stage = filters.stage
      if (filters.ownerId) where.ownerId = filters.ownerId
      if (filters.companyId) where.companyId = filters.companyId
      if (filters.contactId) where.contactId = filters.contactId
      
      if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
        where.amount = {}
        if (filters.minAmount !== undefined) where.amount.gte = filters.minAmount
        if (filters.maxAmount !== undefined) where.amount.lte = filters.maxAmount
      }
      
      return where
    },
    
    select: {
      id: true,
      title: true,
      amount: true,
      stage: true,
      probability: true,
      expectedCloseDate: true,
      createdAt: true,
      updatedAt: true,
      contact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        }
      },
      company: {
        select: {
          id: true,
          name: true,
          domain: true,
        }
      },
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      },
      _count: {
        select: {
          activities: true,
        }
      }
    }
  }
}

// Pagination helpers
export const PaginationHelpers = {
  calculateSkipTake: (page: number, limit: number) => ({
    skip: (page - 1) * limit,
    take: Math.min(limit, 100), // Cap at 100 items per page
  }),
  
  formatPaginationResponse: (data: any[], total: number, page: number, limit: number) => ({
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    }
  })
}

// Response optimization
export const ResponseOptimization = {
  // Remove sensitive fields from responses
  sanitizeUser: (user: any) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    // Exclude password, organizationId for security
  }),
  
  // Optimize contact response
  optimizeContact: (contact: any) => ({
    ...contact,
    fullName: `${contact.firstName} ${contact.lastName}`,
    // Pre-compute commonly used fields
  }),
  
  // Optimize deal response
  optimizeDeal: (deal: any) => ({
    ...deal,
    formattedAmount: deal.amount ? `$${Number(deal.amount).toLocaleString()}` : null,
    daysToClose: deal.expectedCloseDate 
      ? Math.ceil((new Date(deal.expectedCloseDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null,
  })
}

// Performance monitoring middleware
export function withPerformanceHeaders(response: Response, startTime: number): Response {
  const duration = Date.now() - startTime
  
  response.headers.set('X-Response-Time', `${duration}ms`)
  response.headers.set('X-Timestamp', new Date().toISOString())
  
  // Add performance warnings for slow responses
  if (duration > 1000) {
    response.headers.set('X-Performance-Warning', 'slow-response')
  }
  
  return response
}

// Database connection optimization
export const DatabaseOptimization = {
  // Connection pool settings for Prisma
  connectionPoolSettings: {
    // These would be set in DATABASE_URL or prisma configuration
    connectionLimit: 10,
    poolTimeout: 60000,
    idleTimeout: 600000,
  },
  
  // Query timeout settings
  queryTimeout: 30000, // 30 seconds
  
  // Batch operations for better performance
  batchSize: 100,
}

// Client-side performance helpers
export const ClientOptimization = {
  // Debounce search inputs
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout
    return (...args: Parameters<T>) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), wait)
    }
  },
  
  // Throttle API calls
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args)
        inThrottle = true
        setTimeout(() => inThrottle = false, limit)
      }
    }
  },
  
  // Lazy loading helper
  createIntersectionObserver: (callback: () => void, threshold = 0.1) => {
    if (typeof window === 'undefined') return null
    
    return new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            callback()
          }
        })
      },
      { threshold }
    )
  }
}