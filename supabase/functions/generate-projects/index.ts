import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  full_address?: string | null;
  linkedin_profile?: string | null;
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

// NEW: Query real companies from database instead of AI generation
async function getCompaniesFromDB(
  supabaseClient: any, 
  cityZip: string, 
  industries: string[], 
  count: number,
  outcomes: string[],
  level: string
): Promise<CompanyInfo[]> {
  console.log(`📊 Querying DB for ${count} companies in ${cityZip}...`);

  // Parse city_zip to extract zip code and city name
  const zipMatch = cityZip.match(/\b\d{5}\b/);
  const zipCode = zipMatch ? zipMatch[0] : null;
  let cityName = cityZip.split(',')[0].trim();
  
  console.log(`Parsed - City: ${cityName}, Zip: ${zipCode}`);

  // Build flexible query - prioritize companies with rich inferred_needs
  let query = supabaseClient
    .from('company_profiles')
    .select('*')
    .not('inferred_needs', 'is', null); // Only companies with analyzed needs
  
  // Search by city name
  if (cityName) {
    query = query.ilike('city', `%${cityName.split(',')[0].trim()}%`);
  } else if (zipCode) {
    query = query.eq('zip', zipCode);
  }

  query = query
    .order('last_enriched_at', { ascending: false })
    .limit(count * 3); // Get extra for intelligent filtering

  const { data, error } = await query;

  if (error) {
    console.error('❌ Error fetching companies from DB:', error.message);
    return [];
  }

  if (!data || data.length === 0) {
    console.log('⚠ No enriched companies found in DB for location:', cityZip);
    return [];
  }

  console.log(`✓ Found ${data.length} enriched companies in database for ${cityName}`);

  // CRITICAL: Intelligent pre-filtering before AI generation
  const filteredCompanies = await intelligentCompanyFilter(data, outcomes, level);
  
  console.log(`✓ Intelligent filter: ${filteredCompanies.length}/${data.length} companies relevant to course outcomes`);
  
  // Map database fields to expected CompanyInfo interface
  const mappedCompanies = filteredCompanies.slice(0, count).map(company => ({
    ...company,
    needs: company.inferred_needs || [], // Map inferred_needs to needs
    description: company.recent_news || company.description || 'No description available'
  }));
  
  return mappedCompanies;
}

// NEW: Intelligent company filtering based on course-company relevance
async function intelligentCompanyFilter(
  companies: any[],
  outcomes: string[],
  level: string
): Promise<any[]> {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_API_KEY) {
    console.warn('⚠ No Gemini API key, skipping intelligent filtering');
    // Filter out generic needs only
    const genericPatterns = ['general operations', 'sales growth', 'digital transformation'];
    return companies.filter(company => {
      const needs = company.inferred_needs || [];
      const hasGenericOnly = needs.length > 0 && needs.every((need: string) => 
        genericPatterns.some(pattern => need.toLowerCase().includes(pattern))
      );
      return !hasGenericOnly;
    });
  }

  // AI-powered relevance scoring with creative thinking
  const systemPrompt = `You are an experiential learning expert who finds creative connections between companies and academic disciplines. 
Think broadly - many industries use chemical engineering even if not obvious (manufacturing, healthcare, construction, retail supply chains, food service, etc.).
Return only valid JSON array.`;
  
  const prompt = `Evaluate which companies could provide valuable projects for this ${level} course.
Think creatively about interdisciplinary applications.

COURSE LEARNING OUTCOMES:
${outcomes.map((o, i) => `${i + 1}. ${o}`).join('\n')}

AVAILABLE COMPANIES:
${companies.map((c, i) => `
${i + 1}. ${c.name} (${c.sector})
   Description: ${c.description || 'N/A'}
   Business Needs: ${(c.inferred_needs || []).join('; ')}
