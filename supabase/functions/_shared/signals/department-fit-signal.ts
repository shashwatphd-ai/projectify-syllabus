/**
 * Signal 3: Department Fit via Complete Org Info
 * 
 * Gets intent signals and department growth metrics using Apollo
 * Complete Organization Info API.
 * 
 * SOLID Principles:
 * - Single Responsibility: Only calculates department fit score
 * - Open/Closed: Implements SignalProvider interface
 * 
 * @module department-fit-signal
 */

import { 
  SignalResult, 
  SignalProvider, 
  SignalContext, 
  SignalName 
} from '../signal-types.ts';

// ============================================================================
// INTERFACES (from plan)
// ============================================================================

interface IntentSignalAccount {
  overall_intent: 'high' | 'medium' | 'low';
  total_visits: number;
  top_5_paths: string[];
}

interface EmployeeMetrics {
  [department: string]: {
    new: number;
    retained: number;
    churned: number;
  };
}

interface OrganizationIntelligence {
  intentSignals: IntentSignalAccount | null;
  employeeMetrics: EmployeeMetrics | null;
  technologies: Array<{ uid: string; name: string; category: string }>;
  buyingIntentScore: number;        // 0-1
  departmentGrowthScore: number;    // 0-1
  technologyMatchScore: number;     // 0-1
  combinedFitScore: number;         // 0-1
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Domain to department mapping */
const DOMAIN_TO_DEPARTMENT: Record<string, string> = {
  finance: 'finance',
  engineering: 'engineering',
  marketing: 'marketing',
  operations: 'operations',
  sales: 'sales',
  hr: 'human_resources',
  unknown: 'engineering' // default
};

// ============================================================================
// DEPARTMENT FIT SIGNAL PROVIDER
// ============================================================================

/**
 * Department Fit Signal Provider
 * 
 * Uses Apollo Complete Org Info API to assess:
 * - Buying intent signals
 * - Department growth metrics
 * - Technology stack match
 */
export const DepartmentFitSignal: SignalProvider = {
  name: 'department_fit' as SignalName,
  weight: 0.20, // 20% of composite score
  
  async calculate(context: SignalContext): Promise<SignalResult> {
    const { company, syllabusDomain, syllabusSkills, apolloApiKey } = context;
    
    console.log(`  🏢 [Signal 3] Fetching department fit for ${company.name}`);
    
    // Default result for edge cases
    const defaultResult: SignalResult = {
      score: 30, // Neutral baseline (30/100)
      confidence: 0.3,
      signals: ['Unable to assess department fit'],
      rawData: null
    };
    
    // Check if we have Apollo org ID
    if (!company.apollo_organization_id) {
      console.log(`     ⚠️ No Apollo org ID, using baseline score`);
      return {
        ...defaultResult,
        signals: ['No Apollo organization ID available'],
        error: 'Missing apollo_organization_id'
      };
    }
    
    // Check if API key is available
    if (!apolloApiKey) {
      console.log(`     ⚠️ No Apollo API key configured`);
      return {
        ...defaultResult,
        signals: ['Apollo API key not configured'],
        error: 'Missing apolloApiKey'
      };
    }
    
    try {
      const intelligence = await fetchOrganizationIntelligence(
        company.apollo_organization_id,
        syllabusDomain as keyof typeof DOMAIN_TO_DEPARTMENT,
        syllabusSkills,
        apolloApiKey
      );
      
      // Convert 0-1 score to 0-100
      const score = Math.round(intelligence.combinedFitScore * 100);
      
      // Generate human-readable signals
      const signals = generateSignalDescriptions(intelligence, syllabusDomain);
      
      // Calculate confidence based on data availability
      const confidence = calculateConfidence(intelligence);
      
      console.log(`     ✅ Score: ${score}/100`);
      
      return {
        score,
        confidence,
        signals,
        rawData: {
          intentSignals: intelligence.intentSignals,
          employeeMetrics: intelligence.employeeMetrics,
          technologies: intelligence.technologies.slice(0, 10),
          buyingIntentScore: intelligence.buyingIntentScore,
          departmentGrowthScore: intelligence.departmentGrowthScore,
          technologyMatchScore: intelligence.technologyMatchScore
        }
      };
      
    } catch (error) {
      console.error(`     ❌ Department fit failed:`, error);
      return {
        ...defaultResult,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};

// ============================================================================
// APOLLO COMPLETE ORG INFO API (from plan)
// ============================================================================

/**
 * SIGNAL 3: Company Intelligence via Complete Org Info
 * Gets intent signals and department growth metrics
 */
async function fetchOrganizationIntelligence(
  orgId: string,
  syllabusDomain: keyof typeof DOMAIN_TO_DEPARTMENT,
  syllabusSkills: string[],
  apolloApiKey: string
): Promise<OrganizationIntelligence> {
  const defaultResult: OrganizationIntelligence = {
    intentSignals: null,
    employeeMetrics: null,
    technologies: [],
    buyingIntentScore: 0.3,      // Neutral default
    departmentGrowthScore: 0.3,
    technologyMatchScore: 0.3,
    combinedFitScore: 0.3
  };
  
  try {
    const response = await fetch(
      `https://api.apollo.io/v1/organizations/${orgId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apolloApiKey
        }
      }
    );
    
    if (!response.ok) {
      console.warn(`     ⚠️ Complete Org API returned ${response.status} for ${orgId}`);
      return defaultResult;
    }
    
    const data = await response.json();
    const org = data.organization;
    
    if (!org) return defaultResult;
    
    // Extract signals
    const intentSignals = org.intent_signal_account || null;
    const employeeMetrics = org.employee_metrics || null;
    const technologies = org.current_technologies || [];
    
    // Calculate buying intent score
    let buyingIntentScore = 0.3;
    if (intentSignals) {
      buyingIntentScore = 
        intentSignals.overall_intent === 'high' ? 1.0 :
        intentSignals.overall_intent === 'medium' ? 0.6 : 0.3;
    }
    
    // Calculate department growth score
    let departmentGrowthScore = 0.3;
    if (employeeMetrics) {
      // Map syllabus domain to department
      const relevantDept = DOMAIN_TO_DEPARTMENT[syllabusDomain] || 'engineering';
      const deptMetrics = employeeMetrics[relevantDept];
      
      if (deptMetrics) {
        const growthRate = deptMetrics.new / Math.max(1, deptMetrics.retained);
        const churnRate = deptMetrics.churned / Math.max(1, deptMetrics.retained);
        
        // Growing department with low churn = best
        departmentGrowthScore = Math.min(1, 
          (growthRate * 0.7) + ((1 - churnRate) * 0.3)
        );
      }
    }
    
    // Calculate technology match score
    let technologyMatchScore = 0.3;
    if (technologies.length > 0 && syllabusSkills.length > 0) {
      const techNames = technologies.map((t: { name: string }) => t.name.toLowerCase());
      const matchCount = syllabusSkills.filter(skill => 
        techNames.some((tech: string) => 
          tech.includes(skill.toLowerCase()) || 
          skill.toLowerCase().includes(tech)
        )
      ).length;
      
      technologyMatchScore = Math.min(1, matchCount / Math.min(5, syllabusSkills.length));
    }
    
    // Combined fit score (weighted average)
    const combinedFitScore = 
      (buyingIntentScore * 0.4) + 
      (departmentGrowthScore * 0.4) + 
      (technologyMatchScore * 0.2);
    
    return {
      intentSignals,
      employeeMetrics,
      technologies,
      buyingIntentScore,
      departmentGrowthScore,
      technologyMatchScore,
      combinedFitScore
    };
    
  } catch (error) {
    console.error(`     ❌ Failed to fetch org intelligence for ${orgId}:`, error);
    return defaultResult;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate confidence based on data availability
 */
function calculateConfidence(intelligence: OrganizationIntelligence): number {
  let dataPoints = 0;
  
  if (intelligence.intentSignals) dataPoints++;
  if (intelligence.employeeMetrics) dataPoints++;
  if (intelligence.technologies.length > 0) dataPoints++;
  
  // More data sources = higher confidence
  return Math.round((dataPoints / 3) * 100) / 100;
}

/**
 * Generate human-readable signal descriptions
 */
function generateSignalDescriptions(
  intelligence: OrganizationIntelligence,
  syllabusDomain: string
): string[] {
  const signals: string[] = [];
  
  // Intent signals
  if (intelligence.intentSignals) {
    const intent = intelligence.intentSignals.overall_intent;
    if (intent === 'high') {
      signals.push('High buying intent detected');
    } else if (intent === 'medium') {
      signals.push('Moderate buying intent detected');
    }
  }
  
  // Department growth
  if (intelligence.departmentGrowthScore > 0.6) {
    const dept = DOMAIN_TO_DEPARTMENT[syllabusDomain] || 'engineering';
    signals.push(`${dept.charAt(0).toUpperCase() + dept.slice(1)} department is growing`);
  } else if (intelligence.departmentGrowthScore < 0.3) {
    signals.push('Relevant department shows limited growth');
  }
  
  // Technology match
  if (intelligence.technologyMatchScore > 0.5) {
    signals.push('Technology stack aligns with syllabus skills');
  }
  
  // Technologies found
  if (intelligence.technologies.length > 0) {
    const techCount = intelligence.technologies.length;
    signals.push(`${techCount} technologies identified`);
  }
  
  if (signals.length === 0) {
    signals.push('Limited organizational intelligence available');
  }
  
  return signals;
}

export default DepartmentFitSignal;
