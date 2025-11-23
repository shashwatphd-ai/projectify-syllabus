/**
 * Context-Aware Industry Filtering System
 *
 * Solves the edge case: "Should we exclude staffing companies?"
 * Answer: Depends on the course!
 *
 * - Engineering courses → EXCLUDE staffing companies (they don't provide projects)
 * - HR/Business courses → INCLUDE staffing companies (they ARE the target industry)
 * - Hybrid courses → SMART decision based on primary occupation
 *
 * ARCHITECTURE:
 * 1. Two-Tier Classification: Hard exclude (always) vs Soft exclude (context-dependent)
 * 2. SOC-Based Domain Detection: Automatically classify course type
 * 3. Job Posting Intelligence: Verify if company has real project opportunities
 * 4. Systematic & Scalable: Uses occupation codes, not manual rules
 */

import { SOCMapping } from './course-soc-mapping.ts';

// ========================================
// TIER 1: HARD EXCLUDE (Never Relevant)
// ========================================
// Industries that provide NO value for academic projects in ANY domain
const HARD_EXCLUDE_INDUSTRIES = [
  'insurance', 'insurance services',
  'legal services', 'law firm', 'law practice',
  'gambling', 'casino',
  'tobacco', 'alcohol'
];

// ========================================
// TIER 2: SOFT EXCLUDE (Context-Dependent)
// ========================================
// Industries that ARE relevant for Business/HR courses but NOT for Engineering/Tech
const SOFT_EXCLUDE_INDUSTRIES = [
  'staffing', 'recruiting', 'recruitment',
  'human resources', 'hr services', 'hr consulting',
  'employment services', 'talent acquisition',
  'outsourcing'
];

// ========================================
// COURSE DOMAIN CLASSIFICATION
// ========================================
// Based on SOC Major Groups: https://www.bls.gov/soc/2018/major_groups.htm

export type CourseDomain =
  | 'business_management'    // Allow staffing/HR companies
  | 'engineering_technical'  // Exclude staffing/HR companies
  | 'computer_tech'          // Exclude staffing/HR companies
  | 'healthcare_science'     // Exclude staffing/HR companies
  | 'hybrid'                 // Smart decision based on primary occupation
  | 'unknown';               // Conservative: exclude staffing

/**
 * Classify course domain based on SOC codes
 * This determines whether staffing/HR companies are relevant
 */
