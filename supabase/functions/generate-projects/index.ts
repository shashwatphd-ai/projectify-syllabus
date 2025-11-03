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
async function getCompaniesFromDB(supabaseClient: any, cityZip: string, industries: string[], count: number): Promise<CompanyInfo[]> {
  console.log(`Querying DB for ${count} companies in ${cityZip}...`);

  // Parse city_zip to extract zip code and city name
  // Examples: "66006", "Lawrence, KS 66006", "Kansas City, Missouri 64131"
  const zipMatch = cityZip.match(/\b\d{5}\b/);
  const zipCode = zipMatch ? zipMatch[0] : null;
  
  // Extract city name (everything before state abbreviation or last comma)
  let cityName = cityZip.split(',')[0].trim();
  
  console.log(`Parsed - City: ${cityName}, Zip: ${zipCode}`);

  // Build flexible query
  let query = supabaseClient.from('company_profiles').select('*');
  
  // Try to match by zip first, then city
  if (zipCode) {
    query = query.eq('zip', zipCode);
  } else if (cityName) {
    query = query.ilike('city', `%${cityName}%`);
  }

  if (industries && industries.length > 0) {
    query = query.in('sector', industries);
  }

  query = query.limit(count * 2); // Get more than needed for filtering

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching companies from DB:', error.message);
    return [];
  }

  if (!data || data.length === 0) {
    console.log('No companies found in DB, falling back to AI generation...');
    return [];
  }

  console.log(`Found ${data.length} companies in database`);

  // Map DB company profiles to CompanyInfo format and limit to requested count
  return data.slice(0, count).map((profile: any) => ({
    id: profile.id,
    name: profile.name,
    sector: profile.sector,
    size: profile.size,
    needs: profile.inferred_needs || [],
    description: profile.recent_news || `${profile.name} is a ${profile.size} ${profile.sector} company.`,
    website: profile.website,
    inferred_needs: profile.inferred_needs || []
  }));
}

// FALLBACK: AI company search (only used if DB is empty)
async function searchCompanies(cityZip: string, industries: string[], count: number): Promise<CompanyInfo[]> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

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

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are a business research assistant. Return only valid JSON arrays, no markdown formatting.' },
        { role: 'user', content: prompt }
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('AI search error:', response.status, error);
    throw new Error('Failed to search companies');
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
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
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

  const prompt = `Design an experiential learning project for ${level} students working with ${company.name}.

Company Context:
- Sector: ${company.sector}
- Description: ${company.description}
- Size: ${company.size}
- Current Needs: ${company.needs.join('; ')}
${company.website ? `- Website: ${company.website}` : ''}

Course Learning Outcomes:
${outcomes.map((o, i) => `${i + 1}. ${o}`).join('\n')}

Course Details:
- Duration: ${weeks} weeks
- Time commitment: ${hrsPerWeek} hours/week
- Required artifacts: ${artifacts.join(', ')}

REQUIREMENTS:
1. Create a professional, client-ready project proposal
2. Use industry-standard language (NO "AI-generated" or "TBD" placeholders)
3. All text must be plain text (NO markdown formatting like **, *, -)
4. Be specific and actionable

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

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are an experiential learning designer. Return only valid JSON, no markdown.' },
        { role: 'user', content: prompt }
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('AI proposal error:', response.status, error);
    throw new Error('Failed to generate proposal');
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
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
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

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

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are a learning outcomes assessment expert. Return only valid JSON.' },
        { role: 'user', content: prompt }
      ],
    }),
  });

  if (!response.ok) {
    console.error('AI scoring error:', response.status);
    return 0.7;
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
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
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

  const prompt = `You are analyzing how project activities align with course learning outcomes.

LEARNING OUTCOMES:
${outcomes.map((o, i) => `LO${i + 1}: ${o}`).join('\n')}

PROJECT TASKS:
${tasks.map((t, i) => `T${i + 1}: ${t}`).join('\n')}

PROJECT DELIVERABLES:
${deliverables.map((d, i) => `D${i + 1}: ${d}`).join('\n')}

SUMMARY ALIGNMENT: ${proposal_lo_summary}

Create a detailed mapping showing which tasks and deliverables address each learning outcome.

