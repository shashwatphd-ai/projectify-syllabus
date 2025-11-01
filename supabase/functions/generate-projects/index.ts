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

Create a project that:
1. Addresses real company needs
2. Aligns with learning outcomes
3. Is feasible within the timeframe
4. Benefits both students and company

Return ONLY valid JSON:
{
  "title": "Project title",
  "tasks": ["task1", "task2", "task3", "task4"],
  "deliverables": ["deliverable1", "deliverable2", "deliverable3"],
  "tier": "Intermediate or Advanced",
  "lo_alignment": "Brief explanation of how project aligns with learning outcomes",
  "company_needs": ["Which company needs this addresses"]
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

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
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

    // Get course profile
    const { data: course, error: courseError } = await serviceRoleClient
      .from('course_profiles')
      .select('*')
      .eq('id', courseId)
      .eq('owner_id', user.id)
      .single();

    if (courseError || !course) {
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
    
    // Step 2: Generate project proposals for each company
    const projectsToCreate = [];
    
    for (const company of companiesFound) {
      console.log(`Generating proposal for ${company.name}...`);
      
      const proposal = await generateProjectProposal(
        company,
        outcomes,
        artifacts,
        course.level,
        course.weeks,
        course.hrs_per_week
      );
      
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
        final_score: scores.final_score
      });
    }

    // Insert projects
    const { data: projects, error: projectError } = await serviceRoleClient
      .from('projects')
      .insert(projectsToCreate)
      .select();

    if (projectError) {
      console.error('Project insert error:', projectError);
      throw projectError;
    }

    console.log('Projects created:', projects.length);

    // Create forms for each project
    const formsToCreate = projects!.map(p => ({
      project_id: p.id,
      form1: {
        title: p.title,
        industry: p.sector,
        description: "AI-generated project matching company needs to learning outcomes",
        budget: p.pricing_usd
      },
      form2: {
        company: p.company_name,
        sector: p.sector,
        size: companiesFound.find(c => c.name === p.company_name)?.size || "Unknown"
      },
      form3: {
        skills: ["research", "analysis", "presentation"],
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
        ip: "Shared"
      },
      form6: {
        category: "Semester-long",
        year: course.level === "MBA" ? "Graduate" : "Any",
        hours_per_week: course.hrs_per_week
      },
      milestones: [
        { week: "1", task: "Scope workshop & charter" },
        { week: "2-3", task: "Data collection / discovery" },
        { week: "4", task: "Interim check-in" },
        { week: Math.floor(course.weeks * 0.5), task: "Analysis complete / draft findings" },
        { week: Math.floor(course.weeks * 0.75), task: "Draft deck & report" },
        { week: course.weeks - 1, task: "Stakeholder dry-run" },
        { week: course.weeks, task: "Final presentation & handoff" }
      ]
    }));

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