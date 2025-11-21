/**
 * Skill Extraction Service
 *
 * Extracts structured skills from course learning outcomes using NLP techniques.
 * This replaces generic text extraction with semantic skill identification.
 *
 * Phase 1 of intelligent company matching system.
 */

export interface ExtractedSkill {
  skill: string;              // The skill name (e.g., "Fluid Dynamics Analysis")
  category: SkillCategory;    // Type of skill
  confidence: number;         // 0.0 to 1.0
  source: string;             // Which outcome it came from
  keywords: string[];         // Related terms extracted
}

export type SkillCategory = 'technical' | 'analytical' | 'domain' | 'tool' | 'framework';

export interface SkillExtractionResult {
  skills: ExtractedSkill[];
  totalExtracted: number;
  courseContext: string;      // Combined course title + level
  extractionMethod: string;   // For debugging
}

/**
 * Main skill extraction function
 * Analyzes course outcomes and extracts structured skills
 */
export async function extractSkillsFromOutcomes(
  outcomes: string[],
  courseTitle?: string,
  courseLevel?: string
): Promise<SkillExtractionResult> {
  console.log(`🧠 [Skill Extraction] Starting extraction...`);
  console.log(`  📚 Course: ${courseTitle || 'Unknown'} (${courseLevel || 'Unknown'})`);
  console.log(`  📝 Outcomes: ${outcomes.length}`);

  const skills: ExtractedSkill[] = [];
  const courseContext = `${courseTitle || ''} ${courseLevel || ''}`.trim();

  // Extract skills from each outcome
  for (const outcome of outcomes) {
    const extractedFromOutcome = extractSkillsFromText(outcome, courseContext);
    skills.push(...extractedFromOutcome);
  }

  // Deduplicate and merge similar skills
  const deduplicated = deduplicateSkills(skills);

  // Sort by confidence (highest first)
  const sorted = deduplicated.sort((a, b) => b.confidence - a.confidence);

  console.log(`  ✅ Extracted ${sorted.length} unique skills`);
  sorted.forEach(skill => {
    console.log(`    • ${skill.skill} (${skill.category}, confidence: ${skill.confidence.toFixed(2)})`);
  });

  return {
    skills: sorted,
    totalExtracted: sorted.length,
    courseContext,
    extractionMethod: 'pattern-based-nlp'
  };
}

/**
 * Extract skills from a single outcome text using pattern matching
 */