export function classifyCourseDomain(socMappings: SOCMapping[]): {
  domain: CourseDomain;
  confidence: number;
  reasoning: string;
} {
  if (!socMappings || socMappings.length === 0) {
    return {
      domain: 'unknown',
      confidence: 0,
      reasoning: 'No SOC mappings available'
    };
  }

  // Extract SOC major groups (first 2 digits)
  const majorGroups = socMappings.map(soc => {
    const code = soc.socCode.split('-')[0]; // "17-2141.00" → "17"
    return {
      group: code,
      confidence: soc.confidence,
      title: soc.title
    };
  });

  // Count weighted votes by confidence
  const domainVotes: Record<CourseDomain, number> = {
    'business_management': 0,
    'engineering_technical': 0,
    'computer_tech': 0,
    'healthcare_science': 0,
    'hybrid': 0,
    'unknown': 0
  };

  for (const { group, confidence } of majorGroups) {
    const weight = confidence; // Higher confidence = more weight

    switch (group) {
      // MANAGEMENT OCCUPATIONS (11-xxxx)
      case '11':
        domainVotes['business_management'] += weight * 1.0;
        break;

      // BUSINESS & FINANCIAL OPERATIONS (13-xxxx)
      case '13':
        domainVotes['business_management'] += weight * 1.0;
        break;

      // COMPUTER & MATHEMATICAL (15-xxxx)
      case '15':
        domainVotes['computer_tech'] += weight * 1.0;
        break;

      // ARCHITECTURE & ENGINEERING (17-xxxx)
      case '17':
        domainVotes['engineering_technical'] += weight * 1.0;
        break;

      // LIFE, PHYSICAL, SOCIAL SCIENCES (19-xxxx)
      case '19':
        domainVotes['healthcare_science'] += weight * 1.0;
        break;

      // HEALTHCARE PRACTITIONERS (29-xxxx)
      case '29':
        domainVotes['healthcare_science'] += weight * 1.0;
        break;

      // PRODUCTION OCCUPATIONS (51-xxxx)
      case '51':
        domainVotes['engineering_technical'] += weight * 0.8;
        break;

      default:
        domainVotes['unknown'] += weight * 0.5;
    }
  }

  // Find dominant domain
  const sortedDomains = Object.entries(domainVotes)
    .sort(([, a], [, b]) => b - a);

  const [primaryDomain, primaryScore] = sortedDomains[0];
  const [secondaryDomain, secondaryScore] = sortedDomains[1];

  // Check if hybrid (multiple strong domains)
  const totalScore = Object.values(domainVotes).reduce((sum, score) => sum + score, 0);
  const primaryPercentage = primaryScore / totalScore;

  let finalDomain: CourseDomain;
  let confidence: number;
  let reasoning: string;

  if (primaryPercentage < 0.6 && secondaryScore > 0) {
    // Hybrid course (e.g., "HR Analytics" = Business + Tech)
    finalDomain = 'hybrid';
    confidence = 1 - primaryPercentage; // Lower confidence = more hybrid
    reasoning = `Hybrid course: ${Math.round(primaryPercentage * 100)}% ${primaryDomain}, ${Math.round(secondaryScore / totalScore * 100)}% ${secondaryDomain}`;
  } else {
    finalDomain = primaryDomain as CourseDomain;
    confidence = primaryPercentage;
    reasoning = `Primary domain: ${primaryDomain} (${Math.round(primaryPercentage * 100)}%)`;
  }

  return { domain: finalDomain, confidence, reasoning };
}

/**
 * Check if a company industry should be excluded based on course context
 * This is the MAIN function used by all filtering layers
 */
export function shouldExcludeIndustry(
  companySector: string,
  courseDomain: CourseDomain,
  socMappings: SOCMapping[],
  companyJobPostings?: any[]
): {
  shouldExclude: boolean;
  reason: string;
  penalty: number; // 0.0 = no penalty, 1.0 = complete disqualification
} {
  const sectorLower = companySector.toLowerCase();

  // TIER 1: Hard Exclude - ALWAYS reject these industries
  for (const hardExclude of HARD_EXCLUDE_INDUSTRIES) {
    if (sectorLower.includes(hardExclude)) {
      return {
        shouldExclude: true,
        reason: `Hard-excluded industry: ${hardExclude}`,
        penalty: 1.0
      };
    }
  }

  // TIER 2: Soft Exclude - Context-dependent
  const isSoftExcludeIndustry = SOFT_EXCLUDE_INDUSTRIES.some(softExclude =>
    sectorLower.includes(softExclude)
  );

  if (!isSoftExcludeIndustry) {
    // Not an excluded industry - no penalty
    return {
      shouldExclude: false,
      reason: 'Not an excluded industry',
      penalty: 0
    };
  }

  // Company IS in a soft-exclude industry (staffing, HR, etc.)
  // Decision depends on course domain

  switch (courseDomain) {
    case 'business_management':
      // Business/HR courses → Staffing/HR companies ARE relevant
      return {
        shouldExclude: false,
        reason: 'Business/HR course - staffing companies are target industry',
        penalty: 0
      };

    case 'engineering_technical':
    case 'computer_tech':
    case 'healthcare_science':
      // Engineering/Tech courses → Staffing companies are NOT relevant
      // REDUCED penalty from 1.0 to 0.8 to avoid complete exclusion
      // With 0.8 penalty, staffing firms still have 20% similarity remaining,
      // enough to pass fallback minimum (5%) if Apollo returns very few companies
      return {
        shouldExclude: true,
        reason: 'Engineering/Tech course - staffing companies penalized (80%)',
        penalty: 0.8  // Was 1.0 (too harsh) → Now 0.8 (graceful degradation)
      };

    case 'hybrid':
      // Hybrid courses → Smart decision based on primary occupation and job postings
      return handleHybridCourseIndustry(sectorLower, socMappings, companyJobPostings);

    case 'unknown':
    default:
      // Conservative: exclude when uncertain
      return {
        shouldExclude: true,
        reason: 'Unknown course domain - excluding staffing (conservative)',
        penalty: 0.8 // High penalty but not complete disqualification
      };
  }
}

