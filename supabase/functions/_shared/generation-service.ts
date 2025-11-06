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

  const systemPrompt = 'You are an experiential learning designer specializing in creating authentic industry partnerships. Return only valid JSON, no markdown.';
  
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
    intelligenceSection = `\n\nREAL-TIME MARKET INTELLIGENCE:`;
    if (company.job_postings && company.job_postings.length > 0) {
      intelligenceSection += `\n- Active Hiring: ${company.job_postings.length} open positions`;
      const sampleJobs = company.job_postings.slice(0, 3).map((j: any) => j.title || j.name).filter(Boolean);
      if (sampleJobs.length > 0) {
        intelligenceSection += ` (e.g., ${sampleJobs.join(', ')})`;
      }
    }
    if (company.technologies_used && company.technologies_used.length > 0) {
      intelligenceSection += `\n- Technology Stack: ${company.technologies_used.slice(0, 5).join(', ')}`;
    }
    if (company.funding_stage) {
      intelligenceSection += `\n- Growth Stage: ${company.funding_stage}`;
    }
    if (company.buying_intent_signals && company.buying_intent_signals.length > 0) {
      intelligenceSection += `\n- Buying Signals: ${company.buying_intent_signals.length} detected (indicating readiness to invest)`;
    }
  }

  const prompt = `Design a ${weeks}-week experiential learning project for ${level} students partnering with this company.

COMPANY PROFILE:
Name: ${company.name}
Sector: ${company.sector}
Size: ${company.size}
Website: ${company.website || 'Not available'}
Description: ${company.description}
${intelligenceSection}

STRATEGIC BUSINESS NEEDS:
${company.needs.map((need, i) => `${i + 1}. ${need}`).join('\n')}

COURSE LEARNING OUTCOMES (students must demonstrate these):
${outcomes.map((o, i) => `LO${i + 1}: ${o}`).join('\n')}

COURSE DELIVERABLES/ARTIFACTS EXPECTED:
${artifacts.map(a => `- ${a}`).join('\n')}

PROJECT PARAMETERS:
- Duration: ${weeks} weeks
- Effort: ${hrsPerWeek} hours/week per student
- Academic Level: ${level}
- Team-based work

DESIGN REQUIREMENTS:
1. Pick ONE specific company need where students can create measurable business impact
2. Design 5-7 tasks that align with learning outcomes AND address the chosen business need
3. Define 4-6 professional deliverables that demonstrate learning AND provide value to the company
4. Be SPECIFIC - avoid generic tasks like 'conduct research' or 'analyze data'
5. Use the company's actual intelligence (hiring, tech stack, growth stage) to make the project authentic

QUALITY STANDARDS:
- Tasks must be concrete and actionable (BAD: "Research industry trends" GOOD: "Conduct competitive pricing analysis of top 5 competitors using public financial data")
- Deliverables must be professional outputs (BAD: "Report" GOOD: "ROI Calculator with 5-year financial projections")
- Tier should match complexity (Intermediate = standard analytics/consulting, Advanced = technical implementation or strategic transformation)

Return ONLY valid JSON (no markdown code blocks):
{
  "title": "Specific project title (no generic terms like 'consulting' or 'analysis')",
  "description": "2-3 sentence project description focusing on business impact and learning value",
  "tasks": [
    "7 specific numbered tasks that build toward deliverables. Each task should:
    - Start with action verb (Develop, Create, Analyze, Design, Implement, etc.)
    - Include specific methodology or approach
    - Reference real data sources or tools where applicable
    - Show how it addresses company need AND learning outcome
    - Be achievable within time constraints
    - NO generic phrases like 'conduct research', 'perform analysis'
    
    Examples of GOOD tasks:
    - 'Survey 100+ customers using Qualtrics to identify top 3 pain points in current service delivery'
    - 'Build predictive churn model using Python/scikit-learn on 2-year customer transaction data'
    - 'Map current supply chain process using BPMN notation and identify 5+ bottleneck points'
    
    Examples of BAD tasks:
    - 'Research the industry' (too generic)
    - 'Analyze customer data' (lacks specificity)
    - 'Present findings to stakeholders' (that's a deliverable, not a task)"
  ],
  "deliverables": [
    "6 professional business deliverables matching course artifacts.
    CRITICAL RULES:
    - NO week numbers or timeline references
    - Title case formatting
    - NO markdown formatting
    Examples:
    - 'Market Analysis Report'
    - 'Financial ROI Calculation Model'
    - 'Executive Strategy Presentation Deck'
    - 'Customer Journey Mapping Framework'"
  ],
  "skills": [
    "5-7 SPECIFIC skills required (mix technical + domain knowledge).
    Must be domain-specific, NOT generic. 
    BAD: 'research', 'analysis', 'presentation', 'communication'
    GOOD: 'Healthcare Regulatory Knowledge', 'Python Data Analysis', 'Stakeholder Interviewing', 'Financial Modeling', 'SQL Database Design', 'Supply Chain Optimization', 'User Experience Research'"
  ],
  "tier": "Intermediate or Advanced",
  "lo_alignment": "Brief explanation of how project tasks and deliverables align with specific learning outcomes",
  "company_needs": ["Which specific company needs this addresses"],
  "contact": {
    "name": "Realistic contact name (FirstName LastName - no titles in name)",
    "title": "Appropriate role for project sponsor (VP Innovation, Director of Operations, etc.)",
    "email": "firstname.lastname@${company.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}.com",
    "phone": "US phone format: (XXX) XXX-XXXX with realistic area code"
  },
  "company_description": "Professional 50-75 word description of what this company does, their market position, and why they are a good partner for student projects",
  "website": "${company.website || `https://www.${company.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}.com`}",
  "equipment": "List specific equipment/software/tools needed, or 'Standard university computer lab equipment' if none. Be specific if technical tools required (e.g., 'Python 3.x, Tableau, AWS account')",
  "majors": ["2-4 preferred student majors like 'Business Analytics', 'Computer Science', 'Healthcare Management', 'Industrial Engineering'"],
  "faculty_expertise": "Type of faculty expertise helpful for advising (e.g., 'Healthcare operations research', 'Machine learning applications', 'Financial risk management')",
  "publication_opportunity": "Yes or No - realistic assessment of whether this work could lead to academic publication"
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
