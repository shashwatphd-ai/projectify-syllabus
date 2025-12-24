/**
 * Signal Services - Barrel Export
 * 
 * All signal providers are exported from here for clean imports.
 * Each signal implements the SignalProvider interface.
 * 
 * Usage:
 * import { JobSkillsSignal, MarketIntelSignal } from '../_shared/signals';
 */

// Signal implementations
export { JobSkillsSignal } from './job-skills-signal.ts';
// export { MarketIntelSignal } from './market-intel-signal.ts';  // Step 4
// export { DepartmentFitSignal } from './department-fit-signal.ts';  // Step 5
// export { ContactQualitySignal } from './contact-quality-signal.ts';  // Step 6

// Re-export types for convenience
export type { 
  SignalResult, 
  SignalProvider, 
  SignalContext,
  SignalName,
  CompositeScore,
  SignalScores 
} from '../signal-types.ts';
