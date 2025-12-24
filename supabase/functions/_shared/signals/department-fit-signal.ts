/**
 * Signal 3: Department Fit via Complete Org Info
 * 
 * Uses REAL Apollo API fields:
 * - departmental_head_count: Employee counts by department
 * - funding_events: Recent funding activity
 * - current_technologies: Technology stack
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
// INTERFACES (Based on REAL Apollo API response)
// ============================================================================

/**
 * Real Apollo departmental_head_count structure
 * Key: department name, Value: employee count
 */
interface DepartmentalHeadCount {
  [department: string]: number;
}

/**
 * Real Apollo funding_events structure
 */
interface FundingEvent {
  id: string;
  date: string;
  news_url: string;
  type: string;
  investors: string;
  amount: string;
  currency: string;
}

/**
 * Real Apollo current_technologies structure
 */
interface Technology {
  uid: string;
  name: string;
  category: string;
}

interface OrganizationIntelligence {
  departmentalHeadCount: DepartmentalHeadCount | null;
  fundingEvents: FundingEvent[];
  technologies: Technology[];
  departmentGrowthScore: number;    // 0-1 based on relevant dept size
  fundingActivityScore: number;     // 0-1 based on recent funding
  technologyMatchScore: number;     // 0-1 based on skill alignment
  combinedFitScore: number;         // 0-1 weighted average
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Map syllabus domains to Apollo department names */
const SYLLABUS_TO_APOLLO_DEPT: Record<string, string[]> = {
  finance: ['finance', 'accounting'],
  engineering: ['engineering', 'product_management', 'design'],
  marketing: ['marketing', 'media_and_commmunication'],
  operations: ['operations', 'support'],
  sales: ['sales', 'business_development'],
  hr: ['human_resources', 'consulting'],
  data: ['engineering', 'product_management'],
  it: ['engineering', 'information_technology'],
  unknown: ['engineering']
};

/** Funding types that indicate growth/investment */
const POSITIVE_FUNDING_TYPES = [
  'Series A', 'Series B', 'Series C', 'Series D', 'Series E',
  'Seed', 'Growth Equity', 'Private Equity', 'Venture'
];

// ============================================================================
// DEPARTMENT FIT SIGNAL PROVIDER
// ============================================================================

/**
 * Department Fit Signal Provider
 * 
 * Uses Apollo Complete Org Info API with REAL fields:
 * - departmental_head_count (department sizes)
 * - funding_events (funding activity)
 * - current_technologies (tech stack)
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
        syllabusDomain,
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
          departmentalHeadCount: intelligence.departmentalHeadCount,
          fundingEvents: intelligence.fundingEvents.slice(0, 5), // Last 5 events
          technologies: intelligence.technologies.slice(0, 10),
          departmentGrowthScore: intelligence.departmentGrowthScore,
          fundingActivityScore: intelligence.fundingActivityScore,
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
// APOLLO COMPLETE ORG INFO API (Using REAL fields)
// ============================================================================

/**
 * SIGNAL 3: Company Intelligence via Complete Org Info
 * Uses REAL Apollo fields: departmental_head_count, funding_events, current_technologies
 */
async function fetchOrganizationIntelligence(
  orgId: string,
  syllabusDomain: string,
  syllabusSkills: string[],
  apolloApiKey: string
): Promise<OrganizationIntelligence> {
  const defaultResult: OrganizationIntelligence = {
    departmentalHeadCount: null,
    fundingEvents: [],
    technologies: [],
    departmentGrowthScore: 0.3,      // Neutral default
    fundingActivityScore: 0.3,
    technologyMatchScore: 0.3,
    combinedFitScore: 0.3
  };
  
  try {
    const response = await fetch(
      `https://api.apollo.io/api/v1/organizations/${orgId}`,
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
    
    // Extract REAL Apollo fields
    const departmentalHeadCount: DepartmentalHeadCount = org.departmental_head_count || {};
    const fundingEvents: FundingEvent[] = org.funding_events || [];
    const technologies: Technology[] = org.current_technologies || [];
    
    console.log(`     📊 Dept counts: ${Object.keys(departmentalHeadCount).length} depts`);
    console.log(`     💰 Funding events: ${fundingEvents.length}`);
    console.log(`     🔧 Technologies: ${technologies.length}`);
    
    // Calculate department growth score based on relevant department size
    const departmentGrowthScore = calculateDepartmentScore(
      departmentalHeadCount, 
      syllabusDomain
    );
    
    // Calculate funding activity score
    const fundingActivityScore = calculateFundingScore(fundingEvents);
    
    // Calculate technology match score
    const technologyMatchScore = calculateTechnologyScore(
      technologies, 
      syllabusSkills
    );
    
    // Combined fit score (weighted average)
    // Department size: 40%, Funding activity: 35%, Tech match: 25%
    const combinedFitScore = 
      (departmentGrowthScore * 0.40) + 
      (fundingActivityScore * 0.35) + 
      (technologyMatchScore * 0.25);
    
    return {
      departmentalHeadCount,
      fundingEvents,
      technologies,
      departmentGrowthScore,
      fundingActivityScore,
      technologyMatchScore,
      combinedFitScore
    };
    
  } catch (error) {
    console.error(`     ❌ Failed to fetch org intelligence for ${orgId}:`, error);
    return defaultResult;
  }
}

// ============================================================================
// SCORING FUNCTIONS
// ============================================================================

/**
 * Calculate score based on relevant department size
 * Larger relevant departments = higher capacity for student projects
 */
function calculateDepartmentScore(
  deptCounts: DepartmentalHeadCount,
  syllabusDomain: string
): number {
  if (!deptCounts || Object.keys(deptCounts).length === 0) {
    return 0.3; // Neutral if no data
  }
  
  // Get relevant Apollo department names for this syllabus domain
  const relevantDepts = SYLLABUS_TO_APOLLO_DEPT[syllabusDomain.toLowerCase()] 
    || SYLLABUS_TO_APOLLO_DEPT['unknown'];
  
  // Sum up employees in relevant departments
  let relevantCount = 0;
  let totalCount = 0;
  
  for (const [dept, count] of Object.entries(deptCounts)) {
    totalCount += count;
    if (relevantDepts.some(rd => dept.toLowerCase().includes(rd))) {
      relevantCount += count;
    }
  }
  
  if (totalCount === 0) return 0.3;
  
  // Score based on:
  // 1. Absolute size of relevant department (capacity)
  // 2. Proportion of relevant department (focus)
  
  // Capacity score: More than 50 employees in relevant dept = max
  const capacityScore = Math.min(1, relevantCount / 50);
  
  // Focus score: Higher proportion = more relevant
  const focusScore = relevantCount / totalCount;
  
  // Weight capacity more than focus
  return (capacityScore * 0.7) + (focusScore * 0.3);
}

/**
 * Calculate score based on funding activity
 * Recent funding indicates growth and resources for projects
 */
function calculateFundingScore(fundingEvents: FundingEvent[]): number {
  if (!fundingEvents || fundingEvents.length === 0) {
    return 0.3; // Neutral if no funding data
  }
  
  const now = new Date();
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const twoYearsAgo = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);
  
  let score = 0.3; // Base score
  
  for (const event of fundingEvents) {
    const eventDate = new Date(event.date);
    const isPositiveFunding = POSITIVE_FUNDING_TYPES.some(
      type => event.type?.toLowerCase().includes(type.toLowerCase())
    );
    
    if (isPositiveFunding) {
      // Recent funding (within 1 year) = big boost
      if (eventDate > oneYearAgo) {
        score += 0.3;
      } 
      // Funding within 2 years = moderate boost
      else if (eventDate > twoYearsAgo) {
        score += 0.15;
      }
      // Older funding = small boost
      else {
        score += 0.05;
      }
    }
  }
  
  return Math.min(1, score);
}

/**
 * Calculate score based on technology stack alignment
 * Better match = higher chance of relevant project work
 */
function calculateTechnologyScore(
  technologies: Technology[],
  syllabusSkills: string[]
): number {
  if (!technologies || technologies.length === 0) {
    return 0.3; // Neutral if no tech data
  }
  
  if (!syllabusSkills || syllabusSkills.length === 0) {
    return 0.4; // Slightly above neutral if we have tech but no skills to match
  }
  
  const techNames = technologies.map(t => t.name.toLowerCase());
  const techCategories = technologies.map(t => t.category?.toLowerCase() || '');
  
  let matchCount = 0;
  
  for (const skill of syllabusSkills) {
    const skillLower = skill.toLowerCase();
    
    // Check direct tech name match
    const nameMatch = techNames.some(tech => 
      tech.includes(skillLower) || skillLower.includes(tech)
    );
    
    // Check category match (broader)
    const categoryMatch = techCategories.some(cat => 
      cat.includes(skillLower) || skillLower.includes(cat)
    );
    
    if (nameMatch) {
      matchCount += 1;
    } else if (categoryMatch) {
      matchCount += 0.5; // Partial credit for category match
    }
  }
  
  // Score: How many skills matched vs total skills (cap at 5 for normalization)
  const maxSkillsToConsider = Math.min(5, syllabusSkills.length);
  return Math.min(1, matchCount / maxSkillsToConsider);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate confidence based on data availability
 */
function calculateConfidence(intelligence: OrganizationIntelligence): number {
  let dataPoints = 0;
  
  if (intelligence.departmentalHeadCount && 
      Object.keys(intelligence.departmentalHeadCount).length > 0) {
    dataPoints++;
  }
  if (intelligence.fundingEvents.length > 0) dataPoints++;
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
  
  // Department size signals
  if (intelligence.departmentalHeadCount) {
    const relevantDepts = SYLLABUS_TO_APOLLO_DEPT[syllabusDomain.toLowerCase()] 
      || SYLLABUS_TO_APOLLO_DEPT['unknown'];
    
    let relevantCount = 0;
    for (const [dept, count] of Object.entries(intelligence.departmentalHeadCount)) {
      if (relevantDepts.some(rd => dept.toLowerCase().includes(rd))) {
        relevantCount += count;
      }
    }
    
    if (relevantCount > 50) {
      signals.push(`Large ${syllabusDomain} team (${relevantCount}+ employees)`);
    } else if (relevantCount > 20) {
      signals.push(`Growing ${syllabusDomain} team (${relevantCount} employees)`);
    } else if (relevantCount > 0) {
      signals.push(`${syllabusDomain} team present (${relevantCount} employees)`);
    }
  }
  
  // Funding signals
  if (intelligence.fundingActivityScore > 0.6) {
    const recentFunding = intelligence.fundingEvents[0];
    if (recentFunding) {
      signals.push(`Recent funding: ${recentFunding.type || 'Investment'}`);
    }
  } else if (intelligence.fundingEvents.length > 0) {
    signals.push(`${intelligence.fundingEvents.length} funding rounds on record`);
  }
  
  // Technology match signals
  if (intelligence.technologyMatchScore > 0.6) {
    signals.push('Strong technology stack alignment');
  } else if (intelligence.technologyMatchScore > 0.4) {
    signals.push('Moderate technology overlap');
  }
  
  // Technologies found
  if (intelligence.technologies.length > 0) {
    const topTech = intelligence.technologies.slice(0, 3).map(t => t.name);
    signals.push(`Tech stack: ${topTech.join(', ')}`);
  }
  
  if (signals.length === 0) {
    signals.push('Limited organizational intelligence available');
  }
  
  return signals;
}

export default DepartmentFitSignal;
