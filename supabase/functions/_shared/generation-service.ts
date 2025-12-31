/**
 * GENERATION SERVICE
 * 
 * Handles AI-powered project proposal generation.
 * 
 * EXTRACTED from generate-projects/index.ts to eliminate "ghost logic" and intermittency.
 */

import { withAICircuit } from './circuit-breaker.ts';
import { AI_GATEWAY_TIMEOUT_MS, fetchWithTimeout } from './timeout-config.ts';

interface CompanyInfo {
  id?: string;
  name: string;
  sector: string;
  size: string;
  needs: string[];
  description: string;
  seo_description?: string;
  website?: string;
  inferred_needs?: string[];
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_person?: string | null;
  contact_title?: string | null;
  contact_first_name?: string | null;
  contact_last_name?: string | null;
  full_address?: string | null;
  linkedin_profile?: string | null;
  // Market Intelligence from Apollo
  job_postings?: any[];
  technologies_used?: string[];
  funding_stage?: string | null;
  data_completeness_score?: number;
  enrichment_level?: string;
  data_enrichment_level?: string;
  // Apollo Enriched Fields
  buying_intent_signals?: any[];
  total_funding_usd?: number | null;
  organization_employee_count?: string | null;
  organization_revenue_range?: string | null;
  // Intelligence Fields
  match_score?: number;
  match_reason?: string;
  // === NEW: Company Context for Accurate Project Generation ===
  industries?: string[];               // Multi-industry classification from Apollo
  keywords?: string[];                 // Company capability keywords from Apollo
}

interface ProjectProposal {
  title: string;
  company_name: string;
  sector: string;
  tasks: string[];
  deliverables: string[];
  tier: string;
  lo_alignment: string;
  company_needs: string[];
  description: string;
  skills: string[];
  contact: {
    name: string;
    title: string;
    email: string;
    phone: string;
  };
  company_description: string;
  website: string;
  equipment: string;
  majors: string[];
  faculty_expertise: string;
  publication_opportunity: string;
}

/**
 * Generate Project Proposal using Lovable AI
 *
 * Creates a complete project proposal by analyzing:
 * - Course context (title, outcomes, artifacts, level) - PRIMARY CONSTRAINT
 * - Company data (needs, sector, intelligence) - SECONDARY CONTEXT
 * - Constraints (duration, hours per week)
 *
 * Returns a structured ProjectProposal with tasks, deliverables, and metadata.
 *
 * P0-3 FIX: Added courseTitle parameter to ensure AI generates course-relevant projects
 */
