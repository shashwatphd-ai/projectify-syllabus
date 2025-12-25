/**
 * Input Validation Utilities
 * 
 * Provides consistent validation patterns across all edge functions:
 * - UUID validation (prevents SQL injection via malformed IDs)
 * - String sanitization (prevents XSS and injection attacks)
 * - Type guards and validators for common patterns
 * 
 * @module input-validation
 * @version 1.0.0
 */

import { corsHeaders, securityHeaders } from './cors.ts';

// ============================================================================
// UUID VALIDATION
// ============================================================================

/**
 * UUID v4 regex pattern
 * Matches: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * where y is one of [89ab]
 */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Loose UUID regex - allows any valid UUID format (v1-v5)
 * Use when accepting any UUID version
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates that a string is a valid UUID format
 * @param value - String to validate
 * @param strict - If true, only accepts UUID v4. Default: false (any UUID version)
 * @returns True if valid UUID
 */
export function isValidUUID(value: unknown, strict: boolean = false): value is string {
  if (typeof value !== 'string') return false;
  return strict ? UUID_V4_REGEX.test(value) : UUID_REGEX.test(value);
}

/**
 * Validates UUID and returns sanitized value or null
 * @param value - Value to validate
 * @returns Sanitized UUID string or null if invalid
 */
export function sanitizeUUID(value: unknown): string | null {
  if (!isValidUUID(value)) return null;
  return value.toLowerCase().trim();
}

/**
 * Validates an array of UUIDs
 * @param values - Array to validate
 * @returns True if all values are valid UUIDs
 */
export function areValidUUIDs(values: unknown): values is string[] {
  if (!Array.isArray(values)) return false;
  return values.every(v => isValidUUID(v));
}

// ============================================================================
// STRING SANITIZATION
// ============================================================================

/**
 * Characters that could be used for SQL injection
 * Note: Parameterized queries are the primary defense - this is defense-in-depth
 */
const SQL_INJECTION_PATTERNS = [
  /--/,           // SQL comment
  /;/,            // Statement terminator
  /'/,            // String delimiter (handled by params, but flag suspicious usage)
  /\bOR\b.*=/i,   // OR clause injection
  /\bAND\b.*=/i,  // AND clause injection
  /\bUNION\b/i,   // UNION injection
  /\bSELECT\b/i,  // SELECT injection
  /\bDROP\b/i,    // DROP injection
  /\bDELETE\b/i,  // DELETE injection
  /\bINSERT\b/i,  // INSERT injection
  /\bUPDATE\b/i,  // UPDATE injection
  /\bEXEC\b/i,    // EXEC injection
];

/**
 * Detects potential SQL injection attempts in a string
 * @param value - String to check
 * @returns True if suspicious patterns detected
 */
