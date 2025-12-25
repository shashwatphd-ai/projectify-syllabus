/**
 * Safe JSON Parsing Utilities for Edge Functions
 * 
 * This module provides safe JSON parsing with proper error handling
 * to prevent crashes and provide consistent 400 Bad Request responses.
 * 
 * Usage:
 * ```typescript
 * import { safeParseRequestBody, safeParse, createBadRequestResponse } from '../_shared/json-parser.ts';
 * 
 * // In your handler:
 * const parseResult = await safeParseRequestBody<MyRequestType>(req);
 * if (!parseResult.success) {
 *   return parseResult.response;
 * }
 * const data = parseResult.data;
 * ```
 */

import { corsHeaders, securityHeaders, responseHeaders } from './cors.ts';

export interface ParseSuccess<T> {
  success: true;
  data: T;
}

export interface ParseError {
  success: false;
  error: string;
  response: Response;
}

export type ParseResult<T> = ParseSuccess<T> | ParseError;

/**
 * Creates a 400 Bad Request response for invalid JSON
 */
export function createBadRequestResponse(
  message: string = 'Invalid JSON in request body',
  headers: Record<string, string> = corsHeaders
): Response {
  console.error('[JSON Parser] Bad request:', message);
  
  return new Response(
    JSON.stringify({ 
      error: message,
      code: 'INVALID_JSON'
    }),
    {
      status: 400,
      headers: {
        ...headers,
        ...securityHeaders,
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Safely parse a JSON string with proper error handling
 * Returns a typed result or error details
 */
export function safeParse<T = unknown>(
  jsonString: string,
  headers: Record<string, string> = corsHeaders
): ParseResult<T> {
  try {
    const data = JSON.parse(jsonString) as T;
    return { success: true, data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown JSON parse error';
    console.error('[JSON Parser] Parse failed:', errorMessage);
    
    return {
      success: false,
      error: errorMessage,
      response: createBadRequestResponse(`Invalid JSON: ${errorMessage}`, headers)
    };
  }
}

/**
 * Safely parse the request body as JSON with proper error handling
 * This handles both req.json() failures and empty bodies
 * 
 * @param req - The incoming Request object
 * @param headers - Optional CORS headers to include in error response
 * @returns ParseResult with typed data or error response
 */
export async function safeParseRequestBody<T = unknown>(
  req: Request,
  headers: Record<string, string> = corsHeaders
): Promise<ParseResult<T>> {
  try {
    // Check if there's a body to parse
    const contentType = req.headers.get('content-type') || '';
    
    // For requests without a body or non-JSON content type, return empty object
    if (req.method === 'GET' || req.method === 'HEAD') {
      return { success: true, data: {} as T };
    }
    
    // Attempt to parse the body
    const text = await req.text();
    
    // Handle empty body
    if (!text || text.trim() === '') {
      console.log('[JSON Parser] Empty request body, returning empty object');
      return { success: true, data: {} as T };
    }
    
    // Parse the JSON
    return safeParse<T>(text, headers);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to read request body';
    console.error('[JSON Parser] Request body read failed:', errorMessage);
    
    return {
      success: false,
      error: errorMessage,
      response: createBadRequestResponse(`Failed to read request body: ${errorMessage}`, headers)
    };
  }
}

/**
 * Validate that required fields exist in the parsed data
 * Returns an error response if any required fields are missing
 */
export function validateRequiredFields<T extends Record<string, unknown>>(
  data: T,
  requiredFields: (keyof T)[],
  headers: Record<string, string> = corsHeaders
): { valid: true } | { valid: false; response: Response; missingFields: string[] } {
  const missingFields: string[] = [];
  
  for (const field of requiredFields) {
    const value = data[field];
    // Check for undefined, null, or empty string
    if (value === undefined || value === null || value === '') {
      missingFields.push(String(field));
    }
  }
  
  if (missingFields.length > 0) {
    console.error('[JSON Parser] Missing required fields:', missingFields);
    
    return {
      valid: false,
      missingFields,
      response: new Response(
        JSON.stringify({
          error: `Missing required fields: ${missingFields.join(', ')}`,
          code: 'MISSING_FIELDS',
          missing: missingFields
        }),
        {
          status: 400,
          headers: {
            ...headers,
            ...securityHeaders,
            'Content-Type': 'application/json',
          },
        }
      )
    };
  }
  
  return { valid: true };
}

/**
 * Combined helper: Parse request body and validate required fields
 */
export async function parseAndValidate<T extends Record<string, unknown>>(
  req: Request,
  requiredFields: (keyof T)[],
  headers: Record<string, string> = corsHeaders
): Promise<ParseResult<T>> {
  // First parse the body
  const parseResult = await safeParseRequestBody<T>(req, headers);
  if (!parseResult.success) {
    return parseResult;
  }
  
  // Then validate required fields
  const validation = validateRequiredFields(parseResult.data, requiredFields, headers);
  if (!validation.valid) {
    return {
      success: false,
      error: `Missing required fields: ${validation.missingFields.join(', ')}`,
      response: validation.response
    };
  }
  
  return parseResult;
}