export async function generateProjectProposal(
  company: CompanyInfo,
  outcomes: string[],
  artifacts: string[],
  level: string,
  weeks: number,
  hrsPerWeek: number,
  courseTitle?: string
): Promise<ProjectProposal> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

  const systemPrompt = `You are an elite experiential learning designer creating HIGH-VALUE, SPECIFIC project proposals.

⚠️ ABSOLUTE REQUIREMENTS - FAILURE TO COMPLY WILL RESULT IN REJECTION:

1. FORBIDDEN GENERIC TERMS (Automatic Rejection):
   ❌ "research", "analyze", "synthesis", "investigate", "explore", "recommendations", "report", "memo", "presentation", "findings"
   ❌ Generic skills: "communication", "leadership", "teamwork", "critical thinking", "problem solving"

2. MANDATORY SPECIFICITY IN EVERY ELEMENT:
   ✅ Tasks: MUST include named framework/tool + quantified scope + specific data source
      Example: "Conduct Porter's Five Forces analysis using 2024 IBISWorld data for telehealth market"
   ✅ Deliverables: MUST be named artifacts with format specified
      Example: "Competitive Positioning Matrix in Excel comparing 12 vendors across 15 features"
   ✅ Skills: MUST be domain-specific technical/business skills extracted FROM your tasks
      Example: If task uses "DCF Model", skill = "Discounted Cash Flow Valuation"

3. EXTRACTION RULE - Skills MUST Mirror Tasks:
   - If task mentions "SWOT" → skill = "SWOT Strategic Analysis"
   - If task mentions "SQL" → skill = "SQL Database Querying"
   - If task mentions "Tableau" → skill = "Tableau Data Visualization"
   - If task mentions "survey 200+ customers" → skill = "Primary Customer Research" or "Survey Design & Analysis"

Return ONLY valid JSON, no markdown code blocks.`;
  
  // CRITICAL: Verify we have intelligent company data
  const hasSpecificNeeds = company.needs && company.needs.length > 0 && 
    !company.needs.every(need => need.toLowerCase().includes('general') || need.toLowerCase().includes('sales growth'));
  
  const hasIntelligence = (company.job_postings && company.job_postings.length > 0) || 
    (company.technologies_used && company.technologies_used.length > 0) || 
    company.funding_stage;
  
  if (!hasSpecificNeeds && !hasIntelligence) {
    console.warn('⚠ WARNING: Company has generic needs and no Apollo intelligence. Quality may be lower.');
  }
  
  // Build company intelligence section
  let intelligenceSection = '';
  if (hasIntelligence) {
    intelligenceSection = `\n\nREAL-TIME MARKET INTELLIGENCE (USE THIS DATA):`;
    if (company.job_postings && company.job_postings.length > 0) {
      intelligenceSection += `\n- Active Hiring: ${company.job_postings.length} open positions`;
      const sampleJobs = company.job_postings.slice(0, 3).map((j: any) => j.title || j.name).filter(Boolean);
      if (sampleJobs.length > 0) {
        intelligenceSection += ` (${sampleJobs.join(', ')})`;
        intelligenceSection += `\n  → EXTRACT SKILLS FROM JOB TITLES: If hiring for "Data Analyst", include "Data Analysis", "SQL", "Statistical Modeling"`;
      }
    }
    if (company.technologies_used && company.technologies_used.length > 0) {
      intelligenceSection += `\n- Technology Stack: ${company.technologies_used.slice(0, 5).join(', ')}`;
      intelligenceSection += `\n  → INCORPORATE THESE TECHNOLOGIES: Mention specific tools in tasks (e.g., "Build dashboard in ${company.technologies_used[0]}")`;
    }
    if (company.funding_stage) {
      intelligenceSection += `\n- Growth Stage: ${company.funding_stage}`;
      intelligenceSection += `\n  → TAILOR PROJECT SCOPE: ${company.funding_stage === 'Series A' || company.funding_stage === 'Seed' ? 'Focus on growth metrics, customer acquisition' : 'Focus on operational efficiency, scaling'}`;
    }
    if (company.buying_intent_signals && company.buying_intent_signals.length > 0) {
      intelligenceSection += `\n- Buying Signals: ${company.buying_intent_signals.length} detected`;
    }
  }

  // P0-3 FIX: Course-first prompt structure
  const prompt = `Design a ${weeks}-week project for ${level} students that applies COURSE CONCEPTS to solve a company's real-world problem.

🎓 PRIMARY CONSTRAINT: COURSE SUBJECT MATTER (This determines project type)
Course Title: ${courseTitle || level}
Academic Level: ${level}

📚 COURSE LEARNING OUTCOMES (Project MUST enable students to practice these specific skills/concepts):
${outcomes.map((o, i) => `LO${i + 1}: ${o}`).join('\n')}

⚠️ CRITICAL REQUIREMENT: The project tasks and deliverables must require students to APPLY the concepts and methods from THIS COURSE.
   - If this is an ENGINEERING/SCIENCE course → Create TECHNICAL project with calculations, simulations, designs
   - If this is a BUSINESS course → Create business strategy/analytics project with frameworks
   - If this is a DATA/CS course → Create software/data analysis project with code, models, systems
   - DO NOT create generic consulting projects that ignore the course subject matter

REQUIRED COURSE DELIVERABLES (must be included in final project):
${artifacts.map(a => `- ${a}`).join('\n')}

---

🏢 COMPANY PARTNER PROFILE (Context for applying course concepts):
Name: ${company.name}
Sector: ${company.sector}
${(company.industries && company.industries.length > 0) ? `Industries: ${company.industries.join(', ')}` : ''}
Size: ${company.size}
Website: ${company.website || 'Not available'}

📄 COMPANY DESCRIPTION (USE THIS EXACTLY - DO NOT FABRICATE OR MODIFY):
${company.description}

${(company.keywords && company.keywords.length > 0) ? `🏷️ Company Capabilities: ${company.keywords.slice(0, 10).join(', ')}` : ''}
${intelligenceSection}

COMPANY'S BUSINESS/TECHNICAL NEEDS (Select ONE that can be addressed using this course's concepts):
${company.needs.map((need, i) => `${i + 1}. ${need}`).join('\n')}

---

🎯 PROJECT DESIGN STRATEGY:

1. **IDENTIFY COURSE-COMPANY FIT**:
   - Look at course title and learning outcomes to understand what students are learning
   - Identify which company need can be addressed using THOSE SPECIFIC course concepts
   - Create a project that requires students to apply course knowledge to solve that need

2. **SUBJECT-SPECIFIC PROJECT TYPES**:

   📐 For ENGINEERING/TECHNICAL Courses (Mechanical, Electrical, Civil, Aerospace, Chemical, etc.):
   - Focus: Design, calculations, simulations, testing, optimization, analysis using engineering principles
   - Tools: CAD software (SolidWorks, AutoCAD), simulation tools (ANSYS, MATLAB, COMSOL), lab equipment, Python/R
   - Example Tasks: "Calculate heat transfer coefficients using convection equations", "Design structural system using finite element analysis", "Optimize circuit design using SPICE simulation"
   - Example Deliverables: "Technical Specifications Document with CAD Drawings", "FEA Simulation Results Report", "Prototype Design with Test Data"
   - Example Skills: "Finite Element Analysis", "Thermodynamic Calculations", "CAD Design", "Circuit Analysis"

   💻 For COMPUTER SCIENCE/DATA SCIENCE Courses:
   - Focus: Algorithms, data structures, software development, machine learning, database design, system architecture
   - Tools: Python, Java, SQL, R, TensorFlow, cloud platforms (AWS, Azure), Git, Docker
   - Example Tasks: "Implement recommendation algorithm using collaborative filtering on 100K+ user dataset", "Design database schema with normalization for e-commerce platform", "Build predictive model using Random Forest with 15 features"
   - Example Deliverables: "GitHub Repository with Working Code and Unit Tests", "ML Model with Performance Metrics Dashboard", "API Documentation with Swagger"
   - Example Skills: "Python Programming", "Machine Learning Model Development", "SQL Database Design", "RESTful API Development"

   📊 For BUSINESS/MANAGEMENT Courses:
   - Focus: Strategy, market analysis, financial modeling, operations, marketing, organizational behavior
   - Tools: Excel, SWOT, Porter's Five Forces, PESTEL, Business Model Canvas, financial models, market research
   - Example Tasks: "Conduct SWOT analysis of 8 competitors using public financial data", "Build DCF valuation model with sensitivity analysis", "Design customer segmentation using RFM analysis"
   - Example Deliverables: "Market Entry Strategy Deck", "5-Year Financial Forecast Model", "Competitive Positioning Matrix"
   - Example Skills: "SWOT Analysis", "DCF Valuation", "Market Segmentation", "Financial Forecasting"

   🔬 For SCIENCE Courses (Physics, Chemistry, Biology, Environmental Science, etc.):
   - Focus: Experiments, data collection, statistical analysis, lab techniques, scientific method application
   - Tools: Lab equipment, statistical software (R, SPSS), data analysis tools, scientific visualization
   - Example Tasks: "Conduct titration experiments to determine concentration with 95% confidence interval", "Analyze soil samples using spectroscopy for 10 heavy metals", "Design controlled experiment testing 5 variables with replication"
   - Example Deliverables: "Lab Report with Statistical Analysis", "Experimental Protocol Document", "Scientific Poster with Results"
   - Example Skills: "Experimental Design", "Statistical Analysis", "Lab Safety Protocols", "Data Visualization"

   📐 For MATHEMATICS/STATISTICS Courses:
   - Focus: Mathematical modeling, statistical inference, probability, optimization, computational methods
   - Tools: R, Python (NumPy, SciPy), MATLAB, Mathematica, statistical software
   - Example Tasks: "Build Monte Carlo simulation with 10,000 iterations", "Perform regression analysis on 5 years of data with 12 predictors", "Solve optimization problem using linear programming"
   - Example Deliverables: "Mathematical Model Report with Proofs", "Statistical Analysis Report with Confidence Intervals", "Optimization Results with Sensitivity Analysis"
   - Example Skills: "Regression Analysis", "Monte Carlo Simulation", "Linear Programming", "Hypothesis Testing"

3. **AVOID MISMATCHES** (These will cause rejection):
   ❌ Engineering course → Generic business consulting
   ❌ Engineering course → HR/recruitment project
   ❌ Technical course → Project with no calculations, simulations, or technical analysis
   ❌ Business course → Overly technical engineering tasks
   ❌ Any course → Tasks that don't require course-specific knowledge

---

PROJECT CONSTRAINTS:
- Duration: ${weeks} weeks (${weeks * hrsPerWeek} total hours)
- Effort: ${hrsPerWeek} hours/week per student
- Academic Level: ${level}

---

🚨 QUALITY REQUIREMENTS: SPECIFIC, HIGH-VALUE CONTENT

REJECTION TRIGGERS (Avoid these at ALL costs):
- Tasks/deliverables using vague words: "research", "analyze", "report", "memo", "recommendations", "findings"
- Generic skills: "communication", "leadership", "teamwork", "research", "analysis"
- Tasks without named frameworks/methodologies/tools/equations/software
- Deliverables like "Final Report" or "Analysis Document"

✅ SPECIFICITY EXAMPLES:

BAD Task (Engineering): "Analyze the system"
GOOD Task (Engineering): "Calculate pressure drop through piping system using Darcy-Weisbach equation for 5 configurations"

BAD Task (CS): "Write code for the project"
GOOD Task (CS): "Implement binary search tree with insert, delete, and balance operations in Python with O(log n) complexity"

BAD Task (Business): "Do market research"
GOOD Task (Business): "Survey 200+ target customers using Qualtrics to identify top 5 pain points in product onboarding"

BAD Deliverable (Engineering): "Technical Report"
GOOD Deliverable (Engineering): "Structural Analysis Report with FEA Results for 3 Load Cases and Safety Factor Calculations"

BAD Skill (Engineering): "Problem solving"
GOOD Skill (Engineering): "Finite Element Analysis", "Stress-Strain Calculations", "Material Selection Analysis"

Return ONLY valid JSON (no markdown code blocks):
{
  "title": "SPECIFIC project title using real business terms (e.g., 'Customer Churn Reduction Strategy for SaaS Platform', 'Digital Marketing Campaign for Healthcare Tech Startup'). NO generic terms like 'consulting' or 'analysis'",
  
  "description": "2-3 sentences describing the business problem, the solution approach, and measurable outcomes. Must be SPECIFIC to this company.",
  
  "tasks": [
    "Create exactly 7 tasks. EVERY SINGLE TASK MUST FOLLOW THIS EXACT FORMULA:
    
    📋 MANDATORY FORMULA: [Action Verb] + [Named Framework/Tool/Method] + [Quantified Scope] + [Specific Data/Context]
    
    🎯 ACTION VERBS TO USE:
    Conduct, Build, Create, Design, Develop, Map, Calculate, Implement, Construct, Model, Benchmark, Survey, Interview
    
    🔧 NAMED FRAMEWORKS/TOOLS (Pick from these or similar):
    - Analysis: SWOT, PESTEL, Porter's Five Forces, Value Chain Analysis, Ansoff Matrix, Blue Ocean Strategy
    - Financial: DCF Valuation, NPV Calculation, Break-even Analysis, ROI Modeling, Sensitivity Analysis, Pro Forma Statements
    - Process: BPMN Diagrams, Process Mapping, Lean Six Sigma, Value Stream Mapping, Gantt Charts
    - Data/Tech: SQL queries, Python analysis, Tableau dashboards, Excel models, Power BI, Qualtrics surveys, Google Analytics
    - Marketing: A/B Testing, Customer Journey Mapping, Persona Development, Content Strategy, SEO Analysis, Social Media Calendar
    - Research: Customer interviews, Competitive benchmarking, Market sizing, NPS calculation, Statistical analysis
    
    📊 QUANTIFICATION REQUIREMENTS (Must include numbers):
    - Sample sizes: '200+ customers', '50 stakeholder interviews', '10 competitors'
    - Time spans: 'last 3 years of data', '5-year forecast', '12-month plan'
    - Scope: '8 key metrics', '4 customer segments', '15-page analysis', '20-slide deck'
    
    ✅ EXAMPLES THAT WILL BE ACCEPTED:
    - 'Conduct SWOT analysis of top 8 competitors in the cybersecurity market using publicly available financial data'
    - 'Build customer segmentation model using K-means clustering on 50,000+ transaction records from past 2 years'
    - 'Design A/B testing framework for email campaigns with 5 variant designs targeting 10,000+ subscribers'
    - 'Map current order fulfillment process using BPMN notation identifying 10+ inefficiency points'
    - 'Calculate customer lifetime value (CLV) for 4 distinct segments using 3-year purchase history data'
    - 'Develop 12-month content calendar for LinkedIn and Instagram with 48 posts per month targeting B2B audience'
    - 'Create 5-year DCF valuation model in Excel with sensitivity analysis on 6 key revenue and cost drivers'
    
    ❌ EXAMPLES THAT WILL CAUSE REJECTION:
    - 'Conduct market research' (No framework, no scope, no data source)
    - 'Analyze customer feedback' (No method, vague)
    - 'Develop strategic recommendations' (This is output, not a task)
    - 'Research competitors' (No framework, no quantity)
    - 'Create a report on findings' (Generic, vague)"
  ],
  
  "deliverables": [
    "Create exactly 6 deliverables. EACH DELIVERABLE MUST:
    ✅ Be a NAMED, CONCRETE artifact (not 'report' or 'presentation')
    ✅ Include format/tool (Excel Model, PowerPoint Deck, Tableau Dashboard, Word Document, etc.)
    ✅ Specify page count or scope where applicable
    ✅ NO week numbers or timeline references
    ✅ Title Case formatting
    ✅ NO markdown
    
    Examples that WILL BE ACCEPTED:
    - 'Customer Segmentation Analysis (15-page report with 4 identified segments)'
    - 'Financial Forecasting Model in Excel with 5-Year DCF Valuation'
    - 'Social Media Campaign Strategy Deck (20 slides with content calendar)'
    - 'Interactive Sales Dashboard in Tableau with 8 Key Metrics'
    - 'Competitive Intelligence Matrix comparing 12 companies across 15 features'
    - 'Process Improvement Roadmap with BPMN diagrams and ROI calculations'
    
    Examples that WILL BE REJECTED:
    - 'Final Report' (not named)
    - 'Analysis Memo' (too generic)
    - 'Recommendations Presentation' (vague)
    - 'Week 4: Market Research Findings' (has timeline)"
  ],
  
  "skills": [
    "List exactly 7 DOMAIN-SPECIFIC skills. CRITICAL: Skills MUST be EXTRACTED directly from your tasks.
    
    🎯 SKILL EXTRACTION RULES (Follow this mapping EXACTLY):
    
    Framework/Method Mentioned → Required Skill:
    - 'SWOT' → 'SWOT Strategic Analysis'
    - 'Porter's Five Forces' → 'Porter's Five Forces Competitive Analysis'
    - 'PESTEL' → 'PESTEL Analysis'
    - 'DCF' or 'Discounted Cash Flow' → 'Discounted Cash Flow Valuation'
    - 'NPV' → 'NPV Calculation'
    - 'ROI' → 'ROI Financial Modeling'
    - 'Sensitivity Analysis' → 'Sensitivity Analysis'
    - 'Break-even' → 'Break-even Analysis'
    - 'BPMN' → 'BPMN Process Mapping'
    - 'Lean Six Sigma' → 'Lean Six Sigma Methodology'
    - 'Gantt' → 'Gantt Chart Project Planning'
    
    Tool/Technology Mentioned → Required Skill:
    - 'Excel model' → 'Financial Modeling in Excel'
    - 'Tableau' → 'Tableau Data Visualization'
    - 'Python' → 'Python Data Analysis'
    - 'SQL' → 'SQL Database Querying'
    - 'Power BI' → 'Power BI Business Intelligence'
    - 'Google Analytics' → 'Google Analytics Web Analytics'
    - 'Qualtrics' → 'Qualtrics Survey Design'
    
    Research Method Mentioned → Required Skill:
    - 'customer interviews' or 'stakeholder interviews' → 'Qualitative Research & Interviews'
    - 'survey' → 'Survey Design & Analysis'
    - 'competitive benchmarking' → 'Competitive Benchmarking'
    - 'market sizing' → 'Market Sizing & Forecasting'
    - 'NPS' → 'Net Promoter Score Analysis'
    
    Marketing Activity Mentioned → Required Skill:
    - 'A/B testing' → 'A/B Testing & Experimentation'
    - 'customer journey' → 'Customer Journey Mapping'
    - 'persona' → 'Customer Persona Development'
    - 'content calendar' → 'Content Strategy'
    - 'SEO' → 'SEO & Digital Marketing'
    - 'social media' → 'Social Media Strategy'
    
    ⛔ AUTOMATIC REJECTION - NEVER INCLUDE THESE:
    'Communication', 'Leadership', 'Teamwork', 'Research', 'Analysis', 'Critical Thinking', 
    'Problem Solving', 'Presentation', 'Writing', 'Collaboration', 'Time Management'
    
    ✅ VALID SKILL EXAMPLES (Specific, Domain-Relevant, Extracted):
    - 'SWOT Strategic Analysis'
    - 'Porter's Five Forces Competitive Analysis'
    - 'Discounted Cash Flow Valuation'
    - 'SQL Database Querying'
    - 'Tableau Data Visualization'
    - 'Customer Journey Mapping'
    - 'A/B Testing & Experimentation'
    - 'BPMN Process Mapping'
    - 'Market Sizing & Forecasting'
    - 'Net Promoter Score Analysis'
    - 'Financial Modeling in Excel'
    - 'Competitive Benchmarking'
    - 'Survey Design & Analysis'
    - 'Content Strategy'
    - 'SEO & Digital Marketing'
    
    ❌ INVALID SKILLS (Will Cause Rejection):
    - 'Communication' (generic soft skill)
    - 'Analysis' (vague, no context)
    - 'Research' (not specific)
    - 'Data Analysis' (too broad, be specific: 'Python Data Analysis' or 'Statistical Data Analysis')
    - 'Marketing' (too broad, be specific: 'Digital Marketing Strategy' or 'SEO & Content Marketing')"
  ],
  
  "tier": "Select 'Intermediate' for standard business consulting/analytics projects, 'Advanced' for technical implementation or strategic transformation requiring specialized skills",
  
  "lo_alignment": "Write 2-3 sentences explaining which SPECIFIC learning outcomes (use LO numbers) are addressed by which SPECIFIC tasks and deliverables",
  
  "company_needs": ["List the 1-2 specific company needs from the needs list that this project directly addresses"],
  
  "contact": {
    "name": "${company.contact_first_name && company.contact_last_name ? `${company.contact_first_name} ${company.contact_last_name}` : 'Generate realistic FirstName LastName (no titles in name)'}",
    "title": "${company.contact_title || 'Generate appropriate role: VP of [Function], Director of [Department], Chief [Role] Officer'}",
    "email": "${company.contact_email || `firstname.lastname@${company.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}.com`}",
    "phone": "${company.contact_phone || 'Generate US format: (XXX) XXX-XXXX with realistic area code'}"
  },
  
  "company_description": "${company.description ? company.description.substring(0, 600) : (company.seo_description ? company.seo_description.substring(0, 600) : `${company.name} is a ${company.sector || 'business'} company.`)}",
  
  "website": "${company.website || `https://www.${company.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}.com`}",
  
  "equipment": "List SPECIFIC software/tools required (e.g., 'Excel, Tableau, Python 3.x, Qualtrics, Google Analytics') OR 'Standard university computer lab equipment' if no special requirements",
  
  "majors": ["List 2-4 student majors that would benefit most. Examples: 'Business Analytics', 'Marketing', 'Computer Science', 'Healthcare Management', 'Supply Chain Management', 'Finance', 'Data Science'"],
  
  "faculty_expertise": "Describe specific faculty expertise helpful for advising (e.g., 'Healthcare operations research and process improvement', 'Digital marketing and consumer behavior', 'Predictive analytics and machine learning')",
  
  "publication_opportunity": "Answer 'Yes' if project could generate publishable research insights, 'No' if purely applied consulting"
}`;

  // Use circuit breaker and timeout for AI Gateway resilience
  const circuitResult = await withAICircuit(async () => {
    const response = await fetchWithTimeout(
      'https://ai.gateway.lovable.dev/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.4,  // Lower temperature for more consistent, rule-following output
        }),
      },
      AI_GATEWAY_TIMEOUT_MS,
      'AI Project Proposal Generation'
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('AI proposal error:', response.status, error);
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      }
      if (response.status === 402) {
        throw new Error('AI credits exhausted. Please add credits to your Lovable workspace.');
      }
      
      throw new Error(`AI API error: ${response.status} - ${error}`);
    }

    return response.json();
  });

  if (!circuitResult.success) {
    throw new Error(circuitResult.error || 'AI Gateway circuit breaker open');
  }

  const data = circuitResult.data;
  const content = data?.choices?.[0]?.message?.content;
  
  const jsonMatch = content?.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No valid JSON in response');
  
  const proposal = JSON.parse(jsonMatch[0]);
  
  return {
    ...proposal,
    company_name: company.name,
    sector: company.sector,
  };
}
