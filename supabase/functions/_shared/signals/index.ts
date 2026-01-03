/**
 * Signal Services - Barrel Export
 * 
 * All signal providers and orchestrator are exported from here for clean imports.
 * Each signal implements the SignalProvider interface.
 * 
 * Usage:
 * import { calculateCompanySignals, JobSkillsSignal } from '../_shared/signals';
 */

// Signal implementations
export { JobSkillsSignal } from './job-skills-signal.ts';
export { MarketIntelSignal } from './market-intel-signal.ts';
export { DepartmentFitSignal } from './department-fit-signal.ts';
export { ContactQualitySignal } from './contact-quality-signal.ts';

// Hiring signal (Phase 1 of Smart Hiring Integration)
export { 
  HiringSignal, 
  calculateHiringScore, 
  hasActiveJobs, 
  getHiringStats 
} from './hiring-signal.ts';

// Orchestrator (Step 7)
export {
  calculateCompanySignals,
  calculateBatchSignals,
  filterAndRankCompanies,
  toStorableSignalData,
  prepareSignalUpdates,
  SIGNAL_PROVIDERS
} from './signal-orchestrator.ts';

// Re-export types for convenience
export type { 
  SignalResult, 
  SignalProvider, 
  SignalContext,
  SignalName,
  CompositeScore,
  SignalScores,
  CompanyForSignal,
  StorableSignalData
} from '../signal-types.ts';