Return ONLY valid JSON in this exact structure:
{
  "outcome_mappings": [
    {
      "outcome_id": "LO1",
      "outcome_text": "Full text of learning outcome 1",
      "coverage_percentage": 85,
      "aligned_tasks": [0, 2, 3],
      "aligned_deliverables": [0, 1],
      "explanation": "Detailed 2-3 sentence explanation of how the tasks and deliverables develop this outcome"
    }
  ],
  "task_mappings": [
    {
      "task_index": 0,
      "task_text": "Full task text",
      "outcome_ids": ["LO1", "LO3"]
    }
  ],
  "deliverable_mappings": [
    {
      "deliverable_index": 0,
      "deliverable_text": "Full deliverable text",
      "outcome_ids": ["LO1", "LO2"]
    }
  ],
  "overall_coverage": {
    "LO1": 85,
    "LO2": 90,
    "LO3": 75
  },
  "gaps": [
    "Any learning outcomes that are weakly covered (<60%) and recommendations to strengthen"
  ]
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
        { role: 'system', content: 'You are a learning outcomes assessment expert. Return only valid JSON.' },
        { role: 'user', content: prompt }
      ],
    }),
  });

  if (!response.ok) {
    console.error('LO alignment generation failed:', response.status);
    return null;
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  
  if (!jsonMatch) return null;
  return JSON.parse(jsonMatch[0]);
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
    
    // FORM 2: Company & Contact Info
    form2: {
      company: company.name,
      contact_name: proposal.contact?.name || 'TBD',
      contact_email: proposal.contact?.email || '',
      contact_title: proposal.contact?.title || '',
      contact_phone: proposal.contact?.phone || '',
      website: proposal.website || company.website || '',
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
    
    console.log('Starting intelligent project generation...');
    console.log('Location:', cityZip);
    console.log('Industries:', industries);
    console.log('Teams requested:', numTeams);
    
    // MODIFIED: Try to get companies from DB first
    let companiesFound = await getCompaniesFromDB(
      supabaseClient,
      cityZip,
      industries.length > 0 ? industries : ["Technology", "Healthcare", "Finance", "Manufacturing"],
      numTeams
    );

    // Fallback to AI generation if DB is empty
    if (companiesFound.length === 0) {
      console.log('DB empty, using AI generation fallback...');
      companiesFound = await searchCompanies(
        cityZip,
        industries.length > 0 ? industries : ["Technology", "Healthcare", "Finance", "Manufacturing"],
        numTeams
      );
    } else {
      console.log(`Found ${companiesFound.length} real companies from database`);
    }

    const projectIds: string[] = [];

    for (let i = 0; i < companiesFound.length; i++) {
      const company = companiesFound[i];
      console.log(`\nGenerating project ${i + 1}/${companiesFound.length} for ${company.name}...`);
      
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

      const scores = await calculateScores(
        proposal.tasks,
        proposal.deliverables,
        outcomes,
        course.weeks,
        proposal.lo_alignment
      );

      console.log('Generating detailed LO alignment...');
      const loAlignmentDetail = await generateLOAlignmentDetail(
        proposal.tasks,
        proposal.deliverables,
        outcomes,
        proposal.lo_alignment
      );

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
      if (loAlignmentDetail) {
        const { error: metadataError } = await serviceRoleClient
          .from('project_metadata')
          .insert({
            project_id: projectData.id,
            algorithm_version: 'v1.0',
            companies_considered: [{
              name: company.name,
              sector: company.sector,
              reason: 'Selected based on industry match and location'
            }],
            selection_criteria: {
              industries,
              location: cityZip,
              num_teams: numTeams
            },
            lo_alignment_detail: loAlignmentDetail,
            lo_mapping_tasks: loAlignmentDetail.task_mappings,
            lo_mapping_deliverables: loAlignmentDetail.deliverable_mappings,
            scoring_rationale: {
              lo_score: { value: scores.lo_score, method: 'AI analysis with task/deliverable mapping' },
              feasibility_score: { value: scores.feasibility_score, method: 'Duration and complexity assessment' },
              mutual_benefit_score: { value: scores.mutual_benefit_score, method: 'Company needs alignment' }
            },
            ai_model_version: 'google/gemini-2.5-flash'
          });
          
        if (metadataError) {
          console.error('Metadata insert error:', metadataError);
        }
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
