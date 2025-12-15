import { z } from 'zod';
import { DealStage, ActivityType, UserRole, CompanySize } from '@/types';

// Enum schemas
export const DealStageSchema = z.enum(['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']);

export const ActivityTypeSchema = z.enum(['call', 'email', 'meeting', 'task', 'note']);

export const UserRoleSchema = z.enum(['admin', 'user', 'manager']);

export const CompanySizeSchema = z.enum(['startup', 'small', 'medium', 'large', 'enterprise']);

// Base validation schemas
export const EmailSchema = z.string()
  .min(1, 'Email is required')
  .max(254, 'Email too long')
  .email('Invalid email format')
  .refine((email) => {
    // Additional email validation
    const parts = email.split('@')
    if (parts.length !== 2) return false
    
    const [localPart, domain] = parts
    
    // Local part validation
    if (localPart.length === 0 || localPart.length > 64) return false
    if (localPart.includes('..')) return false
    if (localPart.startsWith('.') || localPart.endsWith('.')) return false
    
    // Domain validation
    if (domain.length === 0 || domain.length > 253) return false
    if (domain.includes('..')) return false
    
    return true
  }, 'Invalid email format');

export const PhoneSchema = z.string()
  .regex(
    /^[\+]?[1-9][\d]{6,14}$/,
    'Invalid phone number format (7-15 digits, optional + prefix)'
  )
  .optional()
  .or(z.literal(''));

export const OrganizationIdSchema = z.string().min(1, 'Organization ID is required');

// Authentication validation schemas
export const loginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  email: EmailSchema,
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  organizationId: OrganizationIdSchema,
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// User validation schemas
export const CreateUserSchema = z.object({
  email: EmailSchema,
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  role: UserRoleSchema.default('user'),
  organizationId: OrganizationIdSchema,
});

export const UpdateUserSchema = CreateUserSchema.partial().omit({ organizationId: true });

// Company validation schemas
export const CreateCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required').max(255, 'Company name too long'),
  domain: z.string()
    .regex(
      /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
      'Invalid domain format (e.g., example.com or https://example.com)'
    )
    .optional()
    .or(z.literal('')),
  industry: z.string().max(100, 'Industry name too long').optional(),
  size: CompanySizeSchema.optional(),
  phone: PhoneSchema,
  address: z.string().max(500, 'Address too long').optional(),
  organizationId: OrganizationIdSchema,
});

export const UpdateCompanySchema = CreateCompanySchema.partial().omit({ organizationId: true }).extend({
  version: z.number().positive().optional(), // For optimistic locking
});

// Contact validation schemas
export const CreateContactSchema = z.object({
  firstName: z.string()
    .min(1, 'First name is required')
    .max(255, 'First name too long')
    .refine((name) => name.trim().length > 0, 'First name cannot be only whitespace')
    .transform((name) => name.trim().replace(/\s+/g, ' ')),
  lastName: z.string()
    .min(1, 'Last name is required')
    .max(255, 'Last name too long')
    .refine((name) => name.trim().length > 0, 'Last name cannot be only whitespace')
    .transform((name) => name.trim().replace(/\s+/g, ' ')),
  email: EmailSchema.transform((email) => email.toLowerCase().trim()),
  phone: PhoneSchema.transform((phone) => {
    if (!phone) return phone
    // Sanitize phone number
    const cleaned = phone.trim()
    if (cleaned.startsWith('+')) {
      return '+' + cleaned.slice(1).replace(/\D/g, '')
    }
    return cleaned.replace(/\D/g, '')
  }),
  jobTitle: z.string()
    .max(255, 'Job title too long')
    .optional()
    .transform((title) => title ? title.trim().replace(/\s+/g, ' ') : title),
  companyId: z.string().optional(),
  organizationId: OrganizationIdSchema,
});

export const UpdateContactSchema = CreateContactSchema.partial().omit({ organizationId: true }).extend({
  version: z.number().positive().optional(), // For optimistic locking
});

