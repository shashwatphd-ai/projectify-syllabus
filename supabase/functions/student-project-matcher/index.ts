import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProjectRecommendation {
  project_id: string;
  title: string;
  company_name: string;
  company_logo_url: string | null;
  sector: string;
  description: string | null;
  match_score: number;
  matched_skills: string[];
  project_skills: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with user's token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Use anon key client to verify user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting project matching for student: ${user.id}`);

    // Use service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Get student's verified competencies
    const { data: competencies, error: compError } = await supabase
      .from('verified_competencies')
      .select('skill_name, employer_rating')
      .eq('student_id', user.id);

    if (compError) {
      console.error('Error fetching competencies:', compError);
      throw compError;
    }

    // Extract skill names (normalized to lowercase for matching)
    const studentSkills = new Set(
      (competencies || []).map(c => c.skill_name.toLowerCase().trim())
    );

    console.log(`Student has ${studentSkills.size} verified skills: ${[...studentSkills].join(', ')}`);

    // If student has no skills, return empty recommendations
    if (studentSkills.size === 0) {
      return new Response(
        JSON.stringify({ 
          recommendations: [],
          message: 'Complete projects to build your skill profile and get personalized recommendations'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Get available projects (curated_live status)
    const { data: projects, error: projError } = await supabase
      .from('projects')
      .select(`
        id,
        title,
        company_name,
        company_logo_url,
        sector,
        description,
        skills,
        majors,
        duration_weeks,
        team_size
      `)
      .eq('status', 'curated_live')
      .order('created_at', { ascending: false })
      .limit(50);

    if (projError) {
      console.error('Error fetching projects:', projError);
      throw projError;
    }

    console.log(`Found ${projects?.length || 0} available projects`);

    // Step 3: Get projects student has already applied to (exclude them)
    const { data: applications, error: appError } = await supabase
      .from('project_applications')
      .select('project_id')
      .eq('student_id', user.id);

    if (appError) {
      console.error('Error fetching applications:', appError);
      throw appError;
    }

    const appliedProjectIds = new Set((applications || []).map(a => a.project_id));

    // Step 4: Score each project based on skill overlap
    const recommendations: ProjectRecommendation[] = [];

    for (const project of projects || []) {
      // Skip projects student already applied to
      if (appliedProjectIds.has(project.id)) {
        continue;
      }

      // Extract project skills
      let projectSkills: string[] = [];
      
      if (Array.isArray(project.skills)) {
        projectSkills = project.skills.map((s: any) => {
          if (typeof s === 'string') return s.toLowerCase().trim();
          if (s?.name) return s.name.toLowerCase().trim();
          if (s?.skill) return s.skill.toLowerCase().trim();
          return '';
        }).filter(Boolean);
      }

      // Calculate skill overlap
      const matchedSkills = projectSkills.filter(skill => 
        studentSkills.has(skill) || 
        [...studentSkills].some(studentSkill => 
          skill.includes(studentSkill) || studentSkill.includes(skill)
        )
      );

      // Only include projects with at least one skill match
      if (matchedSkills.length > 0) {
        // Calculate match score (percentage of project skills matched)
        const matchScore = projectSkills.length > 0 
          ? Math.round((matchedSkills.length / projectSkills.length) * 100)
          : 0;

        recommendations.push({
          project_id: project.id,
          title: project.title,
          company_name: project.company_name,
          company_logo_url: project.company_logo_url,
          sector: project.sector,
          description: project.description,
          match_score: matchScore,
          matched_skills: matchedSkills,
          project_skills: projectSkills,
        });
      }
    }

    // Sort by match score (highest first)
    recommendations.sort((a, b) => b.match_score - a.match_score);

    // Return top 10 recommendations
    const topRecommendations = recommendations.slice(0, 10);

    console.log(`Generated ${topRecommendations.length} recommendations for student`);

    return new Response(
      JSON.stringify({ 
        recommendations: topRecommendations,
        total_available: recommendations.length,
        student_skills_count: studentSkills.size
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Project matching error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate recommendations' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
