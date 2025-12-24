// Signal Components - Barrel Export
// Dependency Inversion: Components depend on abstractions (types), not concretions

export { SignalScoreCard } from './SignalScoreCard';
export { SignalBreakdownGrid } from './SignalBreakdownGrid';
export { MatchInsightsCard } from './MatchInsightsCard';
export { CompactSignalIndicator } from './CompactSignalIndicator';
export { EvidenceBasedSignalCard } from './EvidenceBasedSignalCard';
export { ProfessionalSignalDashboard } from './ProfessionalSignalDashboard';

export { 
  mapCompanyToSignals, 
  parseSignalData, 
  parseJobPostings 
} from './types';

export type { 
  SignalScore, 
  SignalBreakdownItem, 
  CompanySignals, 
  SignalData, 
  JobPosting 
} from './types';
