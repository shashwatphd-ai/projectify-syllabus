import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import { verifyAuth, unauthorizedResponse } from "../_shared/auth-middleware.ts";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Skill Gap Analyzer Edge Function
 * 
 * Compares syllabus skills against company job postings to identify:
 * - Skills already covered by the course
 * - Skills the student will gain from the project
 * - Gaps that require additional learning
 * 
 * Uses data from:
 * - course_profiles.outcomes (learning outcomes)
 * - projects.skills (project requirements)
 * - company_profiles.job_postings (real job requirements)
 * - company_profiles.matching_skills (from signal scoring)
 */

interface SkillAnalysis {
  skill: string;
  source: 'course' | 'project' | 'job_posting';
  coverage: 'covered' | 'will_learn' | 'gap';
  importance: 'critical' | 'important' | 'nice_to_have';
  jobMentions: number;
}

interface SkillGapResult {
  overallCoverage: number;
  skillsAlreadyHave: SkillAnalysis[];
  skillsWillLearn: SkillAnalysis[];
  skillGaps: SkillAnalysis[];
  topJobRequirements: string[];
  learningOpportunities: string[];
  careerReadiness: string;
  confidence: number;
  analyzedAt: string;
}

// Common skill aliases for matching
const SKILL_ALIASES: Record<string, string[]> = {
  'python': ['python', 'python3', 'py'],
  'javascript': ['javascript', 'js', 'ecmascript'],
  'typescript': ['typescript', 'ts'],
  'react': ['react', 'reactjs', 'react.js'],
  'data analysis': ['data analysis', 'data analytics', 'analytics'],
  'machine learning': ['machine learning', 'ml', 'deep learning', 'ai'],
  'sql': ['sql', 'mysql', 'postgresql', 'database'],
  'excel': ['excel', 'spreadsheet', 'microsoft excel'],
  'communication': ['communication', 'written communication', 'verbal communication'],
  'project management': ['project management', 'pm', 'agile', 'scrum'],
};

function normalizeSkill(skill: string): string {
  const lower = skill.toLowerCase().trim();
  
  // Check aliases
  for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    if (aliases.some(alias => lower.includes(alias) || alias.includes(lower))) {
      return canonical;
    }
  }
  
  return lower;
}

function extractSkillsFromText(text: string): string[] {
  if (!text) return [];
  
  const skills: string[] = [];
  const lowerText = text.toLowerCase();
  
  // Check for known skills
  for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    if (aliases.some(alias => lowerText.includes(alias))) {
      skills.push(canonical);
    }
  }
  
  return [...new Set(skills)];
}

