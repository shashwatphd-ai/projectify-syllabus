/**
 * Apollo Industry Taxonomy Mapper
 *
 * Translates generic SOC/O*NET industry keywords into Apollo's structured industry taxonomy IDs.
 * This prevents false matches from keyword-based search (e.g., staffing companies that recruit FOR
 * aerospace companies matching "aerospace" keyword searches).
 *
 * CRITICAL: Apollo uses industry_tag_ids (structured taxonomy) vs q_organization_keyword_tags (text search)
 * - industry_tag_ids: Precise, based on company's primary industry classification
 * - keyword_tags: Imprecise, matches any mention in company description
 *
 * NOTE: Apollo industry IDs may need to be verified/updated via Apollo API documentation
 * Current mappings are based on common industry categories.
 */

/**
 * Generic industry keywords (from SOC mappings) → Apollo industry tag names
 * Apollo API will resolve names to IDs automatically
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
 * Industries to EXCLUDE (staffing, recruiting, etc.)
 * These will be added as negative filters to prevent matching
 */
const EXCLUDED_INDUSTRIES = [
  'Staffing & Recruiting',
  'Human Resources',
  'Outsourcing/Offshoring',
  'Employment Services',
  'Recruitment',
];

/**
 * Map SOC industry keywords to Apollo industry taxonomy names
 * Returns both industries to INCLUDE and industries to EXCLUDE
 */
export function mapSOCIndustriesToApollo(socIndustries: string[]): {
  includeIndustries: string[];
  excludeIndustries: string[];
} {
  const includeSet = new Set<string>();

  // Map each SOC industry to Apollo taxonomy
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

  console.log(`\n🏭 [Industry Mapper] SOC → Apollo Translation:`);
  console.log(`   Input (SOC): ${socIndustries.join(', ')}`);
  console.log(`   Output (Apollo): ${includeIndustries.slice(0, 10).join(', ')}`);
  console.log(`   Excluded: ${EXCLUDED_INDUSTRIES.join(', ')}`);

  return {
    includeIndustries: includeIndustries.slice(0, 15), // Limit to 15 for API efficiency
    excludeIndustries: EXCLUDED_INDUSTRIES
  };
}

/**
 * Check if a company sector matches excluded industries
 * Used for semantic filtering penalty
 */
export function isExcludedIndustry(companySector: string): boolean {
  const sectorLower = companySector.toLowerCase();

  const excludedKeywords = [
    'staffing', 'recruiting', 'recruitment', 'human resources',
    'hr services', 'employment services', 'outsourcing'
  ];

  return excludedKeywords.some(keyword => sectorLower.includes(keyword));
}

/**
 * Get recommended Apollo search strategy based on industry count
 * - Few industries (< 3): Use structured industry filters (precise)
 * - Many industries (>= 3): Use hybrid (structured + keywords for coverage)
 */
export function getApolloSearchStrategy(industryCount: number): 'structured' | 'hybrid' {
  return industryCount < 3 ? 'structured' : 'hybrid';
}
