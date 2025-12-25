/**
 * Retry Utility with Exponential Backoff
 * Bit 2.4: API Retry Logic for improved reliability
 * 
 * Features:
 * - Exponential backoff with jitter
 * - Configurable retry count and delays
 * - Retry-specific error handling
 * - Rate limit detection (429 handling)
 * - Logging for debugging
 */

export interface RetryConfig {
  maxRetries: number;          // Maximum number of retry attempts
  initialDelayMs: number;      // Initial delay in milliseconds
  maxDelayMs: number;          // Maximum delay cap
  backoffMultiplier: number;   // Multiplier for exponential backoff
  retryableStatuses: number[]; // HTTP status codes that should trigger retry
  jitterPercent: number;       // Random jitter percentage (0-100)
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  attempts: number;
  totalDelayMs: number;
  finalStatus?: number;
}

// Default configuration optimized for Apollo API
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,        // 1 second initial delay
  maxDelayMs: 30000,           // 30 second max delay
  backoffMultiplier: 2,        // Double delay each retry
  retryableStatuses: [
    408,  // Request Timeout
    429,  // Too Many Requests (rate limit)
    500,  // Internal Server Error
    502,  // Bad Gateway
    503,  // Service Unavailable
    504,  // Gateway Timeout
  ],
  jitterPercent: 25,           // Add up to 25% random jitter
};

// Aggressive retry config for critical operations
export const AGGRESSIVE_RETRY_CONFIG: RetryConfig = {
  maxRetries: 5,
  initialDelayMs: 500,
  maxDelayMs: 60000,
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  jitterPercent: 30,
};

// Light retry config for non-critical operations
export const LIGHT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 2,
  initialDelayMs: 500,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  retryableStatuses: [429, 502, 503, 504],
  jitterPercent: 20,
};

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number, 
  config: RetryConfig,
  retryAfterHeader?: string
): number {
  // If server specified Retry-After, respect it
  if (retryAfterHeader) {
    const retryAfter = parseInt(retryAfterHeader, 10);
    if (!isNaN(retryAfter)) {
      // Retry-After can be seconds or a date
      const delayMs = retryAfter > 1000 ? retryAfter : retryAfter * 1000;
      return Math.min(delayMs, config.maxDelayMs);
    }
  }

  // Exponential backoff: initialDelay * (multiplier ^ attempt)
  const exponentialDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
  
  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
  
  // Add random jitter to prevent thundering herd
  const jitterRange = cappedDelay * (config.jitterPercent / 100);
  const jitter = Math.random() * jitterRange - (jitterRange / 2);
  
  return Math.max(0, Math.round(cappedDelay + jitter));
}

/**
 * Check if an error is retryable based on status code
 */
function isRetryableStatus(status: number, config: RetryConfig): boolean {
  return config.retryableStatuses.includes(status);
}

// isRetryableError function is defined and exported at the end of this file

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a fetch request with exponential backoff
 * 
 * @param url - The URL to fetch
 * @param options - Fetch options (method, headers, body, etc.)
 * @param config - Retry configuration
 * @param operationName - Name for logging purposes
 * @returns RetryResult with response data or error
 */
