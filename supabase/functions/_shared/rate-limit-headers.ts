/**
 * Rate Limiting Headers Utility
 * 
 * Provides consistent X-RateLimit-* headers for edge functions.
 * These headers communicate rate limit information to clients,
 * enabling them to implement proper backoff and retry logic.
 * 
 * Note: This provides headers for client awareness. Actual rate limiting
 * enforcement should be handled at the infrastructure level (e.g., Supabase,
 * API Gateway, or application-level rate limiting middleware).
 * 
 * Headers included:
 * - X-RateLimit-Limit: Maximum requests per window
 * - X-RateLimit-Remaining: Requests remaining in current window
 * - X-RateLimit-Reset: Unix timestamp when window resets
 * - X-RateLimit-Policy: Description of the rate limit policy
 * - Retry-After: Seconds until next request allowed (when limited)
 */

export interface RateLimitConfig {
  /** Maximum requests per window */
  limit: number;
  /** Requests remaining in current window */
  remaining: number;
  /** Window duration in seconds */
  windowSeconds: number;
  /** Optional: Unix timestamp when window resets */
  resetAt?: number;
  /** Optional: Whether the request is rate limited */
  isLimited?: boolean;
}

/**
 * Default rate limit configurations for different endpoint types
 */
export const RATE_LIMIT_CONFIGS = {
  /** High-traffic public endpoints */
  PUBLIC_HIGH: { limit: 100, windowSeconds: 60 },
  
  /** Authenticated endpoints with moderate traffic */
  AUTHENTICATED_STANDARD: { limit: 60, windowSeconds: 60 },
  
  /** Resource-intensive operations (AI, enrichment) */
  RESOURCE_INTENSIVE: { limit: 20, windowSeconds: 60 },
  
  /** Admin or sensitive operations */
  ADMIN_RESTRICTED: { limit: 10, windowSeconds: 60 },
  
  /** Webhook endpoints */
  WEBHOOK: { limit: 50, windowSeconds: 60 },
} as const;

/**
 * Generate rate limit headers based on configuration
 * 
 * @param config - Rate limit configuration
 * @returns Object containing rate limit headers
 */
export function getRateLimitHeaders(config: RateLimitConfig): Record<string, string> {
  const resetAt = config.resetAt || Math.floor(Date.now() / 1000) + config.windowSeconds;
  
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(config.limit),
    'X-RateLimit-Remaining': String(Math.max(0, config.remaining)),
    'X-RateLimit-Reset': String(resetAt),
    'X-RateLimit-Policy': `${config.limit} requests per ${config.windowSeconds} seconds`,
  };
  
  // Add Retry-After header when rate limited
  if (config.isLimited || config.remaining <= 0) {
    const retryAfter = Math.max(1, resetAt - Math.floor(Date.now() / 1000));
    headers['Retry-After'] = String(retryAfter);
  }
  
  return headers;
}

/**
 * Create rate limit headers with estimated remaining based on request count
 * Useful when actual rate limiting state is not available
 * 
 * @param configType - Type of rate limit configuration to use
 * @param estimatedUsage - Estimated number of requests already made (optional)
 * @returns Object containing rate limit headers
 */
export function getEstimatedRateLimitHeaders(
  configType: keyof typeof RATE_LIMIT_CONFIGS = 'AUTHENTICATED_STANDARD',
  estimatedUsage: number = 0
): Record<string, string> {
  const config = RATE_LIMIT_CONFIGS[configType];
  const remaining = Math.max(0, config.limit - estimatedUsage);
  
  return getRateLimitHeaders({
    limit: config.limit,
    remaining,
    windowSeconds: config.windowSeconds,
    isLimited: remaining <= 0,
  });
}

/**
 * Merge rate limit headers with existing response headers
 * 
 * @param existingHeaders - Existing headers object
 * @param rateLimitConfig - Rate limit configuration
 * @returns Combined headers object
 */
export function withRateLimitHeaders(
  existingHeaders: Record<string, string>,
  rateLimitConfig: RateLimitConfig
): Record<string, string> {
  return {
    ...existingHeaders,
    ...getRateLimitHeaders(rateLimitConfig),
  };
}

/**
 * Create a rate limited response (429 Too Many Requests)
 * 
 * @param message - Error message
 * @param config - Rate limit configuration
 * @param additionalHeaders - Additional headers to include
 * @returns Response object with 429 status
 */
export function createRateLimitedResponse(
  message: string = 'Too many requests. Please try again later.',
  config: RateLimitConfig,
  additionalHeaders: Record<string, string> = {}
): Response {
  return new Response(
    JSON.stringify({
      error: 'rate_limit_exceeded',
      message,
      retry_after: config.windowSeconds,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        ...additionalHeaders,
        ...getRateLimitHeaders({ ...config, isLimited: true }),
      },
    }
  );
}

/**
 * Simple in-memory rate limiter for development/testing
 * Note: In production, use Redis or a distributed rate limiting solution
 */
const requestCounts = new Map<string, { count: number; resetAt: number }>();

/**
 * Check if a request should be rate limited (in-memory implementation)
 * 
 * @param identifier - Unique identifier for the client (e.g., user ID, IP)
 * @param configType - Type of rate limit configuration to use
 * @returns Rate limit state including whether the request is limited
 */
export function checkRateLimit(
  identifier: string,
  configType: keyof typeof RATE_LIMIT_CONFIGS = 'AUTHENTICATED_STANDARD'
): RateLimitConfig & { isLimited: boolean } {
  const config = RATE_LIMIT_CONFIGS[configType];
  const now = Math.floor(Date.now() / 1000);
  const windowKey = `${identifier}:${configType}`;
  
  let state = requestCounts.get(windowKey);
  
  // Reset if window has passed
  if (!state || state.resetAt <= now) {
    state = {
      count: 0,
      resetAt: now + config.windowSeconds,
    };
    requestCounts.set(windowKey, state);
  }
  
  // Increment count
  state.count++;
  
  const remaining = Math.max(0, config.limit - state.count);
  const isLimited = state.count > config.limit;
  
  return {
    limit: config.limit,
    remaining,
    windowSeconds: config.windowSeconds,
    resetAt: state.resetAt,
    isLimited,
  };
}

/**
 * Cleanup expired rate limit entries (call periodically)
 */
export function cleanupRateLimitEntries(): void {
  const now = Math.floor(Date.now() / 1000);
  
  for (const [key, state] of requestCounts.entries()) {
    if (state.resetAt <= now) {
      requestCounts.delete(key);
    }
  }
}
