import { DealStage, ActivityType, UserRole, CompanySize } from '@/types';

// Type guard functions for runtime type checking

export function isDealStage(value: string): value is DealStage {
  return ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'].includes(value);
}

export function isActivityType(value: string): value is ActivityType {
  return ['call', 'email', 'meeting', 'task', 'note'].includes(value);
}

export function isUserRole(value: string): value is UserRole {
  return ['admin', 'user', 'manager'].includes(value);
}

export function isCompanySize(value: string): value is CompanySize {
  return ['startup', 'small', 'medium', 'large', 'enterprise'].includes(value);
}

// Utility functions for type conversions and validations

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Deal stage progression helpers
export function getNextDealStage(currentStage: DealStage): DealStage | null {
  const stageProgression: Record<DealStage, DealStage | null> = {
    lead: 'qualified',
    qualified: 'proposal',
    proposal: 'negotiation',
    negotiation: 'won', // or 'lost'
    won: null,
    lost: null,
  };
  
  return stageProgression[currentStage];
}

export function getPreviousDealStage(currentStage: DealStage): DealStage | null {
  const stageRegression: Record<DealStage, DealStage | null> = {
    lead: null,
    qualified: 'lead',
    proposal: 'qualified',
    negotiation: 'proposal',
    won: 'negotiation',
    lost: 'negotiation',
  };
  
  return stageRegression[currentStage];
}

export function isClosedDealStage(stage: DealStage): boolean {
  return stage === 'won' || stage === 'lost';
}

export function isActiveDealStage(stage: DealStage): boolean {
  return !isClosedDealStage(stage);
}

// Activity helpers
export function isTaskActivity(type: ActivityType): boolean {
  return type === 'task';
}

export function isOverdue(dueDate: Date | null | undefined): boolean {
  if (!dueDate) return false;
  return new Date() > dueDate;
}

// Utility for safe property access
export function hasProperty<T extends object, K extends PropertyKey>(
  obj: T,
  prop: K
): obj is T & Record<K, unknown> {
  return prop in obj;
}

// Generic type assertion helper
export function assertType<T>(value: unknown, typeName: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(`Expected ${typeName}, got ${value}`);
  }
}

// Safe JSON parsing with type validation
export function safeJsonParse<T>(
  json: string,
  validator: (value: unknown) => value is T
): T | null {
  try {
    const parsed = JSON.parse(json);
    return validator(parsed) ? parsed : null;
  } catch {
    return null;
  }
}