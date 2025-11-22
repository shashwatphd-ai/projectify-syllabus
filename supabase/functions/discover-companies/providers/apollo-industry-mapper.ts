/**
 * Apollo Industry Taxonomy Mapper
 *
 * Translates generic SOC/O*NET industry keywords into Apollo's industry keyword terms.
 * This prevents false matches from overly broad searches.
 *
 * CRITICAL: Apollo keyword-based filtering using q_organization_keyword_tags
 * - keyword_tags: Matches industry keywords in company description/profile
 * - More flexible than numeric taxonomy IDs (which require exact mapping)
 *
 * CONTEXT-AWARE EXCLUSION:
 * - Engineering courses: Exclude staffing/HR companies (they don't provide projects)
 * - Business/HR courses: Include staffing/HR companies (they ARE the target industry)
 * - Hybrid courses: Smart decision based on primary occupation
 *
 * NOTE: Returns industry keyword strings for Apollo's q_organization_keyword_tags parameter
 */

import { SOCMapping } from '../../_shared/course-soc-mapping.ts';
import { classifyCourseDomain, CourseDomain } from '../../_shared/context-aware-industry-filter.ts';

/**
 * Generic industry keywords (from SOC mappings) → Apollo industry keyword terms
 * Used for q_organization_keyword_tags parameter (keyword-based search)
 */
const SOC_INDUSTRY_TO_APOLLO_TAXONOMY: Record<string, string[]> = {
  // Engineering & Manufacturing
  'aerospace': ['Aerospace', 'Aviation & Aerospace', 'Defense & Space'],
  'automotive': ['Automotive', 'Motor Vehicle Manufacturing'],
  'manufacturing': ['Manufacturing', 'Industrial Manufacturing', 'Machinery'],
  'HVAC': ['Mechanical Or Industrial Engineering', 'Building Services', 'Energy & Utilities'],
  'robotics': ['Robotics', 'Industrial Automation', 'Manufacturing'],
  'energy': ['Energy', 'Renewables & Environment', 'Oil & Energy'],
  'mechanical': ['Mechanical Or Industrial Engineering', 'Manufacturing'],
  'industrial': ['Industrial Automation', 'Manufacturing', 'Machinery'],
  'renewables': ['Renewables & Environment', 'Environmental Services'],
  'environment': ['Environmental Services', 'Renewables & Environment'],

  // Civil & Construction
  'construction': ['Construction', 'Civil Engineering'],
  'infrastructure': ['Civil Engineering', 'Construction', 'Transportation'],
  'transportation': ['Transportation/Trucking/Railroad', 'Logistics & Supply Chain'],

  // Electrical & Electronics
  'electronics': ['Electrical & Electronic Manufacturing', 'Semiconductors'],
  'semiconductors': ['Semiconductors', 'Electrical & Electronic Manufacturing'],
  'power systems': ['Utilities', 'Energy'],
  'telecommunications': ['Telecommunications'],
  'IoT': ['Internet', 'Computer Hardware', 'Electrical & Electronic Manufacturing'],

  // Chemical & Materials
  'chemical': ['Chemicals', 'Petrochemicals'],
  'pharmaceutical': ['Pharmaceuticals', 'Biotechnology'],
  'petrochemical': ['Oil & Energy', 'Chemicals'],
  'materials': ['Plastics', 'Materials', 'Chemicals'],
  'biotech': ['Biotechnology', 'Pharmaceuticals'],

  // Software & Technology
  'software': ['Computer Software', 'Information Technology & Services'],
  'technology': ['Information Technology & Services', 'Computer Software'],
  'fintech': ['Financial Services', 'Computer Software'],
  'SaaS': ['Computer Software', 'Internet'],
  'cloud computing': ['Computer Software', 'Information Technology & Services'],
  'it services': ['Information Technology & Services', 'Computer Software'],
  'cloud': ['Computer Software', 'Information Technology & Services'],
  'cybersecurity': ['Computer & Network Security', 'Information Technology & Services'],

  // Data & Analytics
  'data analytics': ['Computer Software', 'Information Technology & Services'],
  'business intelligence': ['Computer Software', 'Management Consulting'],
  'AI': ['Computer Software', 'Research'],

  // Business & Consulting
  'consulting': ['Management Consulting', 'Business Consulting'],
  'business services': ['Business Supplies & Equipment', 'Outsourcing/Offshoring'],
  'finance': ['Financial Services', 'Investment Banking', 'Venture Capital & Private Equity'],
  'enterprise software': ['Computer Software', 'Information Technology & Services'],
  'enterprise': ['Computer Software', 'Information Technology & Services'],

  // Logistics & Operations
  'logistics': ['Logistics & Supply Chain', 'Transportation/Trucking/Railroad'],
  'operations': ['Logistics & Supply Chain', 'Manufacturing'],
  'supply chain': ['Logistics & Supply Chain', 'Warehousing'],

  // Healthcare & Life Sciences
  'healthcare': ['Hospital & Health Care', 'Medical Devices'],
  'medical devices': ['Medical Devices', 'Hospital & Health Care'],
  'research': ['Research', 'Biotechnology'],
};

/**
 * Industries to CONDITIONALLY EXCLUDE based on course context
 * - ALWAYS excluded: Insurance, legal, gambling (hard exclude)
 * - CONTEXT-DEPENDENT: Staffing, HR, recruiting (soft exclude)
 */
