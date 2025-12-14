// Core data model interfaces based on Prisma schema

export interface User {
  id: string;
  email: string;
  name: string;
  password?: string;
  role: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Company {
  id: string;
  name: string;
  domain?: string;
  industry?: string;
  size?: string;
  phone?: string;
  address?: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  contacts?: Contact[];
  deals?: Deal[];
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  companyId?: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  company?: Company;
  deals?: Deal[];
  activities?: Activity[];
}

export interface Deal {
  id: string;
  title: string;
  amount?: number;
  stage: DealStage;
  probability: number;
  expectedCloseDate?: Date;
  contactId?: string;
  companyId?: string;
  ownerId: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  contact?: Contact;
  company?: Company;
  owner?: User;
  activities?: Activity[];
}

export interface Activity {
  id: string;
  type: ActivityType;
  subject: string;
  description?: string;
  dueDate?: Date;
  completed: boolean;
  contactId?: string;
  dealId?: string;
  userId: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
  contact?: Contact;
  deal?: Deal;
  user?: User;
}

// Enum types for deal stages and activity types
export type DealStage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';

export type ActivityType = 'call' | 'email' | 'meeting' | 'task' | 'note';

export type UserRole = 'admin' | 'user' | 'manager';

export type CompanySize = 'startup' | 'small' | 'medium' | 'large' | 'enterprise';

// Input/Create types (without generated fields)
export interface CreateUserInput {
  email: string;
  name: string;
  password?: string;
  role?: string;
  organizationId: string;
}

export interface CreateCompanyInput {
  name: string;
  domain?: string;
  industry?: string;
  size?: string;
  phone?: string;
  address?: string;
  organizationId: string;
}

export interface CreateContactInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  companyId?: string;
  organizationId: string;
}

export interface CreateDealInput {
  title: string;
  amount?: number;
  stage?: DealStage;
  probability?: number;
  expectedCloseDate?: Date;
  contactId?: string;
  companyId?: string;
  ownerId: string;
  organizationId: string;
}

export interface CreateActivityInput {
  type: ActivityType;
  subject: string;
  description?: string;
  dueDate?: Date;
  completed?: boolean;
  contactId?: string;
  dealId?: string;
  userId: string;
  organizationId: string;
}

// Update types (partial inputs)
export interface UpdateUserInput extends Partial<Omit<CreateUserInput, 'organizationId'>> {}

export interface UpdateCompanyInput extends Partial<Omit<CreateCompanyInput, 'organizationId'>> {}

export interface UpdateContactInput extends Partial<Omit<CreateContactInput, 'organizationId'>> {}

export interface UpdateDealInput extends Partial<Omit<CreateDealInput, 'organizationId' | 'ownerId'>> {}

export interface UpdateActivityInput extends Partial<Omit<CreateActivityInput, 'organizationId' | 'userId'>> {}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Search and filter types
export interface ContactFilters {
  search?: string;
  companyId?: string;
  organizationId: string;
}

export interface DealFilters {
  search?: string;
  stage?: DealStage;
  ownerId?: string;
  companyId?: string;
  contactId?: string;
  minAmount?: number;
  maxAmount?: number;
  organizationId: string;
}

export interface CompanyFilters {
  search?: string;
  industry?: string;
  size?: string;
  organizationId: string;
}

export interface ActivityFilters {
  type?: ActivityType;
  completed?: boolean;
  contactId?: string;
  dealId?: string;
  userId?: string;
  overdue?: boolean;
  organizationId: string;
}

// Dashboard and analytics types
export interface DashboardMetrics {
  totalContacts: number;
  totalCompanies: number;
  totalDeals: number;
  totalRevenue: number;
  wonDeals: number;
  lostDeals: number;
  conversionRate: number;
  averageDealSize: number;
  activeTasks: number;
  overdueTasks: number;
}

export interface PipelineAnalytics {
  stage: DealStage;
  dealCount: number;
  totalValue: number;
  averageValue: number;
  conversionRate: number;
}

export interface DateRangeFilter {
  startDate: Date;
  endDate: Date;
}