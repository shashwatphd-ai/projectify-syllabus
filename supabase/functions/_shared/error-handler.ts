/**
 * Error Classification & Handler System
 * Bit 2.6: Categorizes errors by type for better handling, retry logic, and logging
 * 
 * Error Categories:
 * - TRANSIENT: Temporary issues that may resolve on retry (network, timeout, 503)
 * - RATE_LIMIT: Rate limiting from external APIs (429)
 * - PERMANENT: Errors that won't resolve on retry (auth, validation, not found)
 * - EXTERNAL_API: Errors from third-party services
 * - INTERNAL: Unexpected internal errors
 */

// ============================================================================
// ERROR CLASSIFICATION TYPES
// ============================================================================

export enum ErrorCategory {
  TRANSIENT = 'TRANSIENT',       // Retry recommended
  RATE_LIMIT = 'RATE_LIMIT',     // Retry after delay
  PERMANENT = 'PERMANENT',       // Do not retry
  EXTERNAL_API = 'EXTERNAL_API', // External service issue
  INTERNAL = 'INTERNAL',         // Unexpected internal error
}

export enum ErrorCode {
  // Authentication & Authorization
  AUTH_ERROR = 'AUTH_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  JWT_EXPIRED = 'JWT_EXPIRED',
  JWT_INVALID = 'JWT_INVALID',
  
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_FIELD = 'MISSING_FIELD',
  INVALID_UUID = 'INVALID_UUID',
  
  // Resource
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',
  
  // Rate Limiting
  RATE_LIMIT = 'RATE_LIMIT',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  
  // Network & Transient
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  CONNECTION_RESET = 'CONNECTION_RESET',
  
  // External APIs
  APOLLO_API_ERROR = 'APOLLO_API_ERROR',
  GOOGLE_API_ERROR = 'GOOGLE_API_ERROR',
  GEMINI_API_ERROR = 'GEMINI_API_ERROR',
  RESEND_API_ERROR = 'RESEND_API_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  
  // Database
  DATABASE_ERROR = 'DATABASE_ERROR',
  QUERY_ERROR = 'QUERY_ERROR',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',
  
  // Internal
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  PARSE_ERROR = 'PARSE_ERROR',
}

export interface ClassifiedError {
  code: ErrorCode;
  category: ErrorCategory;
  message: string;
  originalMessage?: string;
  httpStatus: number;
  retryable: boolean;
  retryAfterMs?: number;
  context?: Record<string, unknown>;
}

export interface ErrorResponse {
  error: string;
  code?: string;
  retryable?: boolean;
  retryAfterSeconds?: number;
}

// ============================================================================
// ERROR CLASSIFICATION LOGIC
// ============================================================================

/**
 * HTTP status code to error category mapping
 */
const STATUS_CODE_MAPPING: Record<number, { category: ErrorCategory; code: ErrorCode; retryable: boolean }> = {
  400: { category: ErrorCategory.PERMANENT, code: ErrorCode.VALIDATION_ERROR, retryable: false },
  401: { category: ErrorCategory.PERMANENT, code: ErrorCode.UNAUTHORIZED, retryable: false },
  403: { category: ErrorCategory.PERMANENT, code: ErrorCode.PERMISSION_DENIED, retryable: false },
  404: { category: ErrorCategory.PERMANENT, code: ErrorCode.NOT_FOUND, retryable: false },
  408: { category: ErrorCategory.TRANSIENT, code: ErrorCode.TIMEOUT, retryable: true },
  409: { category: ErrorCategory.PERMANENT, code: ErrorCode.CONFLICT, retryable: false },
  429: { category: ErrorCategory.RATE_LIMIT, code: ErrorCode.RATE_LIMIT, retryable: true },
  500: { category: ErrorCategory.TRANSIENT, code: ErrorCode.INTERNAL_ERROR, retryable: true },
  502: { category: ErrorCategory.TRANSIENT, code: ErrorCode.SERVICE_UNAVAILABLE, retryable: true },
  503: { category: ErrorCategory.TRANSIENT, code: ErrorCode.SERVICE_UNAVAILABLE, retryable: true },
  504: { category: ErrorCategory.TRANSIENT, code: ErrorCode.TIMEOUT, retryable: true },
};