/**
 * Handle hybrid courses (e.g., "HR Analytics", "Business Data Science")
 * Determines if a staffing company is relevant based on:
 * 1. Primary vs secondary occupation weights
 * 2. Company's actual operations (job posting analysis)
 */
function handleHybridCourseIndustry(
  companySector: string,
  socMappings: SOCMapping[],
  companyJobPostings?: any[]
): {
  shouldExclude: boolean;
  reason: string;
  penalty: number;
} {
  // Check primary occupation: Is it Business/HR or Tech/Engineering?
  const primarySoc = socMappings[0]; // Highest confidence mapping
  const majorGroup = primarySoc.socCode.split('-')[0];

  const isBusinessPrimary = ['11', '13'].includes(majorGroup); // Management, Business

  if (isBusinessPrimary) {
    // Hybrid course with Business primary → Allow staffing companies
    return {
      shouldExclude: false,
      reason: 'Hybrid course with Business primary - staffing companies allowed',
      penalty: 0
    };
  }

  // Hybrid course with Tech/Engineering primary → Check job postings
  if (companyJobPostings && companyJobPostings.length > 0) {
    const hasLegitimateProjects = analyzeJobPostingsForProjects(companyJobPostings);

    if (hasLegitimateProjects) {
      return {
        shouldExclude: false,
        reason: 'Staffing company with legitimate internal project opportunities',
        penalty: 0.3 // Small penalty (less ideal than pure tech companies)
      };
    }
  }

  // Hybrid course with Tech primary + no legitimate projects → Exclude
  // REDUCED penalty from 1.0 to 0.8 for graceful degradation
  return {
    shouldExclude: true,
    reason: 'Hybrid course with Tech primary - staffing penalized (no internal projects)',
    penalty: 0.8  // Was 1.0 → Now 0.8 (graceful degradation)
  };
}

/**
 * Analyze job postings to determine if company has REAL project opportunities
 * (not just recruiting roles)
 *
 * LOGIC:
 * - Look for internal technical/analytical roles
 * - Exclude recruiting/talent acquisition roles
 * - Companies need 2+ legitimate roles to be considered
 */