function extractSkillsFromText(text: string, courseContext: string): ExtractedSkill[] {
  const skills: ExtractedSkill[] = [];

  // Pattern 1: Extract technical nouns and concepts (ignore action verbs)
  // Extract: "fluid properties", "viscosity", "pressure", "hydrostatics"
  // Skip: "Convert English", "Explain Pascal" (verbs + proper nouns)
  const actionPatterns = [
    // Match: "Apply [technical term]'s [concept]" → "technical term's concept"
    /(?:apply|use|implement|develop|design|create|build|analyze|calculate|compute|solve|model|simulate|optimize)\s+([A-Z][a-z]+(?:'s)?\s+(?:equation|theorem|principle|law|method|algorithm|model|analysis|system|framework|technique|method))/gi,
    // Match: "using [TOOL]" or "using [Multi Word Tool]"
    /(?:using|with|via)\s+([A-Z][A-Z]+(?:\s+[A-Z][A-Z]+)*|[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/g,
  ];
  
  // BLACKLIST: Skip extraction for these patterns (specific problematic terms only)
  const blacklistPatterns = [
    /^convert\s+english$/i,        // "Convert English" → Skip (exact match)
    /^explain\s+blaise\s+pascal$/i, // "Explain Blaise Pascal" → Skip (exact match)
    /^convert\s+units$/i,           // "Convert units" → Skip (exact match)
  ];

  actionPatterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const skill = match[1].trim();
      
      // Check blacklist - only test the skill itself, not the full text
      const isBlacklisted = blacklistPatterns.some(bp => bp.test(skill));
      if (isBlacklisted) {
        console.log(`  ⚠️  Skipping blacklisted skill: "${skill}"`);
        continue;
      }
      
      if (skill.length > 3) { // Filter out short matches
        skills.push({
          skill: normalizeSkillName(skill),
          category: categorizeSkill(skill, courseContext),
          confidence: 0.85,
          source: text.substring(0, 100) + '...',
          keywords: extractKeywords(skill)
        });
      }
    }
  });

  // Pattern 2: Technical terms (capitalized multi-word phrases)
  // "Computational Fluid Dynamics", "Heat Transfer", "Machine Learning"
  const technicalTermPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/g;
  const technicalMatches = text.matchAll(technicalTermPattern);

  for (const match of technicalMatches) {
    const term = match[1].trim();
    
    // Check blacklist - only test the term itself, not the full text
    const isBlacklisted = blacklistPatterns.some(bp => bp.test(term));
    if (isBlacklisted) {
      console.log(`  ⚠️  Skipping blacklisted term: "${term}"`);
      continue;
    }
    
    if (isTechnicalTerm(term, courseContext)) {
      skills.push({
        skill: normalizeSkillName(term),
        category: categorizeSkill(term, courseContext),
        confidence: 0.75,
        source: text.substring(0, 100) + '...',
        keywords: extractKeywords(term)
      });
    }
  }

  // Pattern 3: Tools and software
  // "MATLAB", "Python", "Excel", "AutoCAD", "TensorFlow"
  const toolPattern = /\b(MATLAB|Python|Java|JavaScript|C\+\+|SQL|Excel|AutoCAD|SolidWorks|ANSYS|SPSS|Tableau|TensorFlow|PyTorch|Git|Docker|AWS|Azure|R|Stata|COMSOL|LabVIEW|Simulink)\b/gi;
  const toolMatches = text.matchAll(toolPattern);

  for (const match of toolMatches) {
    const tool = match[1];
    skills.push({
      skill: `${tool} Programming` || `${tool} Software`,
      category: 'tool',
      confidence: 0.95,
      source: text.substring(0, 100) + '...',
      keywords: [tool.toLowerCase()]
    });
  }

  // Pattern 4: Extract key concepts from learning outcomes
  // "Define the properties of fluids such as density, pressure, viscosity"
  // → Extract: "density", "pressure", "viscosity", "fluid properties"
  const conceptPattern = /(?:define|calculate|identify|analyze|determine|compute|solve|derive|explain|describe)\s+(?:the\s+)?(?:various\s+)?([^,\.;]+?)(?:\s+such as\s+([^,\.;]+))?(?:\.|,|;|$)/gi;
  const conceptMatches = text.matchAll(conceptPattern);
  
  for (const match of conceptMatches) {
    const primaryConcept = match[1]?.trim();
    const examples = match[2]?.trim();
    
    // Extract primary concept
    if (primaryConcept && primaryConcept.length > 5 && !primaryConcept.includes('and describe')) {
      const conceptSkill = primaryConcept.replace(/\s+of\s+.*$/, ''); // Remove "of [object]" suffix
      if (conceptSkill.split(' ').length <= 4) { // Keep it concise
        skills.push({
          skill: toTitleCase(conceptSkill),
          category: 'domain',
          confidence: 0.75,
          source: text.substring(0, 100) + '...',
          keywords: extractKeywords(conceptSkill)
        });
      }
    }
    
    // Extract example terms (e.g., "density, pressure, viscosity")
    if (examples) {
      const exampleTerms = examples.split(/,\s*(?:and\s+)?/).map(t => t.trim());
      exampleTerms.forEach(term => {
        if (term.length > 3 && term.split(' ').length <= 3) {
          skills.push({
            skill: toTitleCase(term),
            category: 'technical',
            confidence: 0.85,
            source: text.substring(0, 100) + '...',
            keywords: extractKeywords(term)
          });
        }
      });
    }
  }

  // Pattern 5: Domain-specific terms from course context
  const domainSkills = extractDomainSkills(text, courseContext);
  skills.push(...domainSkills);

  return skills;
}

/**
 * Extract domain-specific skills based on course context
 */
function extractDomainSkills(text: string, courseContext: string): ExtractedSkill[] {
  const skills: ExtractedSkill[] = [];
  const lowerContext = courseContext.toLowerCase();
  const lowerText = text.toLowerCase();

  // Engineering/Technical domains
  if (lowerContext.includes('engineering') || lowerContext.includes('mechanics') || lowerContext.includes('physics')) {
    const engineeringTerms = [
      // Existing terms
      'fluid dynamics', 'thermodynamics', 'heat transfer', 'mass transfer',
      'stress analysis', 'finite element', 'cad design', 'structural analysis',
      'control systems', 'circuit design', 'signal processing', 'mechanical design',
      'thermal systems', 'hvac', 'computational fluid dynamics', 'cfd',
      
      // Fluid Mechanics specific terms
      'fluid mechanics', 'fluid statics', 'hydrostatics', 'hydrodynamics',
      'viscosity', 'fluid viscosity', 'kinematic viscosity', 'dynamic viscosity',
      'pressure', 'fluid pressure', 'pressure measurement', 'pressure distribution',
      'density', 'specific weight', 'specific gravity',
      'surface tension', 'vapor pressure', 'cavitation',
      'bernoulli equation', 'continuity equation', 'momentum equation',
      'reynolds number', 'flow measurement', 'pipe flow',
      'manometer', 'barometer', 'pressure gage',
      'laminar flow', 'turbulent flow', 'boundary layer',
      'drag force', 'lift force', 'hydraulic systems',
      
      // Related engineering analysis
      'force analysis', 'moment analysis', 'equilibrium analysis',
      'differential equation', 'integral analysis'
    ];

    engineeringTerms.forEach(term => {
      if (lowerText.includes(term)) {
        skills.push({
          skill: toTitleCase(term),
          category: 'technical',
          confidence: 0.90,
          source: text.substring(0, 100) + '...',
          keywords: term.split(' ')
        });
      }
    });
  }

  // Computer Science/Data Science domains
  if (lowerContext.includes('computer') || lowerContext.includes('data') || lowerContext.includes('software') || lowerContext.includes('cs')) {
    const csTerms = [
      'machine learning', 'deep learning', 'neural networks', 'data structures',
      'algorithms', 'database design', 'web development', 'api design',
      'cloud computing', 'data analysis', 'statistical modeling', 'data visualization',
      'natural language processing', 'computer vision', 'big data', 'nosql'
    ];

    csTerms.forEach(term => {
      if (lowerText.includes(term)) {
        skills.push({
          skill: toTitleCase(term),
          category: 'technical',
          confidence: 0.90,
          source: text.substring(0, 100) + '...',
          keywords: term.split(' ')
        });
      }
    });
  }

  // Business domains
  if (lowerContext.includes('business') || lowerContext.includes('management') || lowerContext.includes('marketing')) {
    const businessTerms = [
      'financial analysis', 'market research', 'swot analysis', 'competitive analysis',
      'business strategy', 'financial modeling', 'valuation', 'dcf analysis',
      'marketing strategy', 'brand management', 'customer segmentation', 'roi analysis',
      'project management', 'supply chain', 'operations management', 'process optimization'
    ];

    businessTerms.forEach(term => {
      if (lowerText.includes(term)) {
        skills.push({
          skill: toTitleCase(term),
          category: 'analytical',
          confidence: 0.90,
          source: text.substring(0, 100) + '...',
          keywords: term.split(' ')
        });
      }
    });
  }

  return skills;
}

/**
 * Categorize a skill based on its name and course context
 */
function categorizeSkill(skill: string, courseContext: string): SkillCategory {
  const lower = skill.toLowerCase();
  const context = courseContext.toLowerCase();

  // Tool/Software
  if (lower.match(/matlab|python|java|sql|excel|cad|ansys|tensorflow|spss|tableau|git|docker|aws/i)) {
    return 'tool';
  }

  // Framework/Method
  if (lower.match(/framework|methodology|method|approach|technique/i)) {
    return 'framework';
  }

  // Technical (Engineering, CS)
  if (context.match(/engineering|computer|software|technical|cs|data/) &&
      lower.match(/design|analysis|modeling|simulation|algorithm|system|calculation|computation/i)) {
    return 'technical';
  }

  // Analytical (Business, Research)
  if (lower.match(/analysis|research|strategy|evaluation|assessment|optimization/i)) {
    return 'analytical';
  }

  // Default to domain
  return 'domain';
}

/**
 * Check if a term is likely a technical term (not common words)
 */
function isTechnicalTerm(term: string, courseContext: string): boolean {
  const lower = term.toLowerCase();

  // Technical term patterns that should ALWAYS be accepted
  const technicalWhitelist = [
    /\b(analysis|dynamics|mechanics|simulation|optimization|modeling)\b/i,
    /\b(design|testing|validation|integration|implementation)\b/i,
    /\b(thermal|fluid|structural|mechanical|electrical|civil)\b/i,
    /\b(stress|strain|flow|pressure|velocity|force|energy)\b/i,
    /\b(control|systems|processing|manufacturing|fabrication)\b/i
  ];

  // Check whitelist first - if it's a technical term, always accept
  if (technicalWhitelist.some(pattern => pattern.test(term))) {
    return true;
  }

  // Filter out common non-technical words
  const commonWords = [
    'the', 'and', 'for', 'with', 'this', 'that', 'from', 'have', 'will',
    'understanding', 'knowledge', 'ability', 'students', 'learning', 'course',
    'project', 'assignment', 'semester', 'weekly', 'final', 'midterm'
  ];

  if (commonWords.includes(lower)) {
    return false;
  }
  
  // Only reject PURE INSTRUCTIONS (verb + article + generic object)
  // Example: "Explain the concept" ✓ reject
  // Example: "Flow Analysis" ✗ keep (it's a technical term)
  const instructionPatterns = [
    /^(convert|explain|define|describe|state|list)\s+(the|a|an)\s+/i,
    /^(solve|calculate|derive|determine)\s+(for|the)\s+/i,
    /^(identify|distinguish|formulate)\s+(the|all|various|different)\s+/i,
    /^(understand|apply)\s+(the|concepts?|principles?)\s+/i
  ];

  // Reject only if it matches instruction pattern
  if (instructionPatterns.some(pattern => pattern.test(term))) {
    return false;
  }

  // Must be at least 2 words or a known technical term
  const wordCount = term.split(' ').length;
  if (wordCount < 2 && !isKnownTechnicalTerm(term)) {
    return false;
  }

  return true;
}

/**
 * Check if a single word is a known technical term
 */
function isKnownTechnicalTerm(term: string): boolean {
  const knownTerms = [
    'thermodynamics', 'aerodynamics', 'hydrodynamics', 'electromagnetism',
    'calculus', 'statistics', 'probability', 'regression', 'optimization',
    'algorithm', 'encryption', 'blockchain', 'kubernetes', 'tensorflow'
  ];
  return knownTerms.includes(term.toLowerCase());
}

/**
 * Extract keywords from a skill name
 */
function extractKeywords(skill: string): string[] {
  return skill
    .toLowerCase()
    .replace(/['']/g, '') // Remove apostrophes
    .split(/\s+/)
    .filter(word => word.length > 2 && !['the', 'and', 'for', 'with'].includes(word));
}

/**
 * Normalize skill name to a standard format
 */
function normalizeSkillName(skill: string): string {
  // Remove extra whitespace
  let normalized = skill.trim().replace(/\s+/g, ' ');

  // Capitalize first letter of each word
  normalized = toTitleCase(normalized);

  // Remove possessive 's if present at the end
  normalized = normalized.replace(/['']s\s/g, ' ');

  return normalized;
}

/**
 * Convert to title case
 */
function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => {
    // Keep acronyms uppercase
    if (txt === txt.toUpperCase() && txt.length > 1) {
      return txt;
    }
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

/**
 * Deduplicate skills that are similar
 */
function deduplicateSkills(skills: ExtractedSkill[]): ExtractedSkill[] {
  const deduped: ExtractedSkill[] = [];
  const seen = new Set<string>();

  for (const skill of skills) {
    const normalized = skill.skill.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (!seen.has(normalized)) {
      seen.add(normalized);
      deduped.push(skill);
    } else {
      // Merge with existing skill (increase confidence)
      const existing = deduped.find(s =>
        s.skill.toLowerCase().replace(/[^a-z0-9]/g, '') === normalized
      );
      if (existing && existing.confidence < 0.95) {
        existing.confidence = Math.min(0.95, existing.confidence + 0.05);
      }
    }
  }

  return deduped;
}

/**
 * Format skills for logging/display
 */
export function formatSkillsForDisplay(result: SkillExtractionResult): string {
  const lines = [
    `\n📊 Skill Extraction Results for: ${result.courseContext}`,
    `   Total Skills: ${result.totalExtracted}`,
    `   Method: ${result.extractionMethod}`,
    '\n   Skills by Category:'
  ];

  const byCategory = result.skills.reduce((acc, skill) => {
    if (!acc[skill.category]) acc[skill.category] = [];
    acc[skill.category].push(skill);
    return acc;
  }, {} as Record<SkillCategory, ExtractedSkill[]>);

  Object.entries(byCategory).forEach(([category, skills]) => {
    lines.push(`\n   ${category.toUpperCase()}:`);
    skills.forEach(skill => {
      lines.push(`     • ${skill.skill} (confidence: ${skill.confidence.toFixed(2)})`);
    });
  });

  return lines.join('\n');
}

/**
 * Get top N skills by confidence
 */
export function getTopSkills(result: SkillExtractionResult, n: number = 10): ExtractedSkill[] {
  return result.skills
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, n);
}

/**
 * Filter skills by category
 */
export function filterSkillsByCategory(
  result: SkillExtractionResult,
  category: SkillCategory
): ExtractedSkill[] {
  return result.skills.filter(s => s.category === category);
}

/**
 * Get skill keywords for search/matching
 */
export function getSkillKeywords(result: SkillExtractionResult): string[] {
  const allKeywords = result.skills.flatMap(s => s.keywords);
  return [...new Set(allKeywords)]; // Deduplicate
}