/**
 * Message pattern matching for error classification
 */
const MESSAGE_PATTERNS: Array<{
  patterns: RegExp[];
  code: ErrorCode;
  category: ErrorCategory;
  retryable: boolean;
}> = [
  // Authentication patterns
  {
    patterns: [/jwt.*expired/i, /token.*expired/i],
    code: ErrorCode.JWT_EXPIRED,
    category: ErrorCategory.PERMANENT,
    retryable: false,
  },
  {
    patterns: [/jwt.*invalid/i, /invalid.*token/i, /malformed.*jwt/i],
    code: ErrorCode.JWT_INVALID,
    category: ErrorCategory.PERMANENT,
    retryable: false,
  },
  {
    patterns: [/unauthorized/i, /not.*authenticated/i, /missing.*auth/i],
    code: ErrorCode.UNAUTHORIZED,
    category: ErrorCategory.PERMANENT,
    retryable: false,
  },
  {
    patterns: [/forbidden/i, /access.*denied/i, /permission.*denied/i],
    code: ErrorCode.PERMISSION_DENIED,
    category: ErrorCategory.PERMANENT,
    retryable: false,
  },
  
  // Rate limiting patterns
  {
    patterns: [/rate.*limit/i, /too.*many.*requests/i, /429/i, /throttl/i],
    code: ErrorCode.RATE_LIMIT,
    category: ErrorCategory.RATE_LIMIT,
    retryable: true,
  },
  {
    patterns: [/quota.*exceeded/i, /limit.*exceeded/i],
    code: ErrorCode.QUOTA_EXCEEDED,
    category: ErrorCategory.RATE_LIMIT,
    retryable: true,
  },
  
  // Network patterns (transient)
  {
    patterns: [/timeout/i, /timed.*out/i, /ETIMEDOUT/i],
    code: ErrorCode.TIMEOUT,
    category: ErrorCategory.TRANSIENT,
    retryable: true,
  },
  {
    patterns: [/ECONNRESET/i, /connection.*reset/i, /socket.*hang.*up/i],
    code: ErrorCode.CONNECTION_RESET,
    category: ErrorCategory.TRANSIENT,
    retryable: true,
  },
  {
    patterns: [/ECONNREFUSED/i, /connection.*refused/i],
    code: ErrorCode.NETWORK_ERROR,
    category: ErrorCategory.TRANSIENT,
    retryable: true,
  },
  {
    patterns: [/network.*error/i, /fetch.*failed/i, /dns.*error/i],
    code: ErrorCode.NETWORK_ERROR,
    category: ErrorCategory.TRANSIENT,
    retryable: true,
  },
  {
    patterns: [/service.*unavailable/i, /503/i, /temporarily.*unavailable/i],
    code: ErrorCode.SERVICE_UNAVAILABLE,
    category: ErrorCategory.TRANSIENT,
    retryable: true,
  },
  
  // External API patterns
  {
    patterns: [/apollo.*api/i, /apollo.*error/i],
    code: ErrorCode.APOLLO_API_ERROR,
    category: ErrorCategory.EXTERNAL_API,
    retryable: true,
  },
  {
    patterns: [/google.*api/i, /google.*error/i, /geocod/i, /places.*api/i],
    code: ErrorCode.GOOGLE_API_ERROR,
    category: ErrorCategory.EXTERNAL_API,
    retryable: true,
  },
  {
    patterns: [/gemini/i, /generative.*language/i, /ai.*studio/i],
    code: ErrorCode.GEMINI_API_ERROR,
    category: ErrorCategory.EXTERNAL_API,
    retryable: true,
  },
  {
    patterns: [/resend/i, /email.*api/i],
    code: ErrorCode.RESEND_API_ERROR,
    category: ErrorCategory.EXTERNAL_API,
    retryable: true,
  },
  
  // Validation patterns
  {
    patterns: [/invalid.*uuid/i, /uuid.*format/i],
    code: ErrorCode.INVALID_UUID,
    category: ErrorCategory.PERMANENT,
    retryable: false,
  },
  {
    patterns: [/missing.*field/i, /required.*field/i, /field.*required/i],
    code: ErrorCode.MISSING_FIELD,
    category: ErrorCategory.PERMANENT,
    retryable: false,
  },
  {
    patterns: [/invalid/i, /validation/i, /malformed/i],
    code: ErrorCode.VALIDATION_ERROR,
    category: ErrorCategory.PERMANENT,
    retryable: false,
  },
  
  // Resource patterns
  {
    patterns: [/not.*found/i, /no.*rows/i, /does.*not.*exist/i, /404/i],
    code: ErrorCode.NOT_FOUND,
    category: ErrorCategory.PERMANENT,
    retryable: false,
  },
  {
    patterns: [/already.*exists/i, /duplicate/i, /unique.*constraint/i],
    code: ErrorCode.ALREADY_EXISTS,
    category: ErrorCategory.PERMANENT,
    retryable: false,
  },
  
  // Database patterns
  {
    patterns: [/constraint.*violation/i, /foreign.*key/i, /referential/i],
    code: ErrorCode.CONSTRAINT_VIOLATION,
    category: ErrorCategory.PERMANENT,
    retryable: false,
  },
  {
    patterns: [/database.*error/i, /postgres/i, /supabase.*error/i],
    code: ErrorCode.DATABASE_ERROR,
    category: ErrorCategory.TRANSIENT,
    retryable: true,
  },
  
  // Parse patterns
  {
    patterns: [/json.*parse/i, /syntax.*error/i, /unexpected.*token/i],
    code: ErrorCode.PARSE_ERROR,
    category: ErrorCategory.PERMANENT,
    retryable: false,
  },
];

