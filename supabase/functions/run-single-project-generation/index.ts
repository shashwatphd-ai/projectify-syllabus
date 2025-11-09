import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { calculateApolloEnrichedPricing, calculateApolloEnrichedROI } from '../_shared/pricing-service.ts';
import { generateProjectProposal } from '../_shared/generation-service.ts';
import { calculateLOAlignment, calculateMarketAlignmentScore, generateLOAlignmentDetail } from '../_shared/alignment-service.ts';

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
  contact_title?: string | null;
  contact_first_name?: string | null;
  contact_last_name?: string | null;
  full_address?: string | null;
  linkedin_profile?: string | null;
  job_postings?: any[];
  technologies_used?: string[];
  funding_stage?: string | null;
  data_completeness_score?: number;
  enrichment_level?: string;
  data_enrichment_level?: string;
  buying_intent_signals?: any[];
  total_funding_usd?: number | null;
  organization_employee_count?: string | null;
  organization_revenue_range?: string | null;
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
  const budgetResult = calculateApolloEnrichedPricing(course.weeks, course.hrs_per_week, 3, proposal.tier, company);
  const budget = budgetResult.budget;
  
  return {
    form1: {
      title: proposal.title,
      industry: company.sector,
      description: proposal.description,
      budget: budget
    },
    form2: {
      company: company.name,
      contact_name: company.contact_person || 'TBD',
      contact_email: company.contact_email || '',
      contact_title: company.contact_title || 'TBD',
      contact_phone: company.contact_phone || '',
      website: company.website || '',
      description: proposal.company_description,
      size: company.size,
      sector: company.sector,
      preferred_communication: company.contact_email ? 'Email' : 'TBD'
    },
    form3: {
      skills: proposal.skills || [],
      team_size: 3,
      learning_objectives: proposal.lo_alignment,
      deliverables: proposal.deliverables || []
    },
    form4: {
      start: 'TBD',
      end: 'TBD',
      weeks: course.weeks
    },
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('\n🔧 WORKER: Starting single project generation...');
    
    const serviceRoleClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { project_id, course_id, generation_run_id } = await req.json();
    
    if (!project_id || !course_id) {
      throw new Error('project_id and course_id are required');
    }

    console.log(`📝 Processing project ${project_id}...`);

    // Get the project shell
    const { data: project, error: projectError } = await serviceRoleClient
      .from('projects')
      .select('*, company_profiles(*)')
      .eq('id', project_id)
      .single();

    if (projectError || !project) {
      throw new Error(`Failed to fetch project: ${projectError?.message}`);
    }

    // Get the course
    const { data: course, error: courseError } = await serviceRoleClient
      .from('course_profiles')
      .select('*')
      .eq('id', course_id)
      .single();

    if (courseError || !course) {
      throw new Error(`Failed to fetch course: ${courseError?.message}`);
    }

    const outcomes = course.outcomes as string[];
    const artifacts = course.artifacts as string[];
    const companyProfile = project.company_profiles;

    // Build company info from profile
    const company: CompanyInfo = {
      id: companyProfile.id,
      name: companyProfile.name,
      sector: companyProfile.sector || 'Unknown',
      size: companyProfile.size || companyProfile.organization_employee_count || 'Unknown',
      needs: companyProfile.inferred_needs || [],
      description: companyProfile.recent_news || `${companyProfile.name} is a ${companyProfile.sector || 'business'} organization.`,
      website: companyProfile.website,
      contact_email: companyProfile.contact_email,
      contact_phone: companyProfile.contact_phone,
      contact_person: companyProfile.contact_person,
      contact_title: companyProfile.contact_title,
      contact_first_name: companyProfile.contact_first_name,
      contact_last_name: companyProfile.contact_last_name,
      full_address: companyProfile.full_address,
      linkedin_profile: companyProfile.organization_linkedin_url,
      job_postings: companyProfile.job_postings || [],
      technologies_used: companyProfile.technologies_used || [],
      funding_stage: companyProfile.funding_stage,
      buying_intent_signals: companyProfile.buying_intent_signals || [],
      total_funding_usd: companyProfile.total_funding_usd,
      organization_employee_count: companyProfile.organization_employee_count,
      organization_revenue_range: companyProfile.organization_revenue_range,
      data_completeness_score: companyProfile.data_completeness_score,
      enrichment_level: companyProfile.data_enrichment_level,
    };

    console.log(`🤖 Calling AI to generate proposal for ${company.name}...`);
    
    // Generate the full proposal using AI
    const proposal = await generateProjectProposal(
      company,
      outcomes,
      artifacts,
      course.level,
      course.weeks,
      course.hrs_per_week
    );

    console.log(`✓ Proposal generated: "${proposal.title}"`);

    const { cleaned, issues } = cleanAndValidate(proposal);
    const scores = await calculateScores(
      cleaned.tasks,
      cleaned.deliverables,
      outcomes,
      course.weeks,
      cleaned.lo_alignment
    );

    const budgetResult = calculateApolloEnrichedPricing(
      course.weeks,
      course.hrs_per_week,
      3,
      cleaned.tier,
      company
    );

    const marketAlignmentScore = calculateMarketAlignmentScore(
      cleaned.tasks,
      cleaned.deliverables,
      company.inferred_needs || company.needs || [],
      company.job_postings || [],
      company.technologies_used || [],
      artifacts,
      outcomes
    );
    
    // Calculate LO alignment detail with robust error handling
    let loAlignmentDetail = null; // Default to null
    try {
      console.log(`  [Worker] Generating LO Alignment for project ${project_id}...`);
      loAlignmentDetail = await generateLOAlignmentDetail(
        cleaned.tasks,
        cleaned.deliverables,
        outcomes,
        cleaned.lo_alignment
      );
      console.log(`  [Worker] ✓ LO Alignment generated successfully`);
    } catch (loError) {
      // THIS IS THE "ROBUST" FIX - prevents silent worker failures
      console.error(`  [Worker] ⚠️ FAILED to generate LO Alignment for project ${project_id}:`, loError instanceof Error ? loError.message : 'Unknown error');
      // DO NOT throw the error. We will log it and proceed.
      // The project is still 90% good and should become an 'ai_shell'.
    }

    const forms = createForms(company, cleaned, course);
    const milestones = generateMilestones(course.weeks, cleaned.deliverables);

    // Update the project with full data
    const { error: updateError } = await serviceRoleClient
      .from('projects')
      .update({
        title: cleaned.title,
        description: cleaned.description,
        tasks: cleaned.tasks,
        deliverables: cleaned.deliverables,
        duration_weeks: course.weeks,
        team_size: 3,
        tier: cleaned.tier,
        lo_score: scores.lo_score,
        feasibility_score: scores.feasibility_score,
        mutual_benefit_score: scores.mutual_benefit_score,
        final_score: scores.final_score,
        pricing_usd: budgetResult.budget,
        needs_review: issues.length > 0,
        status: 'ai_shell',
      })
      .eq('id', project_id);

    if (updateError) {
      console.error('Failed to update project:', updateError);
      throw updateError;
    }

    // Insert project forms
    const { error: formsError } = await serviceRoleClient
      .from('project_forms')
      .insert({
        project_id: project_id,
        ...forms,
        milestones: milestones
      });

    if (formsError && formsError.code !== '23505') {
      console.error('Failed to insert forms:', formsError);
    }

    // Insert project metadata
    const roiResult = calculateApolloEnrichedROI(
      budgetResult.budget,
      cleaned.deliverables,
      company,
      cleaned.tasks
    );

    const { error: metadataError } = await serviceRoleClient
      .from('project_metadata')
      .insert({
        project_id: project_id,
        ai_model_version: 'google/gemini-2.5-flash',
        market_alignment_score: marketAlignmentScore,
        estimated_roi: roiResult.roi,
        pricing_breakdown: budgetResult.breakdown,
        lo_alignment_detail: loAlignmentDetail,
        lo_mapping_tasks: cleaned.tasks.map((task, i) => ({
          task_number: i + 1,
          task: task,
          aligned_outcomes: outcomes
        })),
        lo_mapping_deliverables: cleaned.deliverables.map((del, i) => ({
          deliverable_number: i + 1,
          deliverable: del,
          aligned_outcomes: outcomes
        })),
        market_signals_used: {
          job_postings_count: company.job_postings?.length || 0,
          technologies_count: company.technologies_used?.length || 0,
          has_funding_data: !!company.funding_stage,
          data_completeness: company.data_completeness_score
        }
      });

    if (metadataError && metadataError.code !== '23505') {
      console.error('Failed to insert metadata:', metadataError);
    }

    console.log(`✅ WORKER: Project ${project_id} completed successfully`);

    return new Response(
      JSON.stringify({ 
        success: true,
        project_id,
        message: 'Project generation completed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('⚠️ WORKER ERROR:', error);
    
    // Try to mark the project as failed
    try {
      const { project_id } = await req.json();
      if (project_id) {
        const serviceRoleClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        
        await serviceRoleClient
          .from('projects')
          .update({ 
            status: 'failed',
            needs_review: true 
          })
          .eq('id', project_id);
          
        console.log(`⚠️ Marked project ${project_id} as failed`);
      }
    } catch (updateError) {
      console.error('Failed to mark project as failed:', updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Failed to generate project. Please try again later.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
