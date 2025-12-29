/**
 * Circuit Breaker Pattern - Bit 2.8
 * Prevents cascading failures when external APIs are experiencing issues
 * 
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Circuit tripped, requests fail fast without calling API
 * - HALF_OPEN: Testing if API recovered, limited requests allowed
 */

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  /** Number of failures before opening the circuit */
  failureThreshold: number;
  /** Time in ms before attempting recovery (half-open state) */
  resetTimeoutMs: number;
  /** Number of successful calls needed to close circuit from half-open */
  successThreshold: number;
  /** Name for logging purposes */
  name: string;
  /** Optional callback when circuit opens */
  onOpen?: (stats: CircuitStats) => void;
  /** Optional callback when circuit closes */
  onClose?: (stats: CircuitStats) => void;
  /** Optional callback when circuit half-opens */
  onHalfOpen?: (stats: CircuitStats) => void;
}

export interface CircuitStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
}

export interface CircuitBreakerResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  circuitState: CircuitState;
  wasShortCircuited: boolean;
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

export const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 30000, // 30 seconds
  successThreshold: 2,
  name: 'default',
};

/** Apollo API - more tolerant due to importance */
export const APOLLO_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 60000, // 1 minute
  successThreshold: 2,
  name: 'apollo-api',
};

/** AI Gateway - quick recovery attempts */
export const AI_GATEWAY_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 3,
  resetTimeoutMs: 30000, // 30 seconds
  successThreshold: 1,
  name: 'ai-gateway',
};

/** Google APIs - standard tolerance */
export const GOOGLE_API_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 4,
  resetTimeoutMs: 45000, // 45 seconds
  successThreshold: 2,
  name: 'google-api',
};

/** Email service - quick fail, quick recover */
export const EMAIL_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 3,
  resetTimeoutMs: 20000, // 20 seconds
  successThreshold: 1,
  name: 'email-service',
};

// ============================================================================
// CIRCUIT BREAKER CLASS
// ============================================================================

