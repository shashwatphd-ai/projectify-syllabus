/**
 * Hardened CORS and Security Headers for Edge Functions
 * 
 * This module provides consistent, secure CORS headers across all edge functions.
 * 
 * Security Features:
 * - CORS headers for cross-origin requests
 * - Content-Type enforcement (nosniff)
 * - Clickjacking protection (X-Frame-Options)
 * - XSS protection header
 * - Referrer policy for privacy
 * - Cache control for sensitive responses
 */

// Production origins - add your production domains here
const ALLOWED_ORIGINS = [
  'https://lovable.dev',
  'https://*.lovable.dev',
  'https://*.lovableproject.com',
  // Local development
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

/**
 * Standard CORS headers for all edge functions
 * Uses wildcard for development flexibility while maintaining security headers
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
};

/**
 * Security headers to be included in all responses
 * These protect against common web vulnerabilities
 */
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',           // Prevent MIME type sniffing
  'X-Frame-Options': 'DENY',                      // Prevent clickjacking
  'X-XSS-Protection': '1; mode=block',           // Legacy XSS protection
  'Referrer-Policy': 'strict-origin-when-cross-origin', // Privacy-preserving referrer
  'Cache-Control': 'no-store, no-cache, must-revalidate', // Don't cache sensitive responses
};

/**
 * Combined headers for standard JSON responses
 */
export const responseHeaders = {
  ...corsHeaders,
  ...securityHeaders,
  'Content-Type': 'application/json',
};

/**
 * Get dynamic CORS headers based on the request origin
 * Falls back to wildcard for development
 */
export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin');
  
  if (origin) {
    // Check if origin matches allowed patterns
    const isAllowed = ALLOWED_ORIGINS.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(origin);
      }
      return pattern === origin;
    });
    
    if (isAllowed) {
      return {
        ...corsHeaders,
        'Access-Control-Allow-Origin': origin,
      };
    }
  }
  
  // Default to wildcard for development/unknown origins
  return corsHeaders;
}

/**
 * Create a preflight response for OPTIONS requests
 */
export function createPreflightResponse(request?: Request): Response {
  const headers = request ? getCorsHeaders(request) : corsHeaders;
  return new Response(null, { 
    headers: {
      ...headers,
      ...securityHeaders,
    }
  });
}

/**
 * Create a JSON response with all security and CORS headers
 */
export function createJsonResponse(
  data: unknown, 
  status = 200, 
  request?: Request
): Response {
  const corsH = request ? getCorsHeaders(request) : corsHeaders;
  
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsH,
      ...securityHeaders,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Create an error response with all security headers
 */
export function createErrorResponse(
  message: string,
  status = 500,
  request?: Request
): Response {
  return createJsonResponse({ error: message }, status, request);
}