/**
 * Classify an error based on its properties
 */
export function classifyError(error: unknown, context?: Record<string, unknown>): ClassifiedError {
  const originalMessage = error instanceof Error ? error.message : String(error);
  const errorStatus = (error as any)?.status || (error as any)?.statusCode;
  const retryAfter = (error as any)?.retryAfter;
  
  // 1. Check if error has HTTP status code
  if (errorStatus && STATUS_CODE_MAPPING[errorStatus]) {
    const mapping = STATUS_CODE_MAPPING[errorStatus];
    return {
      code: mapping.code,
      category: mapping.category,
      message: getClientSafeMessage(mapping.code),
      originalMessage,
      httpStatus: errorStatus,
      retryable: mapping.retryable,
      retryAfterMs: retryAfter ? retryAfter * 1000 : getDefaultRetryDelay(mapping.category),
      context,
    };
  }
  
  // 2. Pattern matching on error message
  for (const { patterns, code, category, retryable } of MESSAGE_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(originalMessage)) {
        return {
          code,
          category,
          message: getClientSafeMessage(code),
          originalMessage,
          httpStatus: getHttpStatusForCode(code),
          retryable,
          retryAfterMs: retryable ? getDefaultRetryDelay(category) : undefined,
          context,
        };
      }
    }
  }
  
  // 3. Default to internal error
  return {
    code: ErrorCode.INTERNAL_ERROR,
    category: ErrorCategory.INTERNAL,
    message: 'An unexpected error occurred. Please try again.',
    originalMessage,
    httpStatus: 500,
    retryable: true,
    retryAfterMs: 1000,
    context,
  };
}

/**
 * Get user-friendly message for error code
 */