function calculateImportance(jobMentions: number, totalJobs: number): 'critical' | 'important' | 'nice_to_have' {
  if (totalJobs === 0) return 'nice_to_have';
  const ratio = jobMentions / totalJobs;
  if (ratio >= 0.5) return 'critical';
  if (ratio >= 0.2) return 'important';
  return 'nice_to_have';
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication using shared middleware
    const authResult = await verifyAuth(req);
    if (!authResult.authenticated) {
      console.warn(`[skill-gap-analyzer] Unauthorized request: ${authResult.error}`);
      return unauthorizedResponse(corsHeaders, authResult.error || 'Unauthorized', req);
    }
    
    console.log(`[skill-gap-analyzer] Authenticated user: ${authResult.userId}`);

    // Safe JSON parsing
    let body: { projectId?: string };
    try {
      body = await req.json();
    } catch (parseError) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { projectId } = body;
    
    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'projectId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`\n🎯 [Skill Gap Analyzer] Starting for project: ${projectId}`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Fetch project with related data
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        *,
        company_profiles!projects_company_profile_id_fkey (
          job_postings,
          matching_skills,
          technologies_used,
          skill_match_score
        ),
        course_profiles!projects_course_id_fkey (
          outcomes,
          artifacts,
          title
        )
      `)
      .eq('id', projectId)
      .maybeSingle();
    
    if (projectError || !project) {
      console.error('Project fetch error:', projectError);
      return new Response(
        JSON.stringify({ error: 'Project not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`   📊 Project: ${project.title}`);
    console.log(`   🏢 Company: ${project.company_name}`);
    
    // Extract course skills from learning outcomes
    const courseOutcomes = project.course_profiles?.outcomes || [];
    const courseSkills = new Set<string>();
    
    for (const outcome of courseOutcomes) {
      const text = typeof outcome === 'string' ? outcome : outcome?.description || outcome?.outcome || '';
      extractSkillsFromText(text).forEach(s => courseSkills.add(s));
    }
    console.log(`   📚 Course skills: ${courseSkills.size}`);
    
    // Extract project skills
    const projectSkillsRaw = project.skills || [];
    const projectSkills = new Set<string>();
    
    for (const skill of projectSkillsRaw) {
      const skillName = typeof skill === 'string' ? skill : skill?.name || skill?.skill || '';
      if (skillName) {
        projectSkills.add(normalizeSkill(skillName));
      }
    }
    console.log(`   🎯 Project skills: ${projectSkills.size}`);
    
    // Extract job posting skills from company
    const companyProfile = project.company_profiles;
    const jobPostings = companyProfile?.job_postings || [];
    const jobSkillCounts = new Map<string, number>();
    
    for (const job of jobPostings) {
      const description = job?.description || job?.title || '';
      const skills = extractSkillsFromText(description);
      skills.forEach(s => {
        jobSkillCounts.set(s, (jobSkillCounts.get(s) || 0) + 1);
      });
    }
    
    // Also include matching_skills from signal scoring
    const matchingSkills = companyProfile?.matching_skills || [];
    for (const skill of matchingSkills) {
      const skillName = typeof skill === 'string' ? skill : skill?.name || '';
      if (skillName) {
        const normalized = normalizeSkill(skillName);
        jobSkillCounts.set(normalized, (jobSkillCounts.get(normalized) || 0) + 1);
      }
    }
    console.log(`   💼 Job skills found: ${jobSkillCounts.size}`);
    
    // Analyze each skill
    const totalJobs = Math.max(jobPostings.length, 1);
    const allSkills = new Set([...courseSkills, ...projectSkills, ...jobSkillCounts.keys()]);
    
    const skillsAlreadyHave: SkillAnalysis[] = [];
    const skillsWillLearn: SkillAnalysis[] = [];
    const skillGaps: SkillAnalysis[] = [];
    
    for (const skill of allSkills) {
      const inCourse = courseSkills.has(skill);
      const inProject = projectSkills.has(skill);
      const jobMentions = jobSkillCounts.get(skill) || 0;
      const importance = calculateImportance(jobMentions, totalJobs);
      
      const analysis: SkillAnalysis = {
        skill,
        source: jobMentions > 0 ? 'job_posting' : inProject ? 'project' : 'course',
        coverage: 'gap',
        importance,
        jobMentions
      };
      
      if (inCourse) {
        // Already covered by course
        analysis.coverage = 'covered';
        skillsAlreadyHave.push(analysis);
      } else if (inProject) {
        // Will learn from this project
        analysis.coverage = 'will_learn';
        skillsWillLearn.push(analysis);
      } else if (jobMentions > 0) {
        // Gap - required by jobs but not covered
        analysis.coverage = 'gap';
        skillGaps.push(analysis);
      }
    }
    
    // Sort by importance
    const importanceOrder = { critical: 0, important: 1, nice_to_have: 2 };
    skillsAlreadyHave.sort((a, b) => importanceOrder[a.importance] - importanceOrder[b.importance]);
    skillsWillLearn.sort((a, b) => importanceOrder[a.importance] - importanceOrder[b.importance]);
    skillGaps.sort((a, b) => importanceOrder[a.importance] - importanceOrder[b.importance]);
    
    // Calculate overall coverage
    const totalRequired = skillsAlreadyHave.length + skillsWillLearn.length + skillGaps.length;
    const covered = skillsAlreadyHave.length + skillsWillLearn.length;
    const overallCoverage = totalRequired > 0 ? Math.round((covered / totalRequired) * 100) : 100;
    
    // Top job requirements
    const topJobRequirements = [...jobSkillCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([skill]) => skill);
    
    // Learning opportunities (gaps that are critical/important)
    const learningOpportunities = skillGaps
      .filter(g => g.importance !== 'nice_to_have')
      .slice(0, 5)
      .map(g => g.skill);
    
    // Career readiness assessment
    let careerReadiness: string;
    if (overallCoverage >= 80) {
      careerReadiness = 'Excellent - Well-prepared for target roles';
    } else if (overallCoverage >= 60) {
      careerReadiness = 'Good - Minor skill development needed';
    } else if (overallCoverage >= 40) {
      careerReadiness = 'Developing - Focus on gap areas';
    } else {
      careerReadiness = 'Building Foundation - Significant learning opportunity';
    }
    
    // Confidence based on data availability
    let confidence = 0.5;
    if (jobPostings.length >= 3) confidence += 0.2;
    if (courseSkills.size >= 3) confidence += 0.15;
    if (projectSkills.size >= 3) confidence += 0.15;
    confidence = Math.min(1, confidence);
    
    const result: SkillGapResult = {
      overallCoverage,
      skillsAlreadyHave: skillsAlreadyHave.slice(0, 10),
      skillsWillLearn: skillsWillLearn.slice(0, 10),
      skillGaps: skillGaps.slice(0, 10),
      topJobRequirements,
      learningOpportunities,
      careerReadiness,
      confidence,
      analyzedAt: new Date().toISOString()
    };
    
    console.log(`   ✅ Analysis complete:`);
    console.log(`      Coverage: ${overallCoverage}%`);
    console.log(`      Already have: ${skillsAlreadyHave.length}`);
    console.log(`      Will learn: ${skillsWillLearn.length}`);
    console.log(`      Gaps: ${skillGaps.length}`);
    
    // Store in project_metadata
    const { error: updateError } = await supabase
      .from('project_metadata')
      .upsert({
        project_id: projectId,
        value_analysis: { skill_gap_analysis: result }
      }, { onConflict: 'project_id' });
    
    if (updateError) {
      console.error('Failed to store analysis:', updateError);
    }
    
    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Skill Gap Analyzer error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