// Deal validation schemas
export const CreateDealSchema = z.object({
  title: z.string().min(1, 'Deal title is required').max(255, 'Deal title too long'),
  amount: z.number().positive('Amount must be positive').optional(),
  stage: DealStageSchema.default('lead'),
  probability: z.number().min(0, 'Probability cannot be negative').max(100, 'Probability cannot exceed 100').default(0),
  expectedCloseDate: z.date().optional(),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
  ownerId: z.string().min(1, 'Owner ID is required'),
  organizationId: OrganizationIdSchema,
});

export const UpdateDealSchema = CreateDealSchema.partial().omit({ organizationId: true, ownerId: true }).extend({
  version: z.number().positive().optional(), // For optimistic locking
});

// Activity validation schemas
export const CreateActivitySchema = z.object({
  type: ActivityTypeSchema,
  subject: z.string().min(1, 'Subject is required').max(255, 'Subject too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  dueDate: z.date().optional(),
  completed: z.boolean().default(false),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  userId: z.string().min(1, 'User ID is required'),
  organizationId: OrganizationIdSchema,
});

export const UpdateActivitySchema = CreateActivitySchema.partial().omit({ organizationId: true, userId: true }).extend({
  version: z.number().positive().optional(), // For optimistic locking
});

// Search and filter validation schemas
export const ContactFiltersSchema = z.object({
  search: z.string().optional(),
  companyId: z.string().optional(),
  organizationId: OrganizationIdSchema,
});

export const DealFiltersSchema = z.object({
  search: z.string().optional(),
  stage: DealStageSchema.optional(),
  ownerId: z.string().optional(),
  companyId: z.string().optional(),
  contactId: z.string().optional(),
  minAmount: z.number().positive().optional(),
  maxAmount: z.number().positive().optional(),
  organizationId: OrganizationIdSchema,
});

export const CompanyFiltersSchema = z.object({
  search: z.string().optional(),
  industry: z.string().optional(),
  size: CompanySizeSchema.optional(),
  organizationId: OrganizationIdSchema,
});

export const ActivityFiltersSchema = z.object({
  type: ActivityTypeSchema.optional(),
  completed: z.boolean().optional(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  userId: z.string().optional(),
  overdue: z.boolean().optional(),
  organizationId: OrganizationIdSchema,
});

// Pagination schema
export const PaginationSchema = z.object({
  page: z.number().positive().default(1),
  limit: z.number().positive().max(100).default(10),
});

// Date range filter schema
export const DateRangeFilterSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
}).refine(
  (data) => data.startDate <= data.endDate,
  {
    message: 'Start date must be before or equal to end date',
    path: ['startDate'],
  }
);

// API response validation schemas
export const ApiResponseSchema = <T>(dataSchema: z.ZodSchema<T>) => z.object({
  data: dataSchema.optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

export const PaginatedResponseSchema = <T>(dataSchema: z.ZodSchema<T>) => z.object({
  data: z.array(dataSchema),
  pagination: z.object({
    page: z.number().positive(),
    limit: z.number().positive(),
    total: z.number().nonnegative(),
    totalPages: z.number().nonnegative(),
  }),
});

// Type inference helpers
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type CreateCompanyInput = z.infer<typeof CreateCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof UpdateCompanySchema>;
export type CreateContactInput = z.infer<typeof CreateContactSchema>;
export type UpdateContactInput = z.infer<typeof UpdateContactSchema>;
export type CreateDealInput = z.infer<typeof CreateDealSchema>;
export type UpdateDealInput = z.infer<typeof UpdateDealSchema>;
export type CreateActivityInput = z.infer<typeof CreateActivitySchema>;
export type UpdateActivityInput = z.infer<typeof UpdateActivitySchema>;
export type ContactFilters = z.infer<typeof ContactFiltersSchema>;
export type DealFilters = z.infer<typeof DealFiltersSchema>;
export type CompanyFilters = z.infer<typeof CompanyFiltersSchema>;
export type ActivityFilters = z.infer<typeof ActivityFiltersSchema>;
export type PaginationParams = z.infer<typeof PaginationSchema>;
export type DateRangeFilter = z.infer<typeof DateRangeFilterSchema>;