function getClientSafeMessage(code: ErrorCode): string {
  const messages: Record<ErrorCode, string> = {
    [ErrorCode.AUTH_ERROR]: 'Authentication failed. Please log in again.',
    [ErrorCode.UNAUTHORIZED]: 'You need to be logged in to perform this action.',
    [ErrorCode.PERMISSION_DENIED]: 'You do not have permission to perform this action.',
    [ErrorCode.JWT_EXPIRED]: 'Your session has expired. Please log in again.',
    [ErrorCode.JWT_INVALID]: 'Invalid authentication token. Please log in again.',
    [ErrorCode.VALIDATION_ERROR]: 'The request contains invalid data. Please check your input.',
    [ErrorCode.INVALID_INPUT]: 'Invalid input provided. Please check your data.',
    [ErrorCode.MISSING_FIELD]: 'Required information is missing. Please complete all fields.',
    [ErrorCode.INVALID_UUID]: 'Invalid identifier format.',
    [ErrorCode.NOT_FOUND]: 'The requested resource was not found.',
    [ErrorCode.ALREADY_EXISTS]: 'This resource already exists.',
    [ErrorCode.CONFLICT]: 'A conflict occurred. Please refresh and try again.',
    [ErrorCode.RATE_LIMIT]: 'Too many requests. Please wait a moment and try again.',
    [ErrorCode.QUOTA_EXCEEDED]: 'Service quota exceeded. Please try again later.',
    [ErrorCode.NETWORK_ERROR]: 'A network error occurred. Please check your connection.',
    [ErrorCode.TIMEOUT]: 'The request timed out. Please try again.',
    [ErrorCode.SERVICE_UNAVAILABLE]: 'The service is temporarily unavailable. Please try again.',
    [ErrorCode.CONNECTION_RESET]: 'Connection was interrupted. Please try again.',
    [ErrorCode.APOLLO_API_ERROR]: 'Error connecting to company data service. Please try again.',
    [ErrorCode.GOOGLE_API_ERROR]: 'Error connecting to location service. Please try again.',
    [ErrorCode.GEMINI_API_ERROR]: 'Error connecting to AI service. Please try again.',
    [ErrorCode.RESEND_API_ERROR]: 'Error sending email. Please try again.',
    [ErrorCode.EXTERNAL_API_ERROR]: 'Error connecting to external service. Please try again.',
    [ErrorCode.DATABASE_ERROR]: 'A database error occurred. Please try again.',
    [ErrorCode.QUERY_ERROR]: 'Error processing your request. Please try again.',
    [ErrorCode.CONSTRAINT_VIOLATION]: 'This operation violates data constraints.',
    [ErrorCode.INTERNAL_ERROR]: 'An unexpected error occurred. Please try again.',
    [ErrorCode.UNKNOWN_ERROR]: 'An error occurred. Please try again.',
    [ErrorCode.PARSE_ERROR]: 'Invalid data format received.',
  };
  
  return messages[code] || messages[ErrorCode.INTERNAL_ERROR];
}

/**
 * Get HTTP status code for error code
 */
function getHttpStatusForCode(code: ErrorCode): number {
  const statusMap: Partial<Record<ErrorCode, number>> = {
    [ErrorCode.UNAUTHORIZED]: 401,
    [ErrorCode.JWT_EXPIRED]: 401,
    [ErrorCode.JWT_INVALID]: 401,
    [ErrorCode.PERMISSION_DENIED]: 403,
    [ErrorCode.NOT_FOUND]: 404,
    [ErrorCode.VALIDATION_ERROR]: 400,
    [ErrorCode.INVALID_INPUT]: 400,
    [ErrorCode.MISSING_FIELD]: 400,
    [ErrorCode.INVALID_UUID]: 400,
    [ErrorCode.ALREADY_EXISTS]: 409,
    [ErrorCode.CONFLICT]: 409,
    [ErrorCode.RATE_LIMIT]: 429,
    [ErrorCode.QUOTA_EXCEEDED]: 429,
    [ErrorCode.TIMEOUT]: 408,
    [ErrorCode.SERVICE_UNAVAILABLE]: 503,
  };
  
  return statusMap[code] || 500;
}

