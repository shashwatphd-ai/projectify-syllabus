/**
 * Skill Extraction Service
 *
 * Extracts structured skills from course learning outcomes using NLP techniques.
 * This replaces generic text extraction with semantic skill identification.
 *
 * Phase 1 of intelligent company matching system.
 * Phase 2 Enhancement: Lightcast NLP as primary, pattern-matching as fallback.
 */

import { extractSkillsFromJobPosting, enrichSkillsWithLightcast, LightcastSkill } from './lightcast-service.ts';

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
  lightcastEnriched?: boolean; // Whether Lightcast was used
}

/**
 * NEW: Hybrid skill extraction - Lightcast primary, pattern-matching fallback
 * This is the recommended entry point for all skill extraction.
 */
export async function extractSkillsHybrid(
  outcomes: string[],
  courseTitle?: string,
  courseLevel?: string
): Promise<SkillExtractionResult> {
  console.log(`🧠 [Skill Extraction - Hybrid] Starting extraction...`);
  console.log(`  📚 Course: ${courseTitle || 'Unknown'} (${courseLevel || 'Unknown'})`);
  console.log(`  📝 Outcomes: ${outcomes.length}`);

  const courseContext = `${courseTitle || ''} ${courseLevel || ''}`.trim();
  const lightcastApiKey = Deno.env.get('LIGHTCAST_API_KEY');

  // Try Lightcast NLP extraction first (if API key is configured)
  if (lightcastApiKey) {
    console.log(`  🌟 Lightcast API available - using NLP extraction as primary`);
    
    try {
      const text = outcomes.join('\n');
      const lightcastSkills = await extractSkillsFromJobPosting(text);
      
      if (lightcastSkills && lightcastSkills.length > 0) {
        console.log(`  ✅ Lightcast extracted ${lightcastSkills.length} skills via NLP`);
        
        const skills: ExtractedSkill[] = lightcastSkills.map((ls: LightcastSkill) => ({
          skill: ls.name,
          category: mapLightcastTypeToCategory(ls.type),
          confidence: ls.confidence,
          source: 'Lightcast Skills Extractor API',
          keywords: ls.tags || []
        }));

        // Sort by confidence
        const sorted = skills.sort((a, b) => b.confidence - a.confidence);
        
        sorted.forEach(skill => {
          console.log(`    • ${skill.skill} (${skill.category}, confidence: ${skill.confidence.toFixed(2)})`);
        });

        return {
          skills: sorted,
          totalExtracted: sorted.length,
          courseContext,
          extractionMethod: 'lightcast-nlp',
          lightcastEnriched: true
        };
      } else {
        console.log(`  ⚠️  Lightcast returned no skills - falling back to pattern matching`);
      }
    } catch (error) {
      console.error(`  ❌ Lightcast extraction failed: ${error}`);
      console.log(`  ⚠️  Falling back to pattern matching`);
    }
  } else {
    console.log(`  ⚠️  Lightcast API key not configured - using pattern matching`);
  }

  // Fallback to pattern-based extraction
  return extractSkillsFromOutcomes(outcomes, courseTitle, courseLevel);
}

/**
 * Map Lightcast skill type to our category system
 */
function mapLightcastTypeToCategory(lightcastType: string): SkillCategory {
  const lowerType = lightcastType.toLowerCase();
  if (lowerType === 'hard' || lowerType === 'technical') return 'technical';
  if (lowerType === 'soft' || lowerType === 'common') return 'analytical';
  if (lowerType === 'certification') return 'framework';
  if (lowerType === 'tool' || lowerType === 'software') return 'tool';
  return 'domain';
}

/**
 * Original pattern-based skill extraction function (now used as fallback)
 * Analyzes course outcomes and extracts structured skills
 */
