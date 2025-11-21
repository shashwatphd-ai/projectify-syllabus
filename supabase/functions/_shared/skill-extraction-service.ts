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

  // Pattern 3: Tools and software (EXPANDED for all disciplines)
  const toolPattern = /\b(MATLAB|Python|Java|JavaScript|TypeScript|C\+\+|C#|Ruby|PHP|Swift|Kotlin|Go|Rust|SQL|NoSQL|MongoDB|PostgreSQL|MySQL|Redis|Excel|PowerBI|Tableau|PowerPoint|Word|Access|Outlook|AutoCAD|SolidWorks|CATIA|Revit|SketchUp|ANSYS|COMSOL|Abaqus|SPSS|SAS|Stata|R|Minitab|JMP|TensorFlow|PyTorch|Keras|Scikit-learn|Pandas|NumPy|Git|GitHub|GitLab|Bitbucket|Docker|Kubernetes|Jenkins|CircleCI|AWS|Azure|GCP|Heroku|Vercel|Netlify|Salesforce|HubSpot|Marketo|Google Analytics|Adobe Creative Suite|Photoshop|Illustrator|InDesign|Premiere|After Effects|Figma|Sketch|InVision|Zeplin|Jira|Confluence|Trello|Asana|Slack|Teams|Zoom|QuickBooks|SAP|Oracle|NetSuite|LabVIEW|Simulink|PSpice|LTSpice|NI Multisim|VHDL|Verilog|Quartus|Xilinx|Vivado|Altium|Eagle|KiCad|SCADA|HMI|PLC|Arduino|Raspberry Pi|ROS|Gazebo)\b/gi;
  const toolMatches = text.matchAll(toolPattern);

  for (const match of toolMatches) {
    const tool = match[1];
    skills.push({
      skill: tool.includes('Python') || tool.includes('Java') || tool.includes('SQL') 
        ? `${tool} Programming` 
        : tool,
      category: 'tool',
      confidence: 0.95,
      source: text.substring(0, 100) + '...',
      keywords: [tool.toLowerCase()]
    });
  }

  // Pattern 4: Domain-specific terms from course context
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

  // Engineering/Technical domains (EXPANDED)
  if (lowerContext.includes('engineering') || lowerContext.includes('mechanics') || lowerContext.includes('physics') || 
      lowerContext.includes('civil') || lowerContext.includes('electrical') || lowerContext.includes('chemical') ||
      lowerContext.includes('industrial') || lowerContext.includes('aerospace') || lowerContext.includes('biomedical')) {
    const engineeringTerms = [
      'fluid dynamics', 'fluid mechanics', 'thermodynamics', 'heat transfer', 'mass transfer',
      'stress analysis', 'finite element analysis', 'fea', 'cad design', 'structural analysis',
      'control systems', 'circuit design', 'signal processing', 'mechanical design',
      'thermal systems', 'hvac', 'computational fluid dynamics', 'cfd',
      'statics', 'dynamics', 'kinematics', 'kinetics', 'vibrations', 'acoustics',
      'materials science', 'metallurgy', 'composites', 'polymers', 'ceramics',
      'manufacturing processes', 'machining', 'welding', 'casting', 'forming',
      'quality control', 'six sigma', 'lean manufacturing', 'process optimization',
      'power systems', 'energy systems', 'renewable energy', 'solar', 'wind', 'hydro',
      'robotics', 'automation', 'mechatronics', 'plc programming', 'scada',
      'electronics', 'microcontrollers', 'embedded systems', 'pcb design',
      'chemical processes', 'process control', 'reaction engineering', 'separation processes',
      'biomedical devices', 'medical imaging', 'biomechanics', 'tissue engineering',
      'geotechnical engineering', 'surveying', 'hydraulics', 'construction management',
      'transportation engineering', 'traffic engineering', 'urban planning'
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

  // Computer Science/Data Science domains (EXPANDED)
  if (lowerContext.includes('computer') || lowerContext.includes('data') || lowerContext.includes('software') || 
      lowerContext.includes('cs') || lowerContext.includes('it') || lowerContext.includes('information') ||
      lowerContext.includes('cyber') || lowerContext.includes('network')) {
    const csTerms = [
      'machine learning', 'deep learning', 'neural networks', 'artificial intelligence', 'ai',
      'data structures', 'algorithms', 'computational complexity', 'graph theory',
      'database design', 'sql', 'nosql', 'database management', 'data warehousing', 'etl',
      'web development', 'frontend development', 'backend development', 'full stack',
      'api design', 'rest api', 'graphql', 'microservices', 'system architecture',
      'cloud computing', 'aws', 'azure', 'gcp', 'serverless', 'containers', 'kubernetes',
      'data analysis', 'statistical modeling', 'data visualization', 'business intelligence',
      'natural language processing', 'nlp', 'computer vision', 'image processing',
      'big data', 'hadoop', 'spark', 'data pipelines', 'data engineering',
      'software engineering', 'object oriented programming', 'oop', 'design patterns',
      'agile development', 'scrum', 'devops', 'ci cd', 'version control', 'git',
      'mobile development', 'ios development', 'android development', 'react native',
      'cybersecurity', 'network security', 'cryptography', 'penetration testing',
      'operating systems', 'linux', 'unix', 'system administration',
      'networking', 'tcp ip', 'routing', 'switching', 'firewalls',
      'ui ux design', 'user interface', 'user experience', 'prototyping',
      'game development', 'unity', 'unreal engine', '3d modeling',
      'blockchain', 'smart contracts', 'cryptocurrency', 'distributed systems'
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

  // Business/Management/Finance domains (EXPANDED)
  if (lowerContext.includes('business') || lowerContext.includes('management') || lowerContext.includes('marketing') ||
      lowerContext.includes('finance') || lowerContext.includes('accounting') || lowerContext.includes('economics') ||
      lowerContext.includes('mba') || lowerContext.includes('commerce') || lowerContext.includes('entrepreneurship')) {
    const businessTerms = [
      'financial analysis', 'financial modeling', 'valuation', 'dcf analysis', 'lbo modeling',
      'market research', 'swot analysis', 'competitive analysis', 'porter five forces',
      'business strategy', 'strategic planning', 'business development', 'corporate strategy',
      'marketing strategy', 'brand management', 'customer segmentation', 'roi analysis',
      'digital marketing', 'social media marketing', 'content marketing', 'seo', 'sem',
      'project management', 'agile project management', 'pmp', 'change management',
      'supply chain management', 'logistics', 'procurement', 'inventory management',
      'operations management', 'process optimization', 'quality management', 'lean six sigma',
      'financial accounting', 'managerial accounting', 'cost accounting', 'tax accounting',
      'audit', 'internal audit', 'compliance', 'risk management', 'internal controls',
      'investment banking', 'equity research', 'asset management', 'portfolio management',
      'corporate finance', 'mergers acquisitions', 'm&a', 'capital markets',
      'economics', 'microeconomics', 'macroeconomics', 'econometrics', 'regression analysis',
      'human resources', 'hr management', 'talent acquisition', 'performance management',
      'organizational behavior', 'leadership', 'team management', 'conflict resolution',
      'sales management', 'business to business', 'b2b sales', 'crm', 'salesforce',
      'entrepreneurship', 'startup', 'venture capital', 'fundraising', 'pitch deck',
      'e-commerce', 'retail management', 'merchandising', 'pricing strategy',
      'international business', 'global strategy', 'cross cultural management',
      'business analytics', 'data driven decision making', 'predictive analytics', 'kpi tracking'
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