/**
 * Circuit Breaker implementation
 * 
 * Usage:
 * ```typescript
 * const breaker = new CircuitBreaker(APOLLO_CIRCUIT_CONFIG);
 * const result = await breaker.execute(() => fetchApolloData());
 * ```
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private totalRequests: number = 0;
  private totalFailures: number = 0;
  private totalSuccesses: number = 0;
  private consecutiveFailures: number = 0;
  private consecutiveSuccesses: number = 0;
  
  constructor(private config: CircuitBreakerConfig) {}
  
  /**
   * Get current circuit statistics
   */
  getStats(): CircuitStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      consecutiveFailures: this.consecutiveFailures,
      consecutiveSuccesses: this.consecutiveSuccesses,
    };
  }
  
  /**
   * Check if circuit should transition to half-open
   */
  private shouldAttemptReset(): boolean {
    if (this.state !== CircuitState.OPEN) return false;
    if (!this.lastFailureTime) return true;
    
    const elapsed = Date.now() - this.lastFailureTime;
    return elapsed >= this.config.resetTimeoutMs;
  }
  
  /**
   * Transition circuit to a new state
   */
  private transitionTo(newState: CircuitState): void {
    if (this.state === newState) return;
    
    const oldState = this.state;
    this.state = newState;
    const stats = this.getStats();
    
    console.log(`[circuit-breaker:${this.config.name}] State transition: ${oldState} → ${newState}`);
    
    switch (newState) {
      case CircuitState.OPEN:
        this.config.onOpen?.(stats);
        console.warn(`[circuit-breaker:${this.config.name}] 🔴 CIRCUIT OPEN - Failing fast for ${this.config.resetTimeoutMs}ms`);
        break;
      case CircuitState.HALF_OPEN:
        this.successes = 0; // Reset success counter for half-open testing
        this.config.onHalfOpen?.(stats);
        console.log(`[circuit-breaker:${this.config.name}] 🟡 CIRCUIT HALF-OPEN - Testing recovery...`);
        break;
      case CircuitState.CLOSED:
        this.failures = 0;
        this.consecutiveFailures = 0;
        this.config.onClose?.(stats);
        console.log(`[circuit-breaker:${this.config.name}] 🟢 CIRCUIT CLOSED - Normal operation resumed`);
        break;
    }
  }
  
  /**
   * Record a successful operation
   */
  private recordSuccess(): void {
    this.successes++;
    this.totalSuccesses++;
    this.consecutiveSuccesses++;
    this.consecutiveFailures = 0;
    this.lastSuccessTime = Date.now();
    
    if (this.state === CircuitState.HALF_OPEN) {
      if (this.successes >= this.config.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
      }
    }
  }
  
  /**
   * Record a failed operation
   */
  private recordFailure(error: unknown): void {
    this.failures++;
    this.totalFailures++;
    this.consecutiveFailures++;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = Date.now();
    
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[circuit-breaker:${this.config.name}] Failure recorded: ${errorMsg} (${this.failures}/${this.config.failureThreshold})`);
    
    if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in half-open state reopens the circuit
      this.transitionTo(CircuitState.OPEN);
    } else if (this.state === CircuitState.CLOSED) {
      if (this.failures >= this.config.failureThreshold) {
        this.transitionTo(CircuitState.OPEN);
      }
    }
  }
  
  /**
   * Check if the circuit allows requests
   */
  isAllowed(): boolean {
    if (this.state === CircuitState.CLOSED) {
      return true;
    }
    
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.transitionTo(CircuitState.HALF_OPEN);
        return true;
      }
      return false;
    }
    
    // HALF_OPEN - allow limited requests
    return true;
  }
  
  /**
   * Execute an operation through the circuit breaker
   */
  async execute<T>(operation: () => Promise<T>): Promise<CircuitBreakerResult<T>> {
    this.totalRequests++;
    
    // Check if circuit allows this request
    if (!this.isAllowed()) {
      const timeRemaining = this.lastFailureTime 
        ? Math.max(0, this.config.resetTimeoutMs - (Date.now() - this.lastFailureTime))
        : 0;
      
      console.warn(`[circuit-breaker:${this.config.name}] Request short-circuited (${timeRemaining}ms until retry)`);
      
      return {
        success: false,
        error: `Circuit breaker OPEN for ${this.config.name}. Retry in ${Math.ceil(timeRemaining / 1000)}s`,
        circuitState: this.state,
        wasShortCircuited: true,
      };
    }
    
    try {
      const data = await operation();
      this.recordSuccess();
      
      return {
        success: true,
        data,
        circuitState: this.state,
        wasShortCircuited: false,
      };
    } catch (error) {
      this.recordFailure(error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        circuitState: this.state,
        wasShortCircuited: false,
      };
    }
  }
  
  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    console.log(`[circuit-breaker:${this.config.name}] Manual reset`);
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
  }
  
  /**
   * Force the circuit open (for testing or manual intervention)
   */
  forceOpen(): void {
    console.warn(`[circuit-breaker:${this.config.name}] Forced OPEN`);
    this.transitionTo(CircuitState.OPEN);
    this.lastFailureTime = Date.now();
  }
}

// ============================================================================
// GLOBAL CIRCUIT BREAKER REGISTRY
// ============================================================================

/**
 * Global registry of circuit breakers
 * Allows sharing state across function invocations within same isolate
 */
const circuitRegistry = new Map<string, CircuitBreaker>();

/**
 * Get or create a circuit breaker by name
 */
export function getCircuitBreaker(config: CircuitBreakerConfig): CircuitBreaker {
  const existing = circuitRegistry.get(config.name);
  if (existing) {
    return existing;
  }
  
  const breaker = new CircuitBreaker(config);
  circuitRegistry.set(config.name, breaker);
  return breaker;
}

/**
 * Get all circuit breaker stats for monitoring
 */
export function getAllCircuitStats(): Record<string, CircuitStats> {
  const stats: Record<string, CircuitStats> = {};
  for (const [name, breaker] of circuitRegistry) {
    stats[name] = breaker.getStats();
  }
  return stats;
}

/**
 * Reset all circuit breakers
 */
export function resetAllCircuits(): void {
  for (const breaker of circuitRegistry.values()) {
    breaker.reset();
  }
}

// ============================================================================
// CONVENIENCE WRAPPERS
// ============================================================================

/**
 * Execute an Apollo API call through the circuit breaker
 */
export async function withApolloCircuit<T>(
  operation: () => Promise<T>
): Promise<CircuitBreakerResult<T>> {
  const breaker = getCircuitBreaker(APOLLO_CIRCUIT_CONFIG);
  return breaker.execute(operation);
}

/**
 * Execute an AI Gateway call through the circuit breaker
 */
export async function withAICircuit<T>(
  operation: () => Promise<T>
): Promise<CircuitBreakerResult<T>> {
  const breaker = getCircuitBreaker(AI_GATEWAY_CIRCUIT_CONFIG);
  return breaker.execute(operation);
}

/**
 * Execute a Google API call through the circuit breaker
 */
export async function withGoogleCircuit<T>(
  operation: () => Promise<T>
): Promise<CircuitBreakerResult<T>> {
  const breaker = getCircuitBreaker(GOOGLE_API_CIRCUIT_CONFIG);
  return breaker.execute(operation);
}

/**
 * Execute an email service call through the circuit breaker
 */
export async function withEmailCircuit<T>(
  operation: () => Promise<T>
): Promise<CircuitBreakerResult<T>> {
  const breaker = getCircuitBreaker(EMAIL_CIRCUIT_CONFIG);
  return breaker.execute(operation);
}

// ============================================================================
// HEALTH CHECK HELPER
// ============================================================================

/**
 * Check overall circuit breaker health
 */
export function getCircuitHealth(): {
  healthy: boolean;
  openCircuits: string[];
  stats: Record<string, CircuitStats>;
} {
  const stats = getAllCircuitStats();
  const openCircuits = Object.entries(stats)
    .filter(([_, s]) => s.state === CircuitState.OPEN)
    .map(([name]) => name);
  
  return {
    healthy: openCircuits.length === 0,
    openCircuits,
    stats,
  };
}
