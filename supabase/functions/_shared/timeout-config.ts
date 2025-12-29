/**
 * Timeout Configuration - Bit 2.7
 * Centralized timeout settings for all edge functions
 * 
 * Purpose:
 * - Prevent hanging requests
 * - Ensure consistent timeout behavior
 * - Provide operation-specific timeout tuning
 */

// ============================================================================
// TIMEOUT CONSTANTS (milliseconds)
// ============================================================================

/** External API calls (Apollo, Google, etc.) - 30 seconds */
export const API_TIMEOUT_MS = 30000;

/** AI Gateway calls (Gemini, GPT) - 60 seconds for complex generation */
export const AI_GATEWAY_TIMEOUT_MS = 60000;

/** Quick AI calls (classification, extraction) - 30 seconds */
export const AI_QUICK_TIMEOUT_MS = 30000;

/** Database operations - 15 seconds */
export const DB_TIMEOUT_MS = 15000;

/** Health checks and simple validations - 5 seconds */
export const HEALTH_CHECK_TIMEOUT_MS = 5000;

/** File operations (storage upload/download) - 30 seconds */
export const FILE_TIMEOUT_MS = 30000;

/** Email sending - 10 seconds */
export const EMAIL_TIMEOUT_MS = 10000;

/** Webhook delivery - 10 seconds */
export const WEBHOOK_TIMEOUT_MS = 10000;

/** Signal calculation (per signal) - 10 seconds */
export const SIGNAL_TIMEOUT_MS = 10000;

/** Full signal orchestration - 30 seconds */
export const SIGNAL_ORCHESTRATION_TIMEOUT_MS = 30000;

/** Project generation (full pipeline) - 5 minutes */
export const GENERATION_TIMEOUT_MS = 300000;

/** Company discovery - 2 minutes */
export const DISCOVERY_TIMEOUT_MS = 120000;

/** Enrichment operations - 60 seconds */
export const ENRICHMENT_TIMEOUT_MS = 60000;

// ============================================================================
// OPERATION-SPECIFIC TIMEOUT CONFIGS
// ============================================================================

export interface TimeoutConfig {
  timeoutMs: number;
  operationName: string;
  allowRetry: boolean;
}

export const TIMEOUT_CONFIGS: Record<string, TimeoutConfig> = {
  // External APIs
  apollo_search: { timeoutMs: API_TIMEOUT_MS, operationName: 'Apollo Search', allowRetry: true },
  apollo_enrich: { timeoutMs: API_TIMEOUT_MS, operationName: 'Apollo Enrichment', allowRetry: true },
  google_geocode: { timeoutMs: API_TIMEOUT_MS, operationName: 'Google Geocoding', allowRetry: true },
  google_places: { timeoutMs: API_TIMEOUT_MS, operationName: 'Google Places', allowRetry: true },
  
  // AI Operations
  ai_generation: { timeoutMs: AI_GATEWAY_TIMEOUT_MS, operationName: 'AI Project Generation', allowRetry: false },
  ai_classification: { timeoutMs: AI_QUICK_TIMEOUT_MS, operationName: 'AI Classification', allowRetry: true },
  ai_extraction: { timeoutMs: AI_QUICK_TIMEOUT_MS, operationName: 'AI Data Extraction', allowRetry: true },
  ai_syllabus_parse: { timeoutMs: AI_GATEWAY_TIMEOUT_MS, operationName: 'AI Syllabus Parse', allowRetry: false },
  
  // Database
  db_read: { timeoutMs: DB_TIMEOUT_MS, operationName: 'Database Read', allowRetry: true },
  db_write: { timeoutMs: DB_TIMEOUT_MS, operationName: 'Database Write', allowRetry: false },
  db_transaction: { timeoutMs: DB_TIMEOUT_MS * 2, operationName: 'Database Transaction', allowRetry: false },
  
  // Other
  health_check: { timeoutMs: HEALTH_CHECK_TIMEOUT_MS, operationName: 'Health Check', allowRetry: false },
  email_send: { timeoutMs: EMAIL_TIMEOUT_MS, operationName: 'Email Send', allowRetry: true },
  file_upload: { timeoutMs: FILE_TIMEOUT_MS, operationName: 'File Upload', allowRetry: false },
  file_download: { timeoutMs: FILE_TIMEOUT_MS, operationName: 'File Download', allowRetry: true },
};

