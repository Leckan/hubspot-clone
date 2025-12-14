/**
 * Input sanitization utilities for contact data
 * Provides functions to clean and normalize user input before validation
 */

/**
 * Sanitizes a string by trimming whitespace and normalizing spaces
 */
export function sanitizeString(input: string | undefined | null): string | undefined {
  if (!input || typeof input !== 'string') {
    return undefined
  }
  
  // Trim whitespace and normalize multiple spaces to single space
  const sanitized = input.trim().replace(/\s+/g, ' ')
  
  // Return undefined for empty strings after sanitization
  return sanitized === '' ? undefined : sanitized
}

/**
 * Sanitizes an email address by converting to lowercase and trimming
 */
export function sanitizeEmail(email: string | undefined | null): string | undefined {
  if (!email || typeof email !== 'string') {
    return undefined
  }
  
  const sanitized = email.trim().toLowerCase()
  return sanitized === '' ? undefined : sanitized
}

/**
 * Sanitizes a phone number by removing non-digit characters except + at the start
 */
export function sanitizePhone(phone: string | undefined | null): string | undefined {
  if (!phone || typeof phone !== 'string') {
    return undefined
  }
  
  // Remove all non-digit characters except + at the beginning
  let sanitized = phone.trim()
  
  // Handle international format
  if (sanitized.startsWith('+')) {
    sanitized = '+' + sanitized.slice(1).replace(/\D/g, '')
  } else {
    sanitized = sanitized.replace(/\D/g, '')
  }
  
  return sanitized === '' || sanitized === '+' ? undefined : sanitized
}

/**
 * Sanitizes contact input data
 */
export function sanitizeContactInput(input: any): any {
  if (!input || typeof input !== 'object') {
    return input
  }
  
  return {
    ...input,
    firstName: sanitizeString(input.firstName),
    lastName: sanitizeString(input.lastName),
    email: sanitizeEmail(input.email),
    phone: sanitizePhone(input.phone),
    jobTitle: sanitizeString(input.jobTitle),
  }
}

/**
 * Sanitizes company input data
 */
export function sanitizeCompanyInput(input: any): any {
  if (!input || typeof input !== 'object') {
    return input
  }
  
  return {
    ...input,
    name: sanitizeString(input.name),
    domain: sanitizeString(input.domain),
    industry: sanitizeString(input.industry),
    size: sanitizeString(input.size),
    phone: sanitizePhone(input.phone),
    address: sanitizeString(input.address),
  }
}

/**
 * Validates email format with enhanced checks
 */
export function isValidEmailFormat(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false
  }
  
  // Basic email regex that covers most valid cases
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  
  // Check basic format
  if (!emailRegex.test(email)) {
    return false
  }
  
  // Additional checks
  const parts = email.split('@')
  if (parts.length !== 2) {
    return false
  }
  
  const [localPart, domain] = parts
  
  // Local part checks
  if (localPart.length === 0 || localPart.length > 64) {
    return false
  }
  
  // Domain checks
  if (domain.length === 0 || domain.length > 253) {
    return false
  }
  
  // Check for consecutive dots
  if (email.includes('..')) {
    return false
  }
  
  // Check for leading/trailing dots in local part
  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    return false
  }
  
  return true
}

/**
 * Validates phone number format
 */
export function isValidPhoneFormat(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false
  }
  
  // Remove all non-digit characters except + at the beginning
  const cleaned = phone.startsWith('+') 
    ? '+' + phone.slice(1).replace(/\D/g, '')
    : phone.replace(/\D/g, '')
  
  // Check length (international numbers can be 7-15 digits)
  const digitCount = cleaned.replace(/^\+/, '').length
  
  return digitCount >= 7 && digitCount <= 15
}

/**
 * Prevents XSS by escaping HTML characters
 */
export function escapeHtml(text: string): string {
  if (!text || typeof text !== 'string') {
    return ''
  }
  
  const htmlEscapes: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  }
  
  return text.replace(/[&<>"'/]/g, (match) => htmlEscapes[match])
}

/**
 * Removes potentially dangerous characters from input
 */
export function removeDangerousChars(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }
  
  // Remove null bytes, control characters (except tab, newline, carriage return)
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
}