/**
 * Get default retry delay based on category
 */
function getDefaultRetryDelay(category: ErrorCategory): number {
  switch (category) {
    case ErrorCategory.RATE_LIMIT:
      return 5000; // 5 seconds for rate limits
    case ErrorCategory.TRANSIENT:
      return 1000; // 1 second for transient
    case ErrorCategory.EXTERNAL_API:
      return 2000; // 2 seconds for external APIs
    default:
      return 0;
  }
}

// ============================================================================
// LOGGING HELPERS
// ============================================================================

/**
 * Log classified error with structured data
 */
export function logClassifiedError(
  classified: ClassifiedError,
  operation: string,
  additionalContext?: Record<string, unknown>
): void {
  const logLevel = classified.category === ErrorCategory.PERMANENT ? 'warn' : 'error';
  const logData = {
    operation,
    errorCode: classified.code,
    errorCategory: classified.category,
    httpStatus: classified.httpStatus,
    retryable: classified.retryable,
    retryAfterMs: classified.retryAfterMs,
    originalMessage: classified.originalMessage?.substring(0, 200), // Truncate for logs
    context: { ...classified.context, ...additionalContext },
    timestamp: new Date().toISOString(),
  };
  
  if (logLevel === 'warn') {
    console.warn(`[error-handler] ${operation}:`, JSON.stringify(logData));
  } else {
    console.error(`[error-handler] ${operation}:`, JSON.stringify(logData));
  }
}

// ============================================================================
// RESPONSE HELPERS (backward compatible)
// ============================================================================

/**
 * Maps detailed errors to user-friendly messages (legacy function - now uses classifyError)
 */
export function getClientSafeError(error: unknown): ErrorResponse {
  const classified = classifyError(error);
  
  // Log for debugging
  logClassifiedError(classified, 'getClientSafeError');
  
  return {
    error: classified.message,
    code: classified.code,
    retryable: classified.retryable,
    retryAfterSeconds: classified.retryAfterMs ? Math.ceil(classified.retryAfterMs / 1000) : undefined,
  };
}

/**
 * Creates a standardized error response with classification
 */
export function createErrorResponse(
  error: unknown,
  corsHeaders: Record<string, string> = {},
  operation?: string
): Response {
  const classified = classifyError(error);
  
  // Log with operation context
  logClassifiedError(classified, operation || 'createErrorResponse');
  
  const responseBody: ErrorResponse = {
    error: classified.message,
    code: classified.code,
    retryable: classified.retryable,
  };
  
  // Add Retry-After header for rate limits
  const headers: Record<string, string> = {
    ...corsHeaders,
    'Content-Type': 'application/json',
  };
  
  if (classified.category === ErrorCategory.RATE_LIMIT && classified.retryAfterMs) {
    headers['Retry-After'] = String(Math.ceil(classified.retryAfterMs / 1000));
    responseBody.retryAfterSeconds = Math.ceil(classified.retryAfterMs / 1000);
  }
  
  return new Response(JSON.stringify(responseBody), {
    status: classified.httpStatus,
    headers,
  });
}

/**
 * Create error response with custom status (backward compatibility)
 */
export function createErrorResponseWithStatus(
  error: unknown,
  status: number,
  corsHeaders: Record<string, string> = {}
): Response {
  const classified = classifyError(error);
  classified.httpStatus = status; // Override with provided status
  
  logClassifiedError(classified, 'createErrorResponseWithStatus');
  
  return new Response(
    JSON.stringify({
      error: classified.message,
      code: classified.code,
    }),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Check if an error should be retried
 */
export function shouldRetryError(error: unknown): boolean {
  const classified = classifyError(error);
  return classified.retryable;
}

/**
 * Get retry delay for an error
 */
export function getRetryDelay(error: unknown): number {
  const classified = classifyError(error);
  return classified.retryAfterMs || 0;
}