`).join('\n')}

Rate each company's relevance (0-100) considering:
1. **Direct application**: Can students directly apply course concepts? (e.g., chemical processes, materials, optimization)
2. **Indirect value**: Could the company benefit from quantitative analysis, process improvement, or data-driven solutions?
3. **Learning opportunity**: Would students gain practical experience relevant to their field?

BE GENEROUS - if there's ANY plausible connection where students could apply engineering thinking to solve real problems, rate it 40+.
Only rate below 30 if there's truly NO connection to engineering/technical problem-solving.

Return ONLY this JSON array:
[
  {"index": 0, "relevance": 85, "reason": "How students can help"},
  {"index": 1, "relevance": 40, "reason": "Indirect but valuable connection"}
]`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 2048 }
      }),
    });

    if (!response.ok) throw new Error('AI filtering failed');

    const data = await response.json();
    const content = data.candidates[0].content.parts[0].text;
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No valid JSON in AI response');
    
    const ratings = JSON.parse(jsonMatch[0]);
    
    // Sort by relevance with more reasonable threshold
    const scored = companies
      .map((company, index) => {
        const rating = ratings.find((r: any) => r.index === index);
        return { ...company, relevance: rating?.relevance || 0, reason: rating?.reason || '' };
      })
      .filter(c => c.relevance >= 35) // Keep companies with plausible connections (35%+)
      .sort((a, b) => b.relevance - a.relevance);

    scored.forEach(c => {
      console.log(`  ✓ ${c.name}: ${c.relevance}% relevant - ${c.reason}`);
    });

    return scored;
  } catch (error) {
    console.error('⚠ AI filtering error:', error);
    // Fallback: filter generic needs only
    const genericPatterns = ['general operations', 'sales growth', 'digital transformation'];
    return companies.filter(company => {
      const needs = company.inferred_needs || [];
      const hasGenericOnly = needs.length > 0 && needs.every((need: string) => 
        genericPatterns.some(pattern => need.toLowerCase().includes(pattern))
      );
      return !hasGenericOnly;
    });
  }
}

// FALLBACK: AI company search (only used if DB is empty)
async function searchCompanies(cityZip: string, industries: string[], count: number): Promise<CompanyInfo[]> {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');

  const systemPrompt = 'You are a business research assistant. Return only valid JSON arrays, no markdown formatting.';
  const prompt = `Find ${count} real companies or organizations in the ${cityZip} area that work in these industries: ${industries.join(', ')}. 
  
For each company, provide:
- Company name
- Industry sector
- Size (Small/Medium/Large/Enterprise)
- 3-4 current business needs or challenges they likely face
- Brief description of what they do

Focus on companies that would be good partners for university student projects - local businesses, nonprofits, government agencies, or growing companies that could benefit from student consulting work.

Return ONLY valid JSON array format:
[
  {
    "name": "Company Name",
    "sector": "Industry",
    "size": "Medium",
    "needs": ["need1", "need2", "need3"],
    "description": "What they do"
  }
]`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `${systemPrompt}\n\n${prompt}`
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('AI search error:', response.status, error);
    
    if (response.status === 403) {
      throw new Error('Gemini API key is blocked. Please enable the Generative Language API in your Google Cloud Console: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com');
    }
    
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.candidates[0].content.parts[0].text;
  
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('No valid JSON in response');
  
  return JSON.parse(jsonMatch[0]);
}