const CONTEXT_DEPENDENT_INDUSTRIES = [
  'Staffing & Recruiting',
  'Human Resources',
  'Outsourcing/Offshoring',
  'Employment Services',
  'Recruitment',
  'Talent Acquisition'
];

const ALWAYS_EXCLUDED_INDUSTRIES = [
  'Insurance',
  'Legal Services',
  'Gambling & Casinos'
];

/**
 * Map SOC industry keywords to Apollo industry keyword terms
 * Returns both industries to INCLUDE and industries to EXCLUDE (context-aware)
 *
 * NEW: Takes socMappings to classify course domain and determine exclusions
 */
export function mapSOCIndustriesToApollo(
  socIndustries: string[],
  socMappings: SOCMapping[]
): {
  includeIndustries: string[];
  excludeIndustries: string[];
  courseDomain: CourseDomain;
} {
  const includeSet = new Set<string>();

  // STEP 1: Classify course domain (determines if staffing companies are relevant)
  const { domain: courseDomain, confidence, reasoning } = classifyCourseDomain(socMappings);

  console.log(`\n🎓 [Course Classification]`);
  console.log(`   Domain: ${courseDomain.toUpperCase()}`);
  console.log(`   Confidence: ${(confidence * 100).toFixed(0)}%`);
  console.log(`   Reasoning: ${reasoning}`);

  // STEP 2: Map each SOC industry to Apollo taxonomy
  for (const socIndustry of socIndustries) {
    const apolloIndustries = SOC_INDUSTRY_TO_APOLLO_TAXONOMY[socIndustry.toLowerCase()];

    if (apolloIndustries) {
      apolloIndustries.forEach(ind => includeSet.add(ind));
    } else {
      // No mapping found - use original keyword as fallback
      // Apollo will try to match it as best as possible
      console.log(`   ⚠️  No Apollo mapping for SOC industry: "${socIndustry}"`);
      includeSet.add(socIndustry);
    }
  }

  const includeIndustries = Array.from(includeSet);

  // STEP 3: Determine exclusions based on course domain
  let excludeIndustries: string[];

  switch (courseDomain) {
    case 'business_management':
      // Business/HR courses → ONLY exclude hard-exclude industries
      excludeIndustries = [...ALWAYS_EXCLUDED_INDUSTRIES];
      console.log(`   ✅ Business course: Staffing/HR companies are TARGET industry (not excluded)`);
      break;

    case 'engineering_technical':
    case 'computer_tech':
    case 'healthcare_science':
      // Engineering/Tech courses → Exclude both hard and soft
      excludeIndustries = [...ALWAYS_EXCLUDED_INDUSTRIES, ...CONTEXT_DEPENDENT_INDUSTRIES];
      console.log(`   🚫 Engineering/Tech course: Staffing/HR companies excluded`);
      break;

    case 'hybrid':
      // Hybrid courses → Exclude soft industries (will be re-evaluated during semantic matching with job postings)
      excludeIndustries = [...ALWAYS_EXCLUDED_INDUSTRIES, ...CONTEXT_DEPENDENT_INDUSTRIES];
      console.log(`   🔀 Hybrid course: Initial exclusion (will verify with job posting analysis)`);
      break;

    case 'unknown':
    default:
      // Conservative: exclude when uncertain
      excludeIndustries = [...ALWAYS_EXCLUDED_INDUSTRIES, ...CONTEXT_DEPENDENT_INDUSTRIES];
      console.log(`   ⚠️  Unknown domain: Conservative exclusion (staffing excluded)`);
  }

  console.log(`\n🏭 [Industry Mapper] SOC → Apollo Translation:`);
  console.log(`   Input (SOC): ${socIndustries.join(', ')}`);
  console.log(`   Output (Apollo): ${includeIndustries.slice(0, 10).join(', ')}`);
  console.log(`   Excluded: ${excludeIndustries.join(', ')}`);

  return {
    includeIndustries: includeIndustries.slice(0, 15), // Limit to 15 for API efficiency
    excludeIndustries,
    courseDomain
  };
}

/**
 * Check if a company sector matches excluded industries (CONTEXT-AWARE)
 * Used for semantic filtering penalty
 *
 * DEPRECATED: Use shouldExcludeIndustry from context-aware-industry-filter.ts instead
 * This function is kept for backward compatibility but delegates to the context-aware system
 */
export function isExcludedIndustry(
  companySector: string,
  courseDomain: CourseDomain = 'unknown',
  socMappings: SOCMapping[] = [],
  jobPostings?: any[]
): boolean {
  // Import the context-aware function dynamically
  const { shouldExcludeIndustry: contextAwareCheck } =
    require('../../_shared/context-aware-industry-filter.ts');

  const result = contextAwareCheck(companySector, courseDomain, socMappings, jobPostings);
  return result.shouldExclude;
}

/**
 * Get recommended Apollo search strategy based on industry count
 * - Few industries (< 3): Use structured industry filters (precise)
 * - Many industries (>= 3): Use hybrid (structured + keywords for coverage)
 */
export function getApolloSearchStrategy(industryCount: number): 'structured' | 'hybrid' {
  return industryCount < 3 ? 'structured' : 'hybrid';
}