export function analyzeJobPostingsForProjects(jobPostings: any[]): boolean {
  if (!jobPostings || jobPostings.length === 0) return false;

  // Keywords indicating REAL project work (internal roles)
  const projectRoleKeywords = [
    // Technical roles - Software
    'software engineer', 'software developer', 'programmer', 'coder',
    'full stack', 'backend', 'frontend', 'web developer', 'mobile developer',
    'application developer', 'systems developer',

    // Technical roles - Data & AI
    'data scientist', 'data analyst', 'data engineer', 'database administrator',
    'machine learning', 'ai engineer', 'ml engineer', 'deep learning',
    'computer vision', 'nlp engineer', 'ai researcher',

    // Technical roles - Infrastructure
    'devops', 'cloud engineer', 'systems engineer', 'network engineer',
    'site reliability', 'infrastructure engineer', 'platform engineer',
    'security engineer', 'cybersecurity',

    // Engineering roles - Mechanical/Industrial
    'mechanical engineer', 'design engineer', 'manufacturing engineer',
    'industrial engineer', 'process engineer', 'quality engineer',
    'product engineer', 'test engineer', 'cad engineer', 'r&d engineer',

    // Engineering roles - Electrical/Electronics
    'electrical engineer', 'electronics engineer', 'firmware engineer',
    'hardware engineer', 'embedded systems', 'pcb design',

    // Engineering roles - Civil/Construction
    'civil engineer', 'structural engineer', 'construction engineer',
    'project engineer', 'field engineer', 'geotechnical engineer',

    // Business/Analytics roles
    'business analyst', 'product manager', 'product owner', 'project manager',
    'financial analyst', 'business intelligence', 'analytics manager',
    'operations analyst', 'strategy analyst', 'management consultant',
    'process analyst', 'systems analyst',

    // Research/Science roles
    'research scientist', 'research engineer', 'research analyst', 'lab technician',
    'biostatistician', 'clinical analyst', 'scientist', 'chemist', 'physicist',
    'materials scientist', 'research associate'
  ];

  // Keywords indicating RECRUITING roles (not project work)
  const recruitingKeywords = [
    'recruiter', 'recruitment', 'talent acquisition', 'sourcer', 'sourcing',
    'hr specialist', 'hr coordinator', 'hr generalist', 'hr manager', 'hr business partner',
    'staffing', 'headhunter', 'talent partner', 'people operations', 'people ops',
    'talent coordinator', 'recruiting coordinator', 'employment specialist'
  ];

  let legitimateRoleCount = 0;
  let recruitingRoleCount = 0;

  for (const posting of jobPostings) {
    const title = (posting.title || '').toLowerCase();
    const description = (posting.description || '').toLowerCase();
    const combined = `${title} ${description}`;

    // Check if recruiting role
    const isRecruitingRole = recruitingKeywords.some(keyword =>
      title.includes(keyword)
    );

    if (isRecruitingRole) {
      recruitingRoleCount++;
      continue;
    }

    // Check if legitimate project role
    const isProjectRole = projectRoleKeywords.some(keyword =>
      title.includes(keyword)
    );

    // Additional heuristics for legitimate roles:
    // - Not mentioned as "client" or "placement"
    // - Internal keywords like "our team", "we are looking for", "join us"
    const isInternalRole =
      !combined.includes('client') &&
      !combined.includes('placement') &&
      !combined.includes('contract role') &&
      (combined.includes('our team') || combined.includes('join us') || combined.includes('we are'));

    if (isProjectRole && isInternalRole) {
      legitimateRoleCount++;
    }
  }

  // RELAXED Decision: Company needs at least 1 legitimate role (was 2)
  // Allow ties (was strict > comparison)
  const hasLegitimateProjects =
    legitimateRoleCount >= 1 &&
    legitimateRoleCount >= recruitingRoleCount;

  console.log(`   📊 Job posting analysis: ${legitimateRoleCount} legitimate roles, ${recruitingRoleCount} recruiting roles → ${hasLegitimateProjects ? 'PASS ✅' : 'FAIL ❌'}`);

  return hasLegitimateProjects;
}

/**
 * Get expected industries from SOC mappings
 * Used by Apollo filters and semantic matching
 */
export function getExpectedIndustriesFromSOC(socMappings: SOCMapping[]): string[] {
  return [...new Set(socMappings.flatMap(soc => soc.industries))];
}

/**
 * Format domain classification for logging
 */
export function formatDomainClassification(classification: {
  domain: CourseDomain;
  confidence: number;
  reasoning: string;
}): string {
  const domainEmoji = {
    'business_management': '💼',
    'engineering_technical': '⚙️',
    'computer_tech': '💻',
    'healthcare_science': '🔬',
    'hybrid': '🔀',
    'unknown': '❓'
  };

  return `${domainEmoji[classification.domain]} ${classification.domain.toUpperCase()} (${(classification.confidence * 100).toFixed(0)}% confidence)\n   ${classification.reasoning}`;
}
