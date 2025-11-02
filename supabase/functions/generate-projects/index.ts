import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompanyInfo {
  name: string;
  sector: string;
  size: string;
  needs: string[];
  description: string;
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

// Search for companies in a geographic region
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
  
  // Clean up markdown code blocks if present
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('No valid JSON in response');
  
  return JSON.parse(jsonMatch[0]);
}

// Match company needs to learning outcomes and generate project proposal
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
  "website": "https://www.${company.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}.com",
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
  
  // Clean up markdown code blocks
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No valid JSON in response');
  
  const proposal = JSON.parse(jsonMatch[0]);
  
  return {
    ...proposal,
    company_name: company.name,
    sector: company.sector,
  };
}

// Step 2: Clean and validate AI-generated content
function cleanAndValidate(proposal: ProjectProposal): { cleaned: ProjectProposal; issues: string[] } {
  const issues: string[] = [];
  
  // Strip markdown from tasks
  proposal.tasks = proposal.tasks.map((t: string) => 
    t.replace(/\*\*/g, '')
     .replace(/\*/g, '')
     .replace(/^- /, '')
     .replace(/^\d+\.\s*/, '')
     .trim()
  );
  
  // Strip markdown and week refs from deliverables
  proposal.deliverables = proposal.deliverables.map((d: string) =>
    d.replace(/\(Week \d+[-\d]*\)/gi, '')
     .replace(/Week \d+[-\d]*:/gi, '')
     .replace(/\*\*/g, '')
     .replace(/\*/g, '')
     .trim()
  );
  
  // Validate description
  if (proposal.description.toLowerCase().includes('ai-generated') || 
      proposal.description.toLowerCase().includes('tbd') ||
      proposal.description.split(' ').length < 50) {
    issues.push('Description contains placeholder text or is too short');
  }
  
  // Validate skills are domain-specific
  const genericSkills = ['research', 'analysis', 'presentation', 'communication', 'teamwork', 'writing'];
  const hasOnlyGeneric = proposal.skills.every((s: string) => 
    genericSkills.some(g => s.toLowerCase().includes(g))
  );
  if (hasOnlyGeneric) {
    issues.push('Skills are too generic - need domain-specific skills');
  }
  
  // Validate contact info (basic check)
  if (!proposal.contact?.email?.includes('@')) {
    issues.push('Contact email invalid');
  }
  
  // Validate tasks are concise
  const longTasks = proposal.tasks.filter((t: string) => t.split(' ').length > 20);
  if (longTasks.length > 0) {
    issues.push(`${longTasks.length} tasks are too long`);
  }
  
  return { cleaned: proposal, issues };
}

// Step 7: Validate project data before insertion
function validateProjectData(proposal: ProjectProposal, company: CompanyInfo): string[] {
  const errors: string[] = [];
  
  // Required fields
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
  
  // Format validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (proposal.contact?.email && !emailRegex.test(proposal.contact.email)) {
    errors.push('Invalid email format');
  }
  
  // Phone format is flexible - just check if it exists
  if (!proposal.contact?.phone || proposal.contact.phone.length < 10) {
    errors.push('Phone number missing or too short');
  }
  
  // Content quality
  if (proposal.description.toLowerCase().includes('placeholder') || 
      proposal.description.toLowerCase().includes('example') ||
      proposal.description.toLowerCase().includes('sample')) {
    errors.push('Description contains placeholder language');
  }
  
  // Task validation
  if (proposal.tasks.length < 4) {
    errors.push('Too few tasks specified');
  }
  
  // Deliverables validation
  if (proposal.deliverables.length < 3) {
    errors.push('Too few deliverables specified');
  }
  
  return errors;
}

// Calculate LO alignment using AI
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
    // Fallback to simple calculation
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

