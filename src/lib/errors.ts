/**
 * Centralized error handling system for the CRM application
 * Provides consistent error types, logging, and response formatting
 */

import { ZodError } from "zod"
import { Prisma } from "@prisma/client"

// Error types for different categories of errors
export enum ErrorType {
  VALIDATION = "VALIDATION",
  AUTHENTICATION = "AUTHENTICATION", 
  AUTHORIZATION = "AUTHORIZATION",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  DATABASE = "DATABASE",
  NETWORK = "NETWORK",
  INTERNAL = "INTERNAL",
  RATE_LIMIT = "RATE_LIMIT"
}

// Base error class with structured information
export class AppError extends Error {
  public readonly type: ErrorType
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly details?: any
  public readonly timestamp: Date

  constructor(
    message: string,
    type: ErrorType,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: any
  ) {
    super(message)
    this.type = type
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.details = details
    this.timestamp = new Date()
    
    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor)
  }
}

// Specific error classes for common scenarios
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorType.VALIDATION, 400, true, details)
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, ErrorType.AUTHENTICATION, 401, true)
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Insufficient permissions") {
    super(message, ErrorType.AUTHORIZATION, 403, true)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, ErrorType.NOT_FOUND, 404, true)
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorType.CONFLICT, 409, true, details)
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super(message, ErrorType.DATABASE, 500, true, details)
  }
}

// Error logging interface
export interface ErrorLog {
  id: string
  timestamp: Date
  type: ErrorType
  message: string
  statusCode: number
  stack?: string
  details?: any
  userId?: string
  organizationId?: string
  requestId?: string
  userAgent?: string
  ip?: string
}

// Error logger class
export class ErrorLogger {
  private static logs: ErrorLog[] = []

  static log(error: Error | AppError, context?: {
    userId?: string
    organizationId?: string
    requestId?: string
    userAgent?: string
    ip?: string
  }): void {
    const errorLog: ErrorLog = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      type: error instanceof AppError ? error.type : ErrorType.INTERNAL,
      message: error.message,
      statusCode: error instanceof AppError ? error.statusCode : 500,
      stack: error.stack,
      details: error instanceof AppError ? error.details : undefined,
      ...context
    }

    // Store in memory (in production, this would go to a proper logging service)
    this.logs.push(errorLog)

    // Console logging for development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', errorLog)
    }

    // In production, send to external logging service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to external logging service (e.g., Sentry, LogRocket, etc.)
      this.sendToExternalService(errorLog)
    }
  }

  private static sendToExternalService(errorLog: ErrorLog): void {
    // Placeholder for external logging service integration
    // In a real application, this would send to services like:
    // - Sentry
    // - LogRocket
    // - DataDog
    // - CloudWatch
    console.log('Would send to external logging service:', errorLog)
  }

  static getLogs(filters?: {
    type?: ErrorType
    userId?: string
    organizationId?: string
    startDate?: Date
    endDate?: Date
  }): ErrorLog[] {
    let filteredLogs = this.logs

    if (filters) {
      if (filters.type) {
        filteredLogs = filteredLogs.filter(log => log.type === filters.type)
      }
      if (filters.userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === filters.userId)
      }
      if (filters.organizationId) {
        filteredLogs = filteredLogs.filter(log => log.organizationId === filters.organizationId)
      }
      if (filters.startDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.startDate!)
      }
      if (filters.endDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= filters.endDate!)
      }
    }

    return filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }
}

// Error parsing utilities
export function parseError(error: unknown): AppError {
  // Handle known error types
  if (error instanceof AppError) {
    return error
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return new ValidationError("Invalid input data", error.issues)
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return new ConflictError("Unique constraint violation", {
          field: error.meta?.target,
          code: error.code
        })
      case 'P2025':
        return new NotFoundError("Record")
      case 'P2003':
        return new ValidationError("Foreign key constraint failed", {
          field: error.meta?.field_name,
          code: error.code
        })
      default:
        return new DatabaseError("Database operation failed", {
          code: error.code,
          meta: error.meta
        })
    }
  }

  // Handle Prisma validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    return new ValidationError("Database validation error", error.message)
  }

  // Handle generic errors
  if (error instanceof Error) {
    return new AppError(
      error.message || "An unexpected error occurred",
      ErrorType.INTERNAL,
      500,
      false
    )
  }

  // Handle unknown error types
  return new AppError(
    "An unknown error occurred",
    ErrorType.INTERNAL,
    500,
    false,
    error
  )
}

// API response formatter for errors
export function formatErrorResponse(error: AppError) {
  const response: any = {
    error: error.message,
    type: error.type,
    timestamp: error.timestamp.toISOString()
  }

  // Include details for validation errors
  if (error.type === ErrorType.VALIDATION && error.details) {
    response.details = error.details
  }

  // Don't expose internal error details in production
  if (process.env.NODE_ENV === 'development' && error.details) {
    response.details = error.details
  }

  return response
}

// Middleware helper for consistent error handling
export function handleApiError(error: unknown, context?: {
  userId?: string
  organizationId?: string
  requestId?: string
  userAgent?: string
  ip?: string
}) {
  const appError = parseError(error)
  
  // Log the error
  ErrorLogger.log(appError, context)
  
  return {
    error: appError,
    response: formatErrorResponse(appError)
  }
}