export async function fetchWithRetry<T = unknown>(
  url: string,
  options: RequestInit,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  operationName: string = 'API call'
): Promise<RetryResult<T>> {
  let lastError: string | undefined;
  let lastStatus: number | undefined;
  let totalDelayMs = 0;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    const isRetry = attempt > 0;
    
    if (isRetry) {
      console.log(`[retry-utils] ${operationName}: Retry attempt ${attempt}/${config.maxRetries}`);
    }
    
    try {
      const response = await fetch(url, options);
      lastStatus = response.status;
      
      // Success case
      if (response.ok) {
        const data = await response.json() as T;
        
        if (isRetry) {
          console.log(`[retry-utils] ${operationName}: Succeeded after ${attempt} retries (total delay: ${totalDelayMs}ms)`);
        }
        
        return {
          success: true,
          data,
          attempts: attempt + 1,
          totalDelayMs,
          finalStatus: response.status,
        };
      }
      
      // Check if we should retry this status
      if (isRetryableStatus(response.status, config) && attempt < config.maxRetries) {
        const retryAfter = response.headers.get('Retry-After');
        const delayMs = calculateDelay(attempt, config, retryAfter ?? undefined);
        
        console.log(`[retry-utils] ${operationName}: Got ${response.status}, retrying in ${delayMs}ms...`);
        
        // Try to get error details for logging
        try {
          const errorBody = await response.text();
          console.log(`[retry-utils] ${operationName}: Error response: ${errorBody.substring(0, 200)}`);
          lastError = `HTTP ${response.status}: ${errorBody.substring(0, 100)}`;
        } catch {
          lastError = `HTTP ${response.status}`;
        }
        
        await sleep(delayMs);
        totalDelayMs += delayMs;
        continue;
      }
      
      // Non-retryable error status
      let errorMessage: string;
      try {
        const errorBody = await response.text();
        errorMessage = `HTTP ${response.status}: ${errorBody.substring(0, 200)}`;
      } catch {
        errorMessage = `HTTP ${response.status}`;
      }
      
      console.error(`[retry-utils] ${operationName}: Non-retryable error: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage,
        attempts: attempt + 1,
        totalDelayMs,
        finalStatus: response.status,
      };
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      lastError = errorMessage;
      
      // Check if this network error is retryable
      if (isRetryableError(error) && attempt < config.maxRetries) {
        const delayMs = calculateDelay(attempt, config);
        
        console.log(`[retry-utils] ${operationName}: Network error "${errorMessage}", retrying in ${delayMs}ms...`);
        
        await sleep(delayMs);
        totalDelayMs += delayMs;
        continue;
      }
      
      // Non-retryable network error or max retries reached
      console.error(`[retry-utils] ${operationName}: Failed after ${attempt + 1} attempts: ${errorMessage}`);
      
      return {
        success: false,
        error: errorMessage,
        attempts: attempt + 1,
        totalDelayMs,
      };
    }
  }
  
  // Max retries exhausted
  console.error(`[retry-utils] ${operationName}: Exhausted all ${config.maxRetries} retries. Last error: ${lastError}`);
  
  return {
    success: false,
    error: lastError || 'Max retries exhausted',
    attempts: config.maxRetries + 1,
    totalDelayMs,
    finalStatus: lastStatus,
  };
}

/**
 * Retry a generic async operation with exponential backoff
 * Useful for database operations or other non-fetch async work
 * 
 * @param operation - Async function to retry
 * @param config - Retry configuration
 * @param operationName - Name for logging purposes
 * @returns RetryResult with operation result or error
 */
export async function retryAsync<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  operationName: string = 'async operation'
): Promise<RetryResult<T>> {
  let lastError: string | undefined;
  let totalDelayMs = 0;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    const isRetry = attempt > 0;
    
    if (isRetry) {
      console.log(`[retry-utils] ${operationName}: Retry attempt ${attempt}/${config.maxRetries}`);
    }
    
    try {
      const result = await operation();
      
      if (isRetry) {
        console.log(`[retry-utils] ${operationName}: Succeeded after ${attempt} retries`);
      }
      
      return {
        success: true,
        data: result,
        attempts: attempt + 1,
        totalDelayMs,
      };
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      lastError = errorMessage;
      
      if (attempt < config.maxRetries) {
        const delayMs = calculateDelay(attempt, config);
        
        console.log(`[retry-utils] ${operationName}: Error "${errorMessage}", retrying in ${delayMs}ms...`);
        
        await sleep(delayMs);
        totalDelayMs += delayMs;
        continue;
      }
    }
  }
  
  console.error(`[retry-utils] ${operationName}: Failed after ${config.maxRetries + 1} attempts: ${lastError}`);
  
  return {
    success: false,
    error: lastError || 'Max retries exhausted',
    attempts: config.maxRetries + 1,
    totalDelayMs,
  };
}

/**
 * Helper to create a custom retry config
 */
export function createRetryConfig(overrides: Partial<RetryConfig>): RetryConfig {
  return {
    ...DEFAULT_RETRY_CONFIG,
    ...overrides,
  };
}

/**
 * Simple retry options for withRetry function
 */
export interface SimpleRetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  operationName?: string;
  onRetry?: (attempt: number, delay: number, error: Error) => void;
}

/**
 * Simplified retry function for async operations
 * This is a wrapper around retryAsync with a simpler interface
 * 
 * @param operation - Async function to retry
 * @param options - Simple retry options
 * @returns The result of the operation
 * @throws The last error if all retries fail
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: SimpleRetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    operationName = 'operation',
    onRetry
  } = options;

  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        // Calculate delay with exponential backoff and jitter
        const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
        const cappedDelay = Math.min(exponentialDelay, maxDelayMs);
        const jitter = Math.random() * cappedDelay * 0.25;
        const delay = Math.round(cappedDelay + jitter);
        
        if (onRetry) {
          onRetry(attempt + 1, delay, lastError);
        } else {
          console.log(`[withRetry] ${operationName}: Attempt ${attempt + 1} failed, retrying in ${delay}ms: ${lastError.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error(`[withRetry] ${operationName}: All ${maxRetries + 1} attempts failed`);
  throw lastError;
}

/**
 * Check if an error is retryable based on common patterns
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('timeout') ||
      message.includes('econnreset') ||
      message.includes('econnrefused') ||
      message.includes('network') ||
      message.includes('socket') ||
      message.includes('fetch failed') ||
      message.includes('aborted') ||
      message.includes('rate limit') ||
      message.includes('429') ||
      message.includes('503') ||
      message.includes('502')
    );
  }
  return false;
}