// MODIFIED: Now optimized for real company data
async function generateProjectProposal(
  company: CompanyInfo,
  outcomes: string[],
  artifacts: string[],
  level: string,
  weeks: number,
  hrsPerWeek: number
): Promise<ProjectProposal> {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');

  const systemPrompt = 'You are an experiential learning designer specializing in creating authentic industry partnerships. Return only valid JSON, no markdown.';
  
  // CRITICAL: Verify we have intelligent company data
  const hasSpecificNeeds = company.needs && company.needs.length > 0 && 
    !company.needs.every((n: string) => ['general', 'sales', 'digital'].some(g => n.toLowerCase().includes(g)));
  
  if (!hasSpecificNeeds) {
    console.warn(`⚠ WARNING: ${company.name} has generic/missing needs. Project may lack specificity.`);
  }
  
  const prompt = `Design an experiential learning project for ${level} students working with ${company.name}.

🎯 CRITICAL CONTEXT - USE THIS REAL DATA:

Company Profile:
- Name: ${company.name}
- Sector: ${company.sector}
- Size: ${company.size}
- Description: ${company.description}
${company.website ? `- Website: ${company.website}` : ''}

REAL Business Challenges (from customer reviews & market analysis):
${company.needs.map((need, i) => `${i + 1}. ${need}`).join('\n')}

📚 Course Learning Outcomes (students MUST develop these):
${outcomes.map((o, i) => `LO${i + 1}. ${o}`).join('\n')}

⏱ Course Constraints:
- Duration: ${weeks} weeks
- Student time: ${hrsPerWeek} hours/week
- Required artifacts: ${artifacts.join(', ')}

🎯 YOUR MISSION:
Create a project where students solve ONE specific business challenge while authentically developing the learning outcomes. The project MUST:
1. Address a REAL need from the list above (pick the best fit for learning outcomes)
2. Have tasks that naturally develop the required learning outcomes
3. Create deliverables the company can actually use

REQUIREMENTS:
1. Professional language suitable for company review
2. NO placeholders like "TBD", "example", "AI-generated"
3. Plain text only (NO markdown: **, *, -)
4. Specific, measurable, actionable

Return ONLY valid JSON:
{
  "title": "Clear, professional project title (max 12 words)",
  "description": "Detailed 150-200 word project overview explaining: (1) company's business challenge, (2) what students will do, (3) expected impact. Must be professional enough to show the company partner. No placeholder text.",
  "tasks": [
    "5-8 atomic tasks. Each must:
    - Start with action verb (Conduct, Analyze, Develop, Research, Design, Create, Build, Test)
    - Be specific and measurable
    - Max 15 words per task
    - NO week numbers or timeline references
    - NO markdown formatting (no **, *, -)
    - Plain text only
    Examples:
    - 'Conduct stakeholder interviews with 5-10 product managers to identify pain points'
    - 'Analyze competitor pricing models and market positioning across three segments'
    - 'Develop three alternative solution prototypes with cost-benefit analysis'"
  ],
  "deliverables": [
    "4-7 concrete outputs. Each must:
    - Be a noun phrase (Report, Model, Dashboard, Presentation, Framework, Tool)
    - Include format type in title
    - Max 8 words per deliverable
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

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `${systemPrompt}\n\n${prompt}`
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
      }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('AI proposal error:', response.status, error);
    
    if (response.status === 403) {
      throw new Error('Gemini API key is blocked. Please enable the Generative Language API in your Google Cloud Console: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com');
    }
    
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.candidates[0].content.parts[0].text;
  
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No valid JSON in response');
  
  const proposal = JSON.parse(jsonMatch[0]);
  
  return {
    ...proposal,
    company_name: company.name,
    sector: company.sector,
  };
}

async function calculateLOAlignment(
  tasks: string[], 
  deliverables: string[], 
  outcomes: string[],
  loAlignment: string
): Promise<number> {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');

  const systemPrompt = 'You are a learning outcomes assessment expert. Return only valid JSON.';
  const prompt = `Analyze how well this project aligns with the course learning outcomes.

Course Learning Outcomes:
${outcomes.map((o, i) => `LO${i + 1}: ${o}`).join('\n')}

Project Tasks:
${tasks.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Project Deliverables:
${deliverables.map((d, i) => `${i + 1}. ${d}`).join('\n')}

AI Project Designer's Alignment Explanation:
${loAlignment}

For each learning outcome, determine if the project adequately addresses it through its tasks and deliverables.

Return ONLY a JSON object with:
{
  "coverage_percentage": <0-100 number>,
  "outcomes_covered": ["LO1", "LO3", ...],
  "gaps": ["Brief explanation of any gaps"]
}`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `${systemPrompt}\n\n${prompt}`
        }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1024,
      }
    }),
  });

  if (!response.ok) {
    console.error('AI scoring error:', response.status);
    return 0.7;
  }

  const data = await response.json();
  const content = data.candidates[0].content.parts[0].text;
  
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return 0.7;
    
    const result = JSON.parse(jsonMatch[0]);
    return result.coverage_percentage / 100;
  } catch {
    return 0.7;
  }
}

async function calculateScores(
  tasks: string[], 
  deliverables: string[], 
  outcomes: string[], 
  weeks: number,
  loAlignment: string
) {
  const lo_score = await calculateLOAlignment(tasks, deliverables, outcomes, loAlignment);
  const feasibility_score = weeks >= 12 ? 0.85 : 0.65;
  const mutual_benefit_score = 0.80;
  const final_score = 0.5 * lo_score + 0.3 * feasibility_score + 0.2 * mutual_benefit_score;
  
  return {
    lo_score: Math.round(lo_score * 100) / 100,
    feasibility_score: Math.round(feasibility_score * 100) / 100,
    mutual_benefit_score: Math.round(mutual_benefit_score * 100) / 100,
    final_score: Math.round(final_score * 100) / 100
  };
}

function estimateBudget(weeks: number, hrsPerWeek: number, teamSize: number, tier: string, companySize: string): number {
  const rate = tier === "Advanced" ? 20 : 15;
  const allowance = tier === "Advanced" ? 300 : 150;
  const hours = weeks * hrsPerWeek * teamSize;
  let budget = hours * rate + allowance;
  
  if (companySize === "Small" || companySize === "Nonprofit") {
    budget *= 0.85;
  } else if (companySize === "Enterprise") {
    budget *= 1.10;
  }
  
  return Math.round(budget / 10) * 10;
}

async function generateLOAlignmentDetail(
  tasks: string[],
  deliverables: string[],
  outcomes: string[],
  proposal_lo_summary: string
): Promise<any> {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');

  const systemPrompt = 'You are a learning outcomes assessment expert. Return only valid JSON with proper syntax.';
  const prompt = `Analyze how project activities align with course learning outcomes.

LEARNING OUTCOMES:
${outcomes.map((o, i) => `${i}: ${o}`).join('\n')}

PROJECT TASKS (total: ${tasks.length}):
${tasks.map((t, i) => `${i}: ${t}`).join('\n')}

PROJECT DELIVERABLES (total: ${deliverables.length}):
${deliverables.map((d, i) => `${i}: ${d}`).join('\n')}

SUMMARY: ${proposal_lo_summary}

Create a detailed mapping. CRITICAL: Use ONLY numeric indices (0, 1, 2, etc.) for aligned_tasks and aligned_deliverables arrays.

Return ONLY valid JSON (no markdown, no explanation):
{
  "outcome_mappings": [
    {
      "outcome_id": "LO1",
      "outcome_text": "text of learning outcome",
      "coverage_percentage": 85,
      "aligned_tasks": [0, 2],
      "aligned_deliverables": [0],
      "explanation": "2-3 sentence explanation"
    }
  ],
  "task_mappings": [
    {
      "task_index": 0,
      "task_text": "task text",
      "outcome_ids": ["LO1"]
    }
  ],
  "deliverable_mappings": [
    {
      "deliverable_index": 0,
      "deliverable_text": "deliverable text",
      "outcome_ids": ["LO1"]
    }
  ],
  "overall_coverage": {
    "LO1": 85
  },
  "gaps": ["weakly covered outcomes"]
}

IMPORTANT: 
- Use numeric indices ONLY (e.g., [0, 1, 2] not ["T1", "T2"])
- Task indices range from 0 to ${tasks.length - 1}
- Deliverable indices range from 0 to ${deliverables.length - 1}
- All strings must be properly quoted
- No trailing commas`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `${systemPrompt}\n\n${prompt}`
        }]
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json'
      }
    }),
  });

  if (!response.ok) {
    console.error('LO alignment generation failed:', response.status);
    return null;
  }

  const data = await response.json();
  
  try {
    const content = data.candidates[0].content.parts[0].text;
    
    // Log first 300 chars for debugging
    console.log('📄 Raw LO alignment response (first 300 chars):', content.substring(0, 300));
    
    // Try to extract JSON from markdown code blocks or plain text
    let jsonText = content;
    
    // Remove markdown code blocks if present
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1];
    }
    
    // Find JSON object
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('⚠ No JSON object found in response');
      return null;
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    console.log('✓ Successfully parsed LO alignment');
    return parsed;
    
  } catch (error) {
    console.error('❌ Failed to parse LO alignment JSON:', error);
    console.error('Response content:', data?.candidates?.[0]?.content?.parts?.[0]?.text?.substring(0, 500));
    return null;
  }
}

function cleanAndValidate(proposal: ProjectProposal): { cleaned: ProjectProposal; issues: string[] } {
  const issues: string[] = [];
  
  proposal.tasks = proposal.tasks.map((t: string) => 
    t.replace(/\*\*/g, '')
     .replace(/\*/g, '')
     .replace(/^- /, '')
     .replace(/^\d+\.\s*/, '')
     .trim()
  );
  
  proposal.deliverables = proposal.deliverables.map((d: string) =>
    d.replace(/\(Week \d+[-\d]*\)/gi, '')
     .replace(/Week \d+[-\d]*:/gi, '')
     .replace(/\*\*/g, '')
     .replace(/\*/g, '')
     .trim()
  );
  
  if (proposal.description.toLowerCase().includes('ai-generated') || 
      proposal.description.toLowerCase().includes('tbd') ||
      proposal.description.split(' ').length < 50) {
    issues.push('Description contains placeholder text or is too short');
  }
  
  const genericSkills = ['research', 'analysis', 'presentation', 'communication', 'teamwork', 'writing'];
  const hasOnlyGeneric = proposal.skills.every((s: string) => 
    genericSkills.some(g => s.toLowerCase().includes(g))
  );
  if (hasOnlyGeneric) {
    issues.push('Skills are too generic - need domain-specific skills');
  }
  
  if (!proposal.contact?.email?.includes('@')) {
    issues.push('Contact email invalid');
  }
  
  const longTasks = proposal.tasks.filter((t: string) => t.split(' ').length > 20);
  if (longTasks.length > 0) {
    issues.push(`${longTasks.length} tasks are too long`);
  }
  
  return { cleaned: proposal, issues };
}

function validateProjectData(proposal: ProjectProposal, company: CompanyInfo): string[] {
  const errors: string[] = [];
  
  if (!proposal.description || proposal.description.length < 100) {
    errors.push('Project description missing or too short');
  }
  if (!proposal.contact?.name || !proposal.contact?.email || !proposal.contact?.phone) {
    errors.push('Contact information incomplete');
  }
  if (!proposal.skills || proposal.skills.length < 3) {
    errors.push('Insufficient skills listed');
  }
  if (!proposal.majors || proposal.majors.length < 1) {
    errors.push('Preferred majors not specified');
  }
  
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (proposal.contact?.email && !emailRegex.test(proposal.contact.email)) {
    errors.push('Invalid email format');
  }
  
  if (!proposal.contact?.phone || proposal.contact.phone.length < 10) {
    errors.push('Phone number missing or too short');
  }
  
  if (proposal.description.toLowerCase().includes('placeholder') || 
      proposal.description.toLowerCase().includes('example') ||
      proposal.description.toLowerCase().includes('sample')) {
    errors.push('Description contains placeholder language');
  }
  
  if (proposal.tasks.length < 4) {
    errors.push('Too few tasks specified');
  }
  
  if (proposal.deliverables.length < 3) {
    errors.push('Too few deliverables specified');
  }
  
  return errors;
}

function generateMilestones(weeks: number, deliverables: string[]) {
  const milestones = [];
  const interval = Math.floor(weeks / deliverables.length);
  
  for (let i = 0; i < deliverables.length; i++) {
    milestones.push({
      week: (i + 1) * interval,
      deliverable: deliverables[i],
      description: `Complete and submit ${deliverables[i]}`
    });
  }
  
  return milestones;
}

function createForms(company: CompanyInfo, proposal: ProjectProposal, course: any) {
  const budget = estimateBudget(course.weeks, course.hrs_per_week, 3, proposal.tier, company.size);
  
  return {
    // FORM 1: Project Details
    form1: {
      title: proposal.title,
      industry: company.sector,
      description: proposal.description,
      budget: budget
    },
    
    // FORM 2: Company & Contact Info (ONLY REAL DATA, NO AI-GENERATED INFO)
    form2: {
      company: company.name,
      contact_name: company.contact_person || 'TBD',
      contact_email: company.contact_email || '',
      contact_title: '',
      contact_phone: company.contact_phone || '',
      website: company.website || '',
      description: proposal.company_description,
      size: company.size,
      sector: company.sector,
      preferred_communication: 'Email'
    },
    
    // FORM 3: Project Requirements
    form3: {
      skills: proposal.skills || [],
      team_size: 3,
      learning_objectives: proposal.lo_alignment,
      deliverables: proposal.deliverables || []
    },
    
    // FORM 4: Timeline & Schedule
    form4: {
      start: 'TBD',
      end: 'TBD',
      weeks: course.weeks
    },
    
    // FORM 5: Project Logistics
    form5: {
      type: 'Consulting',
      scope: 'Improvement',
      location: 'Hybrid',
      equipment: proposal.equipment || 'Standard university computer lab equipment',
      software: proposal.equipment || 'Standard software',
      ip: 'Shared',
      past_experience: 'None',
      follow_up: 'Potential internship opportunities'
    },
    
    // FORM 6: Academic Information
    form6: {
      category: 'Semester-long',
      year: course.level,
      hours_per_week: course.hrs_per_week,
      difficulty: proposal.tier,
      majors: proposal.majors || [],
      faculty_expertise: proposal.faculty_expertise || '',
      universities: 'UMKC, KU, Rockhurst',
      publication: proposal.publication_opportunity || 'No'
    }
  };
}

// Helper function for delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('Unauthorized');
    }

    const serviceRoleClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { courseId, industries, numTeams } = await req.json();

    const { data: course, error: courseError } = await supabaseClient
      .from('course_profiles')
      .select('*')
      .eq('id', courseId)
      .eq('owner_id', user.id)
      .single();

    if (courseError || !course) {
      console.error('Course fetch error:', courseError);
      throw new Error('Course not found');
    }

    const outcomes = course.outcomes as string[];
    const artifacts = course.artifacts as string[];
    const cityZip = course.city_zip;
    const level = course.level;
    
    console.log('Starting intelligent project generation...');
    console.log('Location:', cityZip);
    console.log('Industries:', industries);
    console.log('Teams requested:', numTeams);
    
    // MODIFIED: Try intelligent discovery first, then DB, then AI fallback
    let companiesFound: CompanyInfo[] = [];
    
    // Step 1: Try intelligent discovery using Google Search
    console.log('🔍 Step 1: Intelligent company discovery via Google Search...');
    try {
      const discoveryResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/discover-companies`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            courseId,
            location: cityZip,
            count: numTeams
          })
        }
      );

      if (discoveryResponse.ok) {
        const discoveryData = await discoveryResponse.json();
        if (discoveryData.success && discoveryData.companies.length > 0) {
          console.log(`✓ Discovered ${discoveryData.companies.length} companies via Google Search`);
          
          // Convert discoveries to CompanyInfo format with company_profile_id
          companiesFound = discoveryData.companies.map((d: any) => ({
            id: d.companyProfileId, // Link to company_profiles table
            name: d.name,
            sector: d.sector,
            size: d.estimatedSize,
            needs: d.currentChallenges || d.skillsNeeded || [],
            description: d.whyRelevant,
            website: d.website,
            address: d.address,
            phone: d.phone,
            contactPerson: d.contactPerson,
            contactEmail: d.contactEmail,
            linkedinProfile: d.linkedinProfile,
            // Store relevance data for linking
            _discoveryData: {
              relevanceScore: d.relevanceScore,
              skillsNeeded: d.skillsNeeded,
              whyRelevant: d.whyRelevant
            }
          }));
        }
      }
    } catch (error) {
      console.error('⚠ Discovery function failed:', error);
    }

    // Step 2: Fallback to DB if discovery didn't find enough
    if (companiesFound.length < numTeams) {
      console.log(`🗄️ Step 2: Querying enriched database (need ${numTeams - companiesFound.length} more)...`);
      const dbCompanies = await getCompaniesFromDB(
        supabaseClient,
        cityZip,
        industries.length > 0 ? industries : ["Technology", "Healthcare", "Finance", "Manufacturing"],
        numTeams - companiesFound.length,
        outcomes,
        level
      );
      companiesFound = [...companiesFound, ...dbCompanies];
    }

    // Step 3: Last resort - AI generation
    if (companiesFound.length === 0) {
      console.log('⚠️ Step 3: Using AI generation fallback (no real companies found)...');
      companiesFound = await searchCompanies(
        cityZip,
        industries.length > 0 ? industries : ["Technology", "Healthcare", "Finance", "Manufacturing"],
        numTeams
      );
    }

    console.log(`✅ Final company set: ${companiesFound.length} companies ready for project generation`);

    const projectIds: string[] = [];

    for (let i = 0; i < companiesFound.length; i++) {
      const company = companiesFound[i];
      console.log(`\n🔨 Generating project ${i + 1}/${companiesFound.length} for ${company.name}...`);
      
      // CHECKPOINT 1: Verify company has intelligent data
      const needsQuality = company.needs && company.needs.length > 0 ? 'specific' : 'generic/missing';
      console.log(`  Data Quality Check: ${needsQuality} needs (${company.needs?.length || 0} items)`);
      if (needsQuality === 'generic/missing') {
        console.warn(`  ⚠ WARNING: May produce low-quality project due to generic company data`);
      }
      
      let proposal: ProjectProposal | null = null;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (!proposal && attempts < maxAttempts) {
        attempts++;
        try {
          const rawProposal = await generateProjectProposal(
            company,
            outcomes,
            artifacts,
            course.level,
            course.weeks,
            course.hrs_per_week
          );
          
          const { cleaned, issues } = cleanAndValidate(rawProposal);
          
          if (issues.length > 0) {
            console.log('Quality issues detected:', issues);
            if (attempts < maxAttempts) {
              console.log('Retrying generation...');
              await delay(2000 * attempts); // 2s, 4s, 6s
              continue;
            }
          }
          
          const validationErrors = validateProjectData(cleaned, company);
          if (validationErrors.length > 0) {
            console.log('Validation errors:', validationErrors);
            if (attempts < maxAttempts) {
              console.log('Retrying generation...');
              await delay(2000 * attempts); // 2s, 4s, 6s
              continue;
            }
          }
          
          proposal = cleaned;
        } catch (error) {
          console.error(`Attempt ${attempts} failed:`, error);
          if (attempts < maxAttempts) {
            // Exponential backoff: 3s, 8s, 15s
            const backoffDelay = Math.min(3000 * Math.pow(2, attempts - 1), 15000);
            console.log(`Waiting ${backoffDelay}ms before retry...`);
            await delay(backoffDelay);
          } else {
            throw new Error(`Failed to generate proposal after ${maxAttempts} attempts`);
          }
        }
      }

      if (!proposal) {
        throw new Error('Failed to generate valid proposal');
      }

      // CHECKPOINT 2: Verify proposal quality
      console.log(`  ✓ Proposal generated: ${proposal.tasks.length} tasks, ${proposal.deliverables.length} deliverables`);
      console.log(`  Addressing company needs: ${proposal.company_needs?.join(', ') || 'Not specified'}`);

      const scores = await calculateScores(
        proposal.tasks,
        proposal.deliverables,
        outcomes,
        course.weeks,
        proposal.lo_alignment
      );

      console.log(`  Scores: LO=${(scores.lo_score * 100).toFixed(0)}%, Feasibility=${(scores.feasibility_score * 100).toFixed(0)}%, Benefit=${(scores.mutual_benefit_score * 100).toFixed(0)}%`);

      console.log('  Generating detailed LO alignment...');
      const loAlignmentDetail = await generateLOAlignmentDetail(
        proposal.tasks,
        proposal.deliverables,
        outcomes,
        proposal.lo_alignment
      );
      
      // CHECKPOINT 3: Verify alignment detail was generated
      if (loAlignmentDetail) {
        console.log(`  ✓ LO alignment mapped: ${loAlignmentDetail.outcome_mappings?.length || 0} outcomes covered`);
      } else {
        console.warn(`  ⚠ Failed to generate detailed LO alignment`);
      }

      const teamSize = 3;
      const budget = estimateBudget(
        course.weeks,
        course.hrs_per_week,
        teamSize,
        proposal.tier,
        company.size
      );

      const milestones = generateMilestones(course.weeks, proposal.deliverables);
      const forms = createForms(company, proposal, course);

      // MODIFIED: Insert project with company_profile_id if available
      const projectInsert: any = {
        course_id: courseId,
        title: proposal.title,
        company_name: company.name,
        sector: company.sector,
        duration_weeks: course.weeks,
        team_size: teamSize,
        tasks: proposal.tasks,
        deliverables: proposal.deliverables,
        pricing_usd: budget,
        lo_score: scores.lo_score,
        feasibility_score: scores.feasibility_score,
        mutual_benefit_score: scores.mutual_benefit_score,
        final_score: scores.final_score,
        tier: proposal.tier,
        needs_review: false,
      };

      // Link to company profile if ID exists
      if (company.id) {
        projectInsert.company_profile_id = company.id;
      }

      const { data: projectData, error: projectError } = await supabaseClient
        .from('projects')
        .insert(projectInsert)
        .select('id')
        .single();

      if (projectError) {
        console.error('Project insert error:', projectError);
        throw new Error('Failed to insert project');
      }

      const { error: formsError } = await serviceRoleClient
        .from('project_forms')
        .insert({
          project_id: projectData.id,
          ...forms,
          milestones: milestones,
        });

      if (formsError) {
        console.error('Forms insert error:', formsError);
        throw new Error('Failed to insert project forms');
      }

      // Insert project metadata for algorithm transparency
      const metadataInsert: any = {
        project_id: projectData.id,
        algorithm_version: 'v2.0-intelligent',
        companies_considered: [{
          name: company.name,
          sector: company.sector,
          size: company.size,
          data_quality: company.needs?.length > 0 ? 'enriched' : 'basic',
          needs_addressed: company.needs || [],
          reason: 'Selected based on enriched company data with AI-analyzed business needs'
        }],
        selection_criteria: {
          industries,
          location: cityZip,
          num_teams: numTeams,
          data_requirements: 'Companies with AI-analyzed needs from reviews'
        },
        scoring_rationale: {
          lo_score: { 
            value: scores.lo_score, 
            method: 'AI analysis mapping specific company needs to learning outcomes through tasks/deliverables',
            coverage: loAlignmentDetail?.outcome_mappings?.length || 0
          },
          feasibility_score: { 
            value: scores.feasibility_score, 
            method: 'Duration and complexity assessment based on company size and project scope' 
          },
          mutual_benefit_score: { 
            value: scores.mutual_benefit_score, 
            method: 'Alignment between company needs and project deliverables',
            needs_addressed: proposal.company_needs || []
          }
        },
        ai_model_version: 'gemini-2.0-flash-exp'
      };

      // Add LO alignment details if available
      if (loAlignmentDetail) {
        metadataInsert.lo_alignment_detail = loAlignmentDetail;
        metadataInsert.lo_mapping_tasks = loAlignmentDetail.task_mappings;
        metadataInsert.lo_mapping_deliverables = loAlignmentDetail.deliverable_mappings;
      }

      const { error: metadataError } = await serviceRoleClient
        .from('project_metadata')
        .insert(metadataInsert);
        
      if (metadataError) {
        console.error('Metadata insert error:', metadataError);
      }

      projectIds.push(projectData.id);
      console.log(`✓ Project ${i + 1} created successfully`);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        projectIds,
        message: `Successfully generated ${projectIds.length} projects`,
        using_real_data: companiesFound.some(c => c.id !== undefined)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Generation error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
