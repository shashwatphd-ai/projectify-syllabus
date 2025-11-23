/**
 * Apollo Industry Keyword Mapper
 *
 * Translates generic SOC/O*NET industry keywords into Apollo-compatible industry search terms.
 * These keywords are used in q_organization_keyword_tags for industry filtering.
 *
 * NOTE: We use keyword-based filtering instead of organization_industry_tag_ids because:
 * - industry_tag_ids requires numeric taxonomy IDs, which Apollo doesn't document publicly
 * - keyword_tags allows flexible matching using industry names (e.g., "Aerospace", "Manufacturing")
 * - Combined with person_not_titles exclusions, this effectively filters out staffing companies
 *
 * CONTEXT-AWARE EXCLUSION:
 * - Engineering courses: Exclude staffing/HR companies (they don't provide projects)
 * - Business/HR courses: Include staffing/HR companies (they ARE the target industry)
 * - Hybrid courses: Smart decision based on primary occupation
 *
 * Current mappings are based on common industry categories and O*NET SOC data.
 */

import { SOCMapping } from '../../_shared/course-soc-mapping.ts';
import { classifyCourseDomain, CourseDomain } from '../../_shared/context-aware-industry-filter.ts';

/**
 * Generic industry keywords (from SOC mappings) → Apollo industry keywords
 * These are used in q_organization_keyword_tags for keyword-based industry filtering
 * NOTE: Apollo's organization_industry_tag_ids requires numeric IDs, not string names
 */
const SOC_INDUSTRY_TO_APOLLO_TAXONOMY: Record<string, string[]> = {
  // Engineering & Manufacturing
  // SIMPLIFIED: Use Apollo's simple keyword matching, not made-up taxonomy
  'aerospace': ['aerospace', 'aviation', 'defense'],
  'automotive': ['automotive', 'manufacturing'],
  'manufacturing': ['manufacturing', 'industrial', 'production'],
  'HVAC': ['engineering', 'hvac', 'energy', 'mechanical'],
  'robotics': ['robotics', 'automation', 'manufacturing'],
  'energy': ['energy', 'renewables', 'utilities'],
  'mechanical': ['engineering', 'mechanical', 'manufacturing'],
  'industrial': ['industrial', 'automation', 'manufacturing'],
  'industrial engineering': ['engineering', 'industrial', 'manufacturing', 'automation'],
  'automation': ['automation', 'robotics', 'manufacturing', 'industrial'],
  'production': ['manufacturing', 'production', 'industrial'],
  'quality assurance': ['manufacturing', 'quality', 'industrial'],
  'renewables': ['renewables', 'energy', 'environmental'],
  'environment': ['environmental', 'renewables', 'sustainability'],

  // Civil & Construction
  'construction': ['construction', 'engineering', 'infrastructure'],
  'infrastructure': ['engineering', 'construction', 'infrastructure'],
  'transportation': ['transportation', 'logistics'],

  // Electrical & Electronics
  'electronics': ['electronics', 'manufacturing', 'hardware'],
  'semiconductors': ['semiconductors', 'electronics', 'manufacturing'],
  'power systems': ['utilities', 'energy', 'power'],
  'telecommunications': ['telecommunications', 'technology'],
  'IoT': ['iot', 'technology', 'hardware', 'software'],

  // Chemical & Materials
  'chemical': ['chemicals', 'manufacturing'],
  'pharmaceutical': ['pharmaceuticals', 'biotech', 'healthcare'],
  'petrochemical': ['energy', 'chemicals', 'oil'],
  'materials': ['materials', 'manufacturing'],
  'biotech': ['biotech', 'pharmaceuticals', 'life sciences'],

  // Software & Technology
  'software': ['software', 'technology', 'saas'],
  'technology': ['technology', 'software', 'it'],
  'fintech': ['fintech', 'financial services', 'technology'],
  'SaaS': ['saas', 'software', 'cloud'],
  'cloud computing': ['cloud', 'software', 'technology'],
  'it services': ['it services', 'technology', 'software'],
  'cloud': ['cloud', 'software', 'technology'],
  'cybersecurity': ['cybersecurity', 'security', 'technology'],

  // Data & Analytics
  'data analytics': ['analytics', 'data', 'software'],
  'business intelligence': ['analytics', 'software', 'data'],
  'AI': ['ai', 'machine learning', 'technology'],

  // Business & Consulting
  'consulting': ['consulting', 'professional services'],
  'business services': ['business services', 'professional services'],
  'finance': ['financial services', 'banking', 'finance'],
  'enterprise software': ['software', 'enterprise', 'technology'],
  'enterprise': ['enterprise', 'software', 'technology'],

  // Logistics & Operations
  'logistics': ['logistics', 'supply chain', 'transportation'],
  'operations': ['operations', 'logistics', 'manufacturing'],
  'supply chain': ['supply chain', 'logistics', 'operations'],

  // Healthcare & Life Sciences
  'healthcare': ['healthcare', 'medical', 'hospital'],
  'medical devices': ['medical devices', 'healthcare'],
  'research': ['research', 'biotech', 'life sciences'],
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
 * Map SOC industry keywords to Apollo industry taxonomy names
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
