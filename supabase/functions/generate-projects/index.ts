import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getPrimitivesFromOutcomes(outcomes: string[]): string[] {
  const text = outcomes.join(' ').toLowerCase();
  const primitives = new Set<string>();

  if (/scope|define|charter|workplan/.test(text)) {
    primitives.add("Scope workshop & charter");
  }
  if (/external|market|competitor|regulat|customer|discovery|survey|benchmark/.test(text)) {
    primitives.add("External/market analysis or discovery");
  }
  if (/internal|resource|capabil|process|workflow|bottleneck|data request/.test(text)) {
    primitives.add("Internal/resource/process assessment");
  }
  if (/synthes|insight|recommend|option|priorit/.test(text)) {
    primitives.add("Synthesis & recommendations");
  }
  if (/present|deck|pitch|communicat|exec/.test(text)) {
    primitives.add("Executive deck & presentation");
  }

  if (primitives.size === 0) {
    return [
      "Scope workshop & charter",
      "External/market analysis or discovery",
      "Synthesis & recommendations",
      "Executive deck & presentation"
    ];
  }

  return Array.from(primitives);
}

function getIndustries(userIndustries: string[], outcomes: string[]): string[] {
  if (userIndustries.length > 0) return userIndustries;
  
  const text = outcomes.join(' ').toLowerCase();
  const base = ["Technology", "Healthcare", "Finance", "Energy", "Manufacturing", "Public/Nonprofit"];
  
  if (/sustainab|environment/.test(text)) {
    base.unshift("Sustainability");
  }
  
  return base.slice(0, 5);
}

function composeTitle(industry: string, level: string): string {
  if (level === "MBA") {
    return `${industry}: Efficiency & Strategy Engagement`;
  }
  return `${industry}: Opportunity Discovery Sprint`;
}

function getDeliverables(artifacts: string[]): string[] {
  const arts = artifacts.map(a => a.toLowerCase());
  const outs: string[] = [];
  
  if (arts.some(a => a.includes("proposal"))) {
    outs.push("Scope & proposal");
  }
  outs.push("Analysis memo", "Recommendations report");
  
  if (arts.some(a => a.includes("slide") || a.includes("deck"))) {
    outs.push("Slide deck");
  }
  if (arts.some(a => a.includes("present"))) {
    outs.push("Final presentation");
  }
  
  return outs;
}

function getTier(primitives: string[]): string {
  const text = primitives.join(' ').toLowerCase();
  const advancedTriggers = ["process", "internal", "analytics", "model", "regulatory", "pricing"];
  return advancedTriggers.some(t => text.includes(t)) ? "Advanced" : "Intermediate";
}

function scoreLOCoverage(outcomes: string[], tasks: string[], deliverables: string[]): number {
  const dims = {
    external: ["external", "market", "competitor", "regulatory", "customer", "survey", "discovery", "benchmark"],
    internal: ["internal", "resource", "capability", "process", "workflow", "bottleneck", "data request"],
    synthesis: ["synthesize", "insight", "recommendation", "options", "prioritize", "recommend"],
    presentation: ["presentation", "deck", "pitch", "exec", "stakeholder"],
    scoping: ["scope", "workplan", "define", "charter"]
  };

  const outcomeText = outcomes.join(' ').toLowerCase();
  const projectText = [...tasks, ...deliverables].join(' ').toLowerCase();
  
  let score = 0;
  for (const keywords of Object.values(dims)) {
    const hitLO = keywords.some(kw => outcomeText.includes(kw));
    const hitPJ = keywords.some(kw => projectText.includes(kw));
    if (hitLO && hitPJ) score++;
  }
  
  return score / Object.keys(dims).length;
}

function estimateBudget(weeks: number, hrsPerWeek: number, teamSize: number, tier: string): number {
  const rate = tier === "Advanced" ? 20 : 15;
  const allowance = tier === "Advanced" ? 300 : 150;
  const hours = weeks * hrsPerWeek * teamSize;
  return Math.round((hours * rate + allowance) / 10) * 10;
}

function generateMilestones(weeks: number): any[] {
  return [
    { week: "1", task: "Scope workshop & charter" },
    { week: "2-3", task: "Data collection / discovery" },
    { week: "4", task: "Interim check-in" },
    { week: "6-7", task: "Analysis complete / draft findings" },
    { week: "9", task: "Draft deck & report" },
    { week: "11", task: "Stakeholder dry-run" },
    { week: weeks.toString(), task: "Final presentation & handoff" }
  ];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract the JWT token from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Verify the JWT and get the user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('Unauthorized');
    }

    // Create a service role client for database operations
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
    
    const primitives = getPrimitivesFromOutcomes(outcomes);
    const deliverables = getDeliverables(artifacts);
    const industryList = getIndustries(industries, outcomes);
    const companyList = companies.length > 0 ? companies : null;
    const pool = companyList || industryList;
    
    const projectsToCreate = [];
    
    for (let i = 0; i < numTeams; i++) {
      const tag = pool[i % pool.length];
      const company = companyList ? tag : null;
      const industry = company ? industryList[i % industryList.length] : tag;
      const tier = getTier(primitives);
      const teamSize = 4;
      
      const title = composeTitle(industry, course.level);
      const loScore = scoreLOCoverage(outcomes, primitives, deliverables);
      const feasScore = course.weeks >= 12 ? 0.8 : 0.6;
      const mbScore = 0.8;
      const finalScore = 0.5 * loScore + 0.3 * feasScore + 0.2 * mbScore;
      const budget = estimateBudget(course.weeks, course.hrs_per_week, teamSize, tier);
      
      projectsToCreate.push({
        course_id: course.id,
        title,
        company_name: company || "Prospect Partner (to be recruited)",
        sector: industry,
        duration_weeks: course.weeks,
        team_size: teamSize,
        tasks: primitives,
        deliverables,
        pricing_usd: budget,
        tier,
        lo_score: loScore,
        feasibility_score: feasScore,
        mutual_benefit_score: mbScore,
        final_score: finalScore
      });
    }

    // Insert projects
    const { data: projects, error: projectError } = await serviceRoleClient
      .from('projects')
      .insert(projectsToCreate)
      .select();

    if (projectError) throw projectError;

    // Create forms for each project
    const formsToCreate = projects!.map(p => ({
      project_id: p.id,
      form1: {
        title: p.title,
        industry: p.sector,
        description: "Drafted from syllabus learning outcomes",
        budget: p.pricing_usd
      },
      form2: {
        company: p.company_name,
        sector: p.sector,
        size: "TBD"
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
      milestones: generateMilestones(p.duration_weeks)
    }));

    const { error: formsError } = await serviceRoleClient
      .from('project_forms')
      .insert(formsToCreate);

    if (formsError) throw formsError;

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