export function hasSQLInjectionPatterns(value: string): boolean {
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Sanitizes a string by removing potentially dangerous characters
 * @param value - String to sanitize
 * @param maxLength - Maximum allowed length (default: 1000)
 * @returns Sanitized string
 */
export function sanitizeString(value: unknown, maxLength: number = 1000): string {
  if (typeof value !== 'string') return '';
  
  // Trim and truncate
  let sanitized = value.trim().slice(0, maxLength);
  
  // Remove null bytes (common injection technique)
  sanitized = sanitized.replace(/\0/g, '');
  
  // Normalize unicode to prevent homograph attacks
  sanitized = sanitized.normalize('NFKC');
  
  return sanitized;
}

/**
 * Sanitizes a string for safe use in logs (prevents log injection)
 * @param value - String to sanitize
 * @param maxLength - Maximum length for log output
 * @returns Log-safe string
 */
export function sanitizeForLog(value: unknown, maxLength: number = 200): string {
  if (typeof value !== 'string') {
    return typeof value === 'object' ? '[Object]' : String(value).slice(0, maxLength);
  }
  
  // Remove newlines and control characters
  return value
    .replace(/[\n\r\t]/g, ' ')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim()
    .slice(0, maxLength);
}

// ============================================================================
// EMAIL VALIDATION
// ============================================================================

/**
 * Basic email regex pattern
 * Note: Full RFC 5322 compliance is complex - this catches most valid emails
 */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Validates email format
 * @param value - String to validate
 * @returns True if valid email format
 */
export function isValidEmail(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (value.length > 255) return false;
  return EMAIL_REGEX.test(value);
}

/**
 * Sanitizes and validates email
 * @param value - Value to validate
 * @returns Lowercase email or null if invalid
 */
export function sanitizeEmail(value: unknown): string | null {
  if (!isValidEmail(value)) return null;
  return value.toLowerCase().trim();
}

// ============================================================================
// NUMERIC VALIDATION
// ============================================================================

/**
 * Validates that a value is a positive integer
 * @param value - Value to validate
 * @param max - Maximum allowed value (optional)
 * @returns True if valid positive integer
 */
export function isPositiveInteger(value: unknown, max?: number): value is number {
  if (typeof value !== 'number') return false;
  if (!Number.isInteger(value)) return false;
  if (value < 1) return false;
  if (max !== undefined && value > max) return false;
  return true;
}

/**
 * Validates a number is within a range
 * @param value - Value to validate
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns True if within range
 */
export function isInRange(value: unknown, min: number, max: number): value is number {
  if (typeof value !== 'number') return false;
  if (Number.isNaN(value)) return false;
  return value >= min && value <= max;
}

// ============================================================================
// VALIDATION ERROR RESPONSES
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Creates a standardized validation error response
 * @param errors - Array of validation errors
 * @returns Response with 400 status
 */
export function createValidationErrorResponse(errors: ValidationError[]): Response {
  console.warn('[Validation] Validation failed:', errors);
  
  return new Response(
    JSON.stringify({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors
    }),
    {
      status: 400,
      headers: {
        ...corsHeaders,
        ...securityHeaders,
        'Content-Type': 'application/json'
      }
    }
  );
}

/**
 * Creates a response for invalid UUID
 * @param fieldName - Name of the field with invalid UUID
 * @returns Response with 400 status
 */
export function createInvalidUUIDResponse(fieldName: string): Response {
  return createValidationErrorResponse([{
    field: fieldName,
    message: `Invalid ${fieldName} format. Expected a valid UUID.`,
    code: 'INVALID_UUID'
  }]);
}

/**
 * Creates a response for missing required field
 * @param fieldName - Name of the missing field
 * @returns Response with 400 status
 */
export function createMissingFieldResponse(fieldName: string): Response {
  return createValidationErrorResponse([{
    field: fieldName,
    message: `${fieldName} is required`,
    code: 'REQUIRED_FIELD'
  }]);
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validates and extracts a UUID from request body
 * Returns the UUID if valid, or a Response if invalid
 * 
 * @example
 * const result = validateUUIDField(body, 'projectId');
 * if (result instanceof Response) return result;
 * const projectId = result;
 */
export function validateUUIDField(
  body: Record<string, unknown>,
  fieldName: string,
  required: boolean = true
): string | null | Response {
  const value = body[fieldName];
  
  if (value === undefined || value === null) {
    if (required) {
      return createMissingFieldResponse(fieldName);
    }
    return null;
  }
  
  if (!isValidUUID(value)) {
    return createInvalidUUIDResponse(fieldName);
  }
  
  return sanitizeUUID(value);
}

/**
 * Validates multiple UUID fields at once
 * @param body - Request body
 * @param fields - Array of field names and their required status
 * @returns Object with validated UUIDs or Response if validation failed
 */
export function validateUUIDFields(
  body: Record<string, unknown>,
  fields: Array<{ name: string; required: boolean }>
): Record<string, string | null> | Response {
  const result: Record<string, string | null> = {};
  
  for (const { name, required } of fields) {
    const validation = validateUUIDField(body, name, required);
    
    if (validation instanceof Response) {
      return validation;
    }
    
    result[name] = validation;
  }
  
  return result;
}

// ============================================================================
// SQL INJECTION DETECTION
// ============================================================================

/**
 * Logs a warning if potential SQL injection is detected
 * Note: This is defense-in-depth logging. Always use parameterized queries!
 * 
 * @param fieldName - Name of the field being checked
 * @param value - Value to check
 * @returns True if suspicious (for conditional handling)
 */
export function detectAndLogSQLInjection(fieldName: string, value: string): boolean {
  if (hasSQLInjectionPatterns(value)) {
    console.warn(
      `[SECURITY] Potential SQL injection detected in ${fieldName}:`,
      sanitizeForLog(value, 50)
    );
    return true;
  }
  return false;
}