export async function extractSkillsFromOutcomes(
  outcomes: string[],
  courseTitle?: string,
  courseLevel?: string
): Promise<SkillExtractionResult> {
  console.log(`🧠 [Skill Extraction - Pattern] Starting extraction...`);
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
  let deduplicated = deduplicateSkills(skills);

  // Fallback to course-title-based inference for generic courses
  // If we extracted very few skills (< 3), the learning outcomes are probably too generic
  // In this case, infer skills from the course title itself
  if (deduplicated.length < 3 && courseTitle) {
    console.log(`  ⚠️  Low skill count (${deduplicated.length}) - learning outcomes too generic`);
    console.log(`  🎯 Inferring skills from course title: "${courseTitle}"`);
    
    const inferredSkills = inferSkillsFromCourseTitle(courseTitle, courseLevel || '');
    
    if (inferredSkills.length > 0) {
      console.log(`  ✅ Inferred ${inferredSkills.length} skills from course title`);
      inferredSkills.forEach(skill => {
        console.log(`    • ${skill.skill} (${skill.category}, confidence: ${skill.confidence.toFixed(2)})`);
      });
      
      // Merge inferred skills with extracted skills
      deduplicated = deduplicateSkills([...deduplicated, ...inferredSkills]);
    }
  }

  // Sort by confidence (highest first)
  const sorted = deduplicated.sort((a, b) => b.confidence - a.confidence);

  console.log(`  ✅ Final: ${sorted.length} unique skills`);
  sorted.forEach(skill => {
    console.log(`    • ${skill.skill} (${skill.category}, confidence: ${skill.confidence.toFixed(2)})`);
  });

  const extractionMethod = sorted.some(s => s.source.includes('Inferred from course title'))
    ? 'pattern-based-nlp + title-inference'
    : 'pattern-based-nlp';

  return {
    skills: sorted,
    totalExtracted: sorted.length,
    courseContext,
    extractionMethod,
    lightcastEnriched: false
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
 * Infer skills from course title when learning outcomes are too generic
 * Handles introductory courses with generic outcomes like "explain", "describe"
 */
function inferSkillsFromCourseTitle(courseTitle: string, courseLevel: string): ExtractedSkill[] {
  const skills: ExtractedSkill[] = [];
  const lowerTitle = courseTitle.toLowerCase();
  const isIntro = courseLevel.toLowerCase().includes('intro') || 
                  lowerTitle.includes('intro') || 
                  lowerTitle.includes('fundamentals') ||
                  lowerTitle.includes('principles') ||
                  lowerTitle.includes('basics');

  // Confidence multiplier for intro courses (slightly lower)
  const confidenceMultiplier = isIntro ? 0.85 : 0.90;

  // Course-to-skills mapping for all major disciplines
  const courseMappings: Record<string, { skills: string[], category: SkillCategory }> = {
    // Engineering disciplines
    'systems engineering': {
      skills: ['Systems Design', 'Requirements Analysis', 'System Integration', 'Process Modeling', 'Systems Thinking', 'Technical Documentation', 'Systems Architecture', 'Lifecycle Management'],
      category: 'technical'
    },
    'industrial engineering': {
      skills: ['Process Optimization', 'Lean Manufacturing', 'Six Sigma', 'Supply Chain Management', 'Operations Research', 'Quality Control', 'Process Improvement', 'Facility Layout', 'Work Study', 'Production Planning', 'Inventory Management'],
      category: 'technical'
    },
    'mechanical engineering': {
      skills: ['Mechanical Design', 'CAD Design', 'Thermodynamics', 'Fluid Mechanics', 'Materials Science', 'Manufacturing Processes', 'Finite Element Analysis', 'Stress Analysis', 'Machine Design', 'HVAC Systems'],
      category: 'technical'
    },
    'civil engineering': {
      skills: ['Structural Analysis', 'Geotechnical Engineering', 'Surveying', 'Construction Management', 'Hydraulics', 'Transportation Engineering', 'Concrete Design', 'Steel Design', 'Project Planning'],
      category: 'technical'
    },
    'electrical engineering': {
      skills: ['Circuit Design', 'Signal Processing', 'Power Systems', 'Control Systems', 'Electronics', 'Microcontrollers', 'PCB Design', 'Embedded Systems', 'Digital Systems', 'Analog Design'],
      category: 'technical'
    },
    'chemical engineering': {
      skills: ['Chemical Processes', 'Process Control', 'Reaction Engineering', 'Separation Processes', 'Mass Transfer', 'Heat Transfer', 'Process Design', 'Chemical Safety', 'Plant Design'],
      category: 'technical'
    },
    'computer science': {
      skills: ['Programming', 'Data Structures', 'Algorithms', 'Software Development', 'Database Management', 'Web Development', 'Object-Oriented Programming', 'Software Engineering', 'Problem Solving'],
      category: 'technical'
    },
    'software engineering': {
      skills: ['Software Design', 'Agile Development', 'Version Control', 'Testing', 'Code Review', 'System Architecture', 'API Design', 'DevOps', 'Software Documentation'],
      category: 'technical'
    },
    'data science': {
      skills: ['Data Analysis', 'Statistical Modeling', 'Machine Learning', 'Data Visualization', 'Python Programming', 'SQL', 'Data Cleaning', 'Predictive Analytics', 'Data Mining'],
      category: 'analytical'
    },
    'business analytics': {
      skills: ['Business Intelligence', 'Data Analysis', 'KPI Tracking', 'Statistical Analysis', 'Reporting', 'Dashboard Design', 'Predictive Modeling', 'Data-Driven Decision Making'],
      category: 'analytical'
    },
    'project management': {
      skills: ['Project Planning', 'Risk Management', 'Stakeholder Management', 'Budgeting', 'Scheduling', 'Team Leadership', 'Change Management', 'Agile Methodologies', 'Communication'],
      category: 'framework'
    },
    'supply chain': {
      skills: ['Supply Chain Planning', 'Logistics', 'Procurement', 'Inventory Management', 'Demand Forecasting', 'Warehouse Management', 'Distribution', 'Supplier Relations'],
      category: 'analytical'
    },
    'operations management': {
      skills: ['Process Analysis', 'Capacity Planning', 'Quality Management', 'Lean Operations', 'Operations Strategy', 'Workflow Optimization', 'Resource Allocation', 'Performance Metrics'],
      category: 'analytical'
    },
    'marketing': {
      skills: ['Market Research', 'Brand Management', 'Digital Marketing', 'Customer Segmentation', 'Marketing Strategy', 'Content Marketing', 'Social Media Marketing', 'Marketing Analytics'],
      category: 'analytical'
    },
    'finance': {
      skills: ['Financial Analysis', 'Financial Modeling', 'Valuation', 'Investment Analysis', 'Risk Assessment', 'Portfolio Management', 'Financial Reporting', 'Corporate Finance'],
      category: 'analytical'
    },
    'accounting': {
      skills: ['Financial Accounting', 'Managerial Accounting', 'Cost Accounting', 'Tax Accounting', 'Audit', 'Financial Statements', 'Bookkeeping', 'Compliance'],
      category: 'analytical'
    },
    'human resources': {
      skills: ['Talent Acquisition', 'Performance Management', 'Employee Relations', 'HR Analytics', 'Compensation Planning', 'Training & Development', 'HR Compliance', 'Workforce Planning'],
      category: 'analytical'
    }
  };

  // Match course title to skill mappings
  for (const [courseName, mapping] of Object.entries(courseMappings)) {
    if (lowerTitle.includes(courseName)) {
      console.log(`    🎯 Matched course pattern: "${courseName}"`);
      
      mapping.skills.forEach(skill => {
        skills.push({
          skill,
          category: mapping.category,
          confidence: 0.75 * confidenceMultiplier, // Base confidence 0.75, reduced for intro courses
          source: `Inferred from course title: ${courseTitle}`,
          keywords: skill.toLowerCase().split(' ').filter(w => w.length > 2)
        });
      });
      
      break; // Only match one pattern to avoid duplicates
    }
  }

  // If no specific match, try to extract discipline keywords
  if (skills.length === 0) {
    const disciplines = ['engineering', 'computer', 'business', 'management', 'science', 'design'];
    const foundDiscipline = disciplines.find(d => lowerTitle.includes(d));
    
    if (foundDiscipline) {
      console.log(`    🎯 Found general discipline: "${foundDiscipline}"`);
      // Add generic analytical/problem-solving skills
      const genericSkills = ['Problem Solving', 'Critical Thinking', 'Analytical Skills', 'Technical Communication', 'Teamwork'];
      genericSkills.forEach(skill => {
        skills.push({
          skill,
          category: 'analytical',
          confidence: 0.60 * confidenceMultiplier,
          source: `Inferred from discipline: ${foundDiscipline}`,
          keywords: skill.toLowerCase().split(' ').filter(w => w.length > 2)
        });
      });
    }
  }

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