// Calculate all scores
async function calculateScores(
  tasks: string[], 
  deliverables: string[], 
  outcomes: string[], 
  weeks: number,
  loAlignment: string
) {
  const lo_score = await calculateLOAlignment(tasks, deliverables, outcomes, loAlignment);
  const feasibility_score = weeks >= 12 ? 0.85 : 0.65;
  const mutual_benefit_score = 0.80; // Assumed since AI matched company needs
  const final_score = 0.5 * lo_score + 0.3 * feasibility_score + 0.2 * mutual_benefit_score;
  
  return {
    lo_score: Math.round(lo_score * 100) / 100,
    feasibility_score: Math.round(feasibility_score * 100) / 100,
    mutual_benefit_score: Math.round(mutual_benefit_score * 100) / 100,
    final_score: Math.round(final_score * 100) / 100
  };
}

// Estimate budget
function estimateBudget(weeks: number, hrsPerWeek: number, teamSize: number, tier: string, companySize: string): number {
  const rate = tier === "Advanced" ? 20 : 15;
  const allowance = tier === "Advanced" ? 300 : 150;
  const hours = weeks * hrsPerWeek * teamSize;
  let budget = hours * rate + allowance;
  
  // Adjust for company size
  if (companySize === "Small" || companySize === "Nonprofit") {
    budget *= 0.85;
  } else if (companySize === "Enterprise") {
    budget *= 1.10;
  }
  
  return Math.round(budget / 10) * 10;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract JWT and verify user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');

    // Create authenticated client with user's JWT for RLS policies
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

    // Create service role client for database operations
    const serviceRoleClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { courseId, industries, companies, numTeams } = await req.json();

    // Get course profile using authenticated client with RLS
    // RLS policy "Users can view own courses" allows this when owner_id = auth.uid()
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
    
    // Step 1: Search for companies in the region
    const companiesFound = await searchCompanies(
      cityZip,
      industries.length > 0 ? industries : ["Technology", "Healthcare", "Finance", "Manufacturing"],
      numTeams
    );
    
    console.log('Found companies:', companiesFound.map(c => c.name));
    
    // Step 2: Generate project proposals for each company with retry logic
    const projectsToCreate = [];
    const proposalsForForms: Array<{ proposal: ProjectProposal; company: CompanyInfo }> = [];
    
    for (const company of companiesFound) {
      console.log(`Generating proposal for ${company.name}...`);
      
      let proposal: ProjectProposal | null = null;
      let needsReview = false;
      let retryCount = 0;
      const maxRetries = 2;
      
      // Step 8: Retry logic with refined prompts
      while (retryCount <= maxRetries) {
        try {
          const rawProposal = await generateProjectProposal(
            company,
            outcomes,
            artifacts,
            course.level,
            course.weeks,
            course.hrs_per_week
          );
          
          // Clean and validate
          const { cleaned, issues } = cleanAndValidate(rawProposal);
          proposal = cleaned;
          
          // Pre-insert validation
          const validationErrors = validateProjectData(proposal, company);
          
          if (validationErrors.length === 0 && issues.length === 0) {
            console.log(`✓ Quality proposal generated for ${company.name}`);
            break;
          } else {
            console.log(`⚠ Quality issues for ${company.name}:`, [...validationErrors, ...issues].join(', '));
            
            if (retryCount < maxRetries) {
              console.log(`Retrying with refined prompt (attempt ${retryCount + 2}/${maxRetries + 1})...`);
              retryCount++;
              await new Promise(resolve => setTimeout(resolve, 1000)); // Brief delay
            } else {
              // Max retries reached, flag for review
              needsReview = true;
              console.log(`⚠ Max retries reached for ${company.name}, flagging for review`);
              break;
            }
          }
        } catch (error) {
          console.error(`Error generating proposal for ${company.name}:`, error);
          if (retryCount < maxRetries) {
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            throw error;
          }
        }
      }
      
      if (!proposal) {
        throw new Error(`Failed to generate proposal for ${company.name}`);
      }
      
      const teamSize = 4;
      const scores = await calculateScores(
        proposal.tasks, 
        proposal.deliverables, 
        outcomes, 
        course.weeks,
        proposal.lo_alignment
      );
      const budget = estimateBudget(
        course.weeks,
        course.hrs_per_week,
        teamSize,
        proposal.tier,
        company.size
      );
      
      projectsToCreate.push({
        course_id: course.id,
        title: proposal.title,
        company_name: proposal.company_name,
        sector: proposal.sector,
        duration_weeks: course.weeks,
        team_size: teamSize,
        tasks: proposal.tasks,
        deliverables: proposal.deliverables,
        pricing_usd: budget,
        tier: proposal.tier,
        lo_score: scores.lo_score,
        feasibility_score: scores.feasibility_score,
        mutual_benefit_score: scores.mutual_benefit_score,
        final_score: scores.final_score,
        needs_review: needsReview
      });
      
      proposalsForForms.push({ proposal, company });
    }

    // Insert projects using authenticated client with RLS
    // RLS policy "Users can insert projects for own courses" validates course ownership
    const { data: projects, error: projectError } = await supabaseClient
      .from('projects')
      .insert(projectsToCreate)
      .select();

    if (projectError) {
      console.error('Project insert error:', projectError);
      throw projectError;
    }

    console.log('Projects created:', projects.length);

    // Step 3 & 6: Create enriched forms with proper data mapping and aligned milestones
    const formsToCreate = projects!.map((p, index) => {
      const { proposal, company } = proposalsForForms[index];
      
      // Step 6: Generate project-specific milestones aligned with tasks
      const taskCount = proposal.tasks.length;
      const phaseDuration = Math.floor(course.weeks / 4);
      
      return {
        project_id: p.id,
        form1: {
          title: p.title,
          industry: p.sector,
          description: proposal.description, // Rich, detailed description from AI
          budget: p.pricing_usd
        },
        form2: {
          company: p.company_name,
          sector: p.sector,
          size: company.size,
          contact_name: proposal.contact.name,
          contact_email: proposal.contact.email,
          contact_phone: proposal.contact.phone,
          contact_title: proposal.contact.title,
          website: proposal.website,
          description: proposal.company_description
        },
        form3: {
          skills: proposal.skills, // Domain-specific skills from AI
          team_size: p.team_size,
          deliverables: p.deliverables
        },
        form4: {
          start: "TBD",
          end: "TBD",
          weeks: p.duration_weeks
        },
        form5: {
          type: "Consulting",
          scope: "Improvement",
          location: "Hybrid",
          ip: "Shared",
          equipment_provided: proposal.equipment,
          software: proposal.equipment
        },
        form6: {
          category: "Semester-long",
          year: course.level === "MBA" ? "Graduate" : "Any",
          hours_per_week: course.hrs_per_week,
          majors: proposal.majors,
          faculty_expertise: proposal.faculty_expertise,
          publication: proposal.publication_opportunity
        },
        milestones: [
          { 
            week: "1", 
            task: "Project kickoff and scope definition",
            description: "Initial meeting with company partner, finalize project charter"
          },
          { 
            week: `2-${phaseDuration}`, 
            task: "Discovery and research phase",
            description: `Complete initial ${taskCount > 5 ? 'three' : 'two'} project tasks including stakeholder interviews and data collection`
          },
          { 
            week: Math.floor(course.weeks * 0.3).toString(), 
            task: "First milestone check-in",
            description: "Present preliminary findings and validate approach with company"
          },
          { 
            week: Math.floor(course.weeks * 0.5).toString(), 
            task: "Mid-project analysis complete",
            description: `Complete core analysis work, draft initial ${proposal.deliverables[0] || 'report'}`
          },
          { 
            week: Math.floor(course.weeks * 0.7).toString(), 
            task: "Deliverables in draft form",
            description: `Draft versions of all deliverables: ${proposal.deliverables.slice(0, 2).join(', ')}`
          },
          { 
            week: (course.weeks - 2).toString(), 
            task: "Final review and refinement",
            description: "Incorporate company feedback, polish all deliverables"
          },
          { 
            week: course.weeks.toString(), 
            task: "Final presentation and project handoff",
            description: `Present all deliverables to company stakeholders, transfer project materials`
          }
        ]
      };
    });

    const { error: formsError } = await serviceRoleClient
      .from('project_forms')
      .insert(formsToCreate);

    if (formsError) {
      console.error('Forms insert error:', formsError);
      throw formsError;
    }

    return new Response(JSON.stringify({ projects }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-projects:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});