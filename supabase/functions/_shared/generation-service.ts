/**
 * GENERATION SERVICE
 * 
 * Handles AI-powered project proposal generation.
 * 
 * EXTRACTED from generate-projects/index.ts to eliminate "ghost logic" and intermittency.
 */

interface CompanyInfo {
  id?: string;
  name: string;
  sector: string;
  size: string;
  needs: string[];
  description: string;
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
 * - Company data (needs, sector, intelligence)
 * - Course requirements (outcomes, artifacts, level)
 * - Constraints (duration, hours per week)
 * 
 * Returns a structured ProjectProposal with tasks, deliverables, and metadata.
 */
export async function generateProjectProposal(
  company: CompanyInfo,
  outcomes: string[],
  artifacts: string[],
  level: string,
  weeks: number,
  hrsPerWeek: number
): Promise<ProjectProposal> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

  const systemPrompt = `You are an expert experiential learning designer. You MUST create SPECIFIC, DETAILED, HIGH-VALUE project proposals.
  
CRITICAL RULES YOU MUST FOLLOW:
1. NEVER use generic business terms like "research", "analyze", "synthesis", "recommendations"
2. ALWAYS include specific methodologies, tools, frameworks (e.g., "SWOT Analysis", "Porter's Five Forces", "SQL queries", "Tableau dashboards")
3. EVERY task must include a specific action verb + methodology + business outcome
4. EVERY deliverable must be a concrete, named artifact (e.g., "Customer Churn Prediction Model", "5-Year Financial Forecast Spreadsheet")
5. Extract REAL skills from the tasks (e.g., if task mentions "SQL", skill = "SQL Database Querying")

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

  const prompt = `Design a ${weeks}-week business consulting project for ${level} students partnering with this company.

⚠️ CRITICAL INSTRUCTION: You MUST create SPECIFIC, DETAILED, HIGH-VALUE content. Generic business terms will be REJECTED.

COMPANY PROFILE:
Name: ${company.name}
Sector: ${company.sector}
Size: ${company.size}
Website: ${company.website || 'Not available'}
Description: ${company.description}
${intelligenceSection}

STRATEGIC BUSINESS NEEDS (PRIORITIZE THE MOST SPECIFIC ONE):
${company.needs.map((need, i) => `${i + 1}. ${need}`).join('\n')}

COURSE LEARNING OUTCOMES (MUST ALIGN):
${outcomes.map((o, i) => `LO${i + 1}: ${o}`).join('\n')}

COURSE DELIVERABLES REQUIREMENTS:
${artifacts.map(a => `- ${a}`).join('\n')}

PROJECT CONSTRAINTS:
- Duration: ${weeks} weeks (${weeks * hrsPerWeek} total hours)
- Effort: ${hrsPerWeek} hours/week per student
- Academic Level: ${level}
- Team-based consulting engagement

🎯 MANDATORY DESIGN REQUIREMENTS:
1. Select ONE specific, measurable business need from the company's needs list
2. Create 5-7 SPECIFIC tasks with named methodologies/frameworks (e.g., "Conduct SWOT Analysis", "Build KPI Dashboard using Tableau")
3. Define 4-6 concrete, named deliverables (e.g., "Market Entry Strategy Deck", "Customer Segmentation Model in Excel")
4. Extract 5-7 DOMAIN-SPECIFIC skills from your tasks (NOT generic skills like "communication" or "analysis")
5. Incorporate company's tech stack and hiring needs into project design

⛔ FORBIDDEN TERMS (will cause rejection):
- Generic verbs: "research", "analyze", "investigate", "explore", "examine"
- Generic nouns: "report", "presentation", "memo", "findings", "recommendations"  
- Vague phrases: "industry trends", "best practices", "strategic analysis", "market research"

✅ REQUIRED SPECIFICITY EXAMPLES:

BAD Task: "Conduct market research"
GOOD Task: "Survey 200+ target customers using Qualtrics to identify top 5 pain points in product onboarding experience"

BAD Task: "Analyze financial data"
GOOD Task: "Build 5-year DCF valuation model in Excel with sensitivity analysis on key revenue and margin assumptions"

BAD Deliverable: "Analysis report"
GOOD Deliverable: "Competitive Positioning Matrix comparing 8 competitors across 12 key features"

BAD Skill: "Research"
GOOD Skills: "Primary Customer Research", "Survey Design & Analysis", "Statistical Significance Testing"

Return ONLY valid JSON (no markdown code blocks):
{
  "title": "SPECIFIC project title using real business terms (e.g., 'Customer Churn Reduction Strategy for SaaS Platform', 'Digital Marketing Campaign for Healthcare Tech Startup'). NO generic terms like 'consulting' or 'analysis'",
  
  "description": "2-3 sentences describing the business problem, the solution approach, and measurable outcomes. Must be SPECIFIC to this company.",
  
  "tasks": [
    "Create exactly 7 tasks. EACH TASK MUST:
    ✅ Start with specific action verb (Develop, Build, Create, Design, Conduct, Map, Calculate, Implement)
    ✅ Include named methodology/framework (e.g., SWOT, Porter's Five Forces, BPMN, NPV, A/B Testing, SQL queries)
    ✅ Specify data sources or sample sizes (e.g., '200+ customers', 'last 2 years of transaction data', 'top 10 competitors')
    ✅ Name specific tools if technical (Tableau, Python, Excel, SQL, Google Analytics, Salesforce, etc.)
    ✅ Include quantifiable scope (e.g., '5 key metrics', '3 customer segments', '10-page report')
    
    MANDATORY PATTERN: [Action Verb] + [Named Framework/Method] + [Specific Scope/Data] + [Tool if applicable]
    
    Examples that WILL BE ACCEPTED:
    - 'Conduct Porter's Five Forces analysis of the telehealth industry using 2024 market data from IBISWorld'
    - 'Build predictive churn model in Python using 3 years of customer transaction and support ticket data'
    - 'Design A/B testing framework for homepage redesign with 5 variants targeting 1000+ weekly visitors'
    - 'Map current patient intake process using BPMN notation and identify 8+ bottleneck points'
    - 'Calculate Net Promoter Score (NPS) from 300+ customer survey responses using Qualtrics'
    - 'Develop 12-month social media content calendar for Instagram and LinkedIn with 4 posts per week'
    - 'Create financial ROI model in Excel with 5-year projections and sensitivity analysis on 3 key variables'
    
    Examples that WILL BE REJECTED:
    - 'Conduct market research' (no methodology, no scope)
    - 'Analyze customer data' (no framework, no specific data source)
    - 'Develop recommendations' (this is outcome, not a task)
    - 'Research industry trends' (too vague)"
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
    "List exactly 7 DOMAIN-SPECIFIC skills. EXTRACT FROM YOUR TASKS.
    
    MANDATORY RULES:
    ✅ If task mentions 'SWOT', include skill 'SWOT Analysis'
    ✅ If task mentions 'Excel', include skill 'Financial Modeling in Excel' or 'Spreadsheet Analysis'
    ✅ If task mentions 'Python', include 'Python Programming' or 'Data Analysis with Python'
    ✅ If task mentions 'SQL', include 'SQL Database Querying'
    ✅ If task mentions 'survey', include 'Survey Design & Analysis' or 'Primary Research'
    ✅ If working with healthcare, include 'Healthcare Industry Knowledge' or 'HIPAA Compliance'
    ✅ If working with finance, include 'Financial Statement Analysis' or 'Valuation Modeling'
    
    ⛔ NEVER INCLUDE: 'Communication', 'Leadership', 'Teamwork', 'Research', 'Analysis', 'Critical Thinking', 'Problem Solving', 'Presentation'
    
    Examples that WILL BE ACCEPTED:
    - 'Customer Journey Mapping'
    - 'Competitive Intelligence Analysis'
    - 'A/B Testing & Experimentation'
    - 'Tableau Data Visualization'
    - 'Healthcare Regulatory Compliance'
    - 'SEO & Digital Marketing'
    - 'Supply Chain Process Optimization'
    - 'Market Sizing & Forecasting'
    
    Examples that WILL BE REJECTED:
    - 'Communication' (generic)
    - 'Analysis' (vague)
    - 'Research' (not specific)"
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
  
  "company_description": "Write 50-75 words describing: (1) What this company does, (2) Their market position/size, (3) Why they make a good academic partner. Use real intelligence if available.",
  
  "website": "${company.website || `https://www.${company.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}.com`}",
  
  "equipment": "List SPECIFIC software/tools required (e.g., 'Excel, Tableau, Python 3.x, Qualtrics, Google Analytics') OR 'Standard university computer lab equipment' if no special requirements",
  
  "majors": ["List 2-4 student majors that would benefit most. Examples: 'Business Analytics', 'Marketing', 'Computer Science', 'Healthcare Management', 'Supply Chain Management', 'Finance', 'Data Science'"],
  
  "faculty_expertise": "Describe specific faculty expertise helpful for advising (e.g., 'Healthcare operations research and process improvement', 'Digital marketing and consumer behavior', 'Predictive analytics and machine learning')",
  
  "publication_opportunity": "Answer 'Yes' if project could generate publishable research insights, 'No' if purely applied consulting"
}`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
      temperature: 0.7,
    }),
  });

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

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No valid JSON in response');
  
  const proposal = JSON.parse(jsonMatch[0]);
  
  return {
    ...proposal,
    company_name: company.name,
    sector: company.sector,
  };
}
