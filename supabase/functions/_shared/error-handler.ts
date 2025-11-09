/**
 * Secure Error Handler
 * Prevents information leakage by returning generic error messages to clients
 * while logging detailed errors server-side for debugging
 */

export interface ErrorResponse {
  error: string;
  code?: string;
}

/**
 * Maps detailed errors to user-friendly messages
 * Logs full error details server-side for debugging
 */
export function getClientSafeError(error: unknown): ErrorResponse {
  // Log full error details server-side (visible in Supabase logs)
  console.error('Detailed error:', {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    type: error?.constructor?.name
  });

  // Analyze error type and return safe message
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Authentication errors
    if (message.includes('auth') || message.includes('unauthorized') || message.includes('jwt')) {
      return {
        error: 'Authentication failed. Please log in again.',
        code: 'AUTH_ERROR'
      };
    }
    
    // Database/Not found errors
    if (message.includes('not found') || message.includes('no rows')) {
      return {
        error: 'The requested resource was not found.',
        code: 'NOT_FOUND'
      };
    }
    
    // Permission errors
    if (message.includes('permission') || message.includes('forbidden') || message.includes('access denied')) {
      return {
        error: 'You do not have permission to perform this action.',
        code: 'PERMISSION_DENIED'
      };
    }
    
    // Validation errors
    if (message.includes('invalid') || message.includes('validation') || message.includes('required')) {
      return {
        error: 'The request contains invalid data. Please check your input.',
        code: 'VALIDATION_ERROR'
      };
    }
    
    // Rate limiting
    if (message.includes('rate limit') || message.includes('too many')) {
      return {
        error: 'Too many requests. Please try again later.',
        code: 'RATE_LIMIT'
      };
    }
    
    // External API errors
    if (message.includes('api') || message.includes('external') || message.includes('apollo')) {
      return {
        error: 'An error occurred connecting to external services. Please try again.',
        code: 'EXTERNAL_API_ERROR'
      };
    }
  }
  
  // Default safe message for any other error
  return {
    error: 'An error occurred processing your request. Please try again.',
    code: 'INTERNAL_ERROR'
  };
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(
  error: unknown,
  status: number = 500,
  corsHeaders: Record<string, string> = {}
): Response {
  const clientError = getClientSafeError(error);
  
  return new Response(
    JSON.stringify(clientError),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    }
  );
}