// ============================================================================
// TIMEOUT UTILITIES
// ============================================================================

/**
 * Create an AbortSignal with a timeout
 * Uses the modern AbortSignal.timeout() when available
 */
export function createTimeoutSignal(timeoutMs: number): AbortSignal {
  return AbortSignal.timeout(timeoutMs);
}

/**
 * Create an AbortController with automatic timeout
 * Returns both controller and cleanup function
 */
export function createTimeoutController(timeoutMs: number): {
  controller: AbortController;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  return {
    controller,
    cleanup: () => clearTimeout(timeoutId),
  };
}

/**
 * Wrap a promise with a timeout
 * Rejects with TimeoutError if operation exceeds timeout
 * Supports both Promise and PromiseLike (thenable) objects
 */
export async function withTimeout<T>(
  promiseOrThenable: Promise<T> | PromiseLike<T>,
  timeoutMs: number,
  operationName: string = 'Operation'
): Promise<T> {
  // Convert PromiseLike to proper Promise
  const promise = Promise.resolve(promiseOrThenable);
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new TimeoutError(`${operationName} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
}

/**
 * Fetch with built-in timeout
 * Wraps standard fetch with AbortSignal.timeout
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = API_TIMEOUT_MS,
  operationName: string = 'Fetch'
): Promise<Response> {
  const signal = createTimeoutSignal(timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new TimeoutError(`${operationName} timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * Race multiple promises with a timeout
 * Useful for parallel operations that should all complete within a time limit
 */
export async function raceWithTimeout<T>(
  promises: Promise<T>[],
  timeoutMs: number,
  operationName: string = 'Race operation'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new TimeoutError(`${operationName} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  
  return Promise.race([...promises, timeoutPromise]);
}

/**
 * Execute all promises with a collective timeout
 * All must complete within the timeout
 */
export async function allWithTimeout<T>(
  promises: Promise<T>[],
  timeoutMs: number,
  operationName: string = 'Parallel operation'
): Promise<T[]> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new TimeoutError(`${operationName} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  
  return Promise.race([
    Promise.all(promises),
    timeoutPromise,
  ]);
}

// ============================================================================
// TIMEOUT ERROR CLASS
// ============================================================================

export class TimeoutError extends Error {
  readonly isTimeout = true;
  readonly code = 'TIMEOUT';
  
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Check if an error is a timeout error
 */
export function isTimeoutError(error: unknown): error is TimeoutError {
  if (error instanceof TimeoutError) {
    return true;
  }
  if (error instanceof Error) {
    return (
      error.name === 'AbortError' ||
      error.name === 'TimeoutError' ||
      error.message.toLowerCase().includes('timeout') ||
      error.message.toLowerCase().includes('aborted')
    );
  }
  return false;
}

// ============================================================================
// LOGGING HELPERS
// ============================================================================

/**
 * Log timeout event with context
 */
export function logTimeout(
  operationName: string,
  timeoutMs: number,
  context?: Record<string, unknown>
): void {
  console.error(`[timeout] ⏱️ ${operationName} exceeded ${timeoutMs}ms limit`, context || {});
}

/**
 * Log successful completion within timeout
 */
export function logTimingSuccess(
  operationName: string,
  durationMs: number,
  timeoutMs: number
): void {
  const percentUsed = Math.round((durationMs / timeoutMs) * 100);
  const level = percentUsed > 80 ? 'warn' : 'log';
  
  console[level](`[timing] ✓ ${operationName} completed in ${durationMs}ms (${percentUsed}% of ${timeoutMs}ms limit)`);
}

// ============================================================================
// TIMING UTILITIES
// ============================================================================

/**
 * Measure and log operation timing
 */
export async function measureTiming<T>(
  operation: () => Promise<T>,
  operationName: string,
  timeoutMs?: number
): Promise<{ result: T; durationMs: number }> {
  const startTime = Date.now();
  
  try {
    const result = await operation();
    const durationMs = Date.now() - startTime;
    
    if (timeoutMs) {
      logTimingSuccess(operationName, durationMs, timeoutMs);
    } else {
      console.log(`[timing] ${operationName} completed in ${durationMs}ms`);
    }
    
    return { result, durationMs };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error(`[timing] ${operationName} failed after ${durationMs}ms:`, error);
    throw error;
  }
}
