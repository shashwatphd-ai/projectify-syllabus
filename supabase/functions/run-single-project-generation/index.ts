import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { calculateApolloEnrichedPricing, calculateApolloEnrichedROI } from '../_shared/pricing-service.ts';
import { generateProjectProposal } from '../_shared/generation-service.ts';
import { calculateLOAlignment, calculateMarketAlignmentScore, generateLOAlignmentDetail } from '../_shared/alignment-service.ts';
import { corsHeaders } from '../_shared/cors.ts';

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

// Helper function for delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function filterRelevantSignals(
  company: CompanyInfo,
  cityZip: string,
  courseTopics: string[],
  courseOutcomes: string[]
): CompanyInfo {
  console.log(`\n🔍 Filtering signals for ${company.name}...`);
  
  const zipMatch = cityZip.match(/\b\d{5}\b/);
  const zipCode = zipMatch ? zipMatch[0] : null;
  const cityName = cityZip.split(',')[0].trim().toLowerCase();
  const stateMatch = cityZip.match(/,\s*([A-Z]{2})/);
  const stateName = stateMatch ? stateMatch[1].toLowerCase() : null;
  
  const keywords = new Set<string>();
  
  courseTopics.forEach(topic => {
    topic.toLowerCase().split(/[\s,]+/).forEach(word => {
      if (word.length > 3) keywords.add(word);
    });
  });
  
  courseOutcomes.forEach(outcome => {
    const technicalTerms = outcome.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    technicalTerms.forEach(term => {
      term.toLowerCase().split(/\s+/).forEach(word => {
        if (word.length > 3) keywords.add(word);
      });
    });
    
    const words = outcome.toLowerCase().split(/[\s,]+/);
    words.forEach(word => {
      if (word.length > 4 && !['about', 'using', 'their', 'these', 'which', 'where'].includes(word)) {
        keywords.add(word);
      }
    });
  });
  
  const synonymMap: Record<string, string[]> = {
    'ai': ['artificial intelligence', 'machine learning', 'ml', 'deep learning', 'neural'],
    'ml': ['machine learning', 'artificial intelligence', 'ai', 'predictive'],
    'cloud': ['aws', 'azure', 'gcp', 'kubernetes', 'docker', 'serverless'],
    'data': ['analytics', 'database', 'sql', 'nosql', 'etl', 'pipeline'],
    'software': ['development', 'engineering', 'programming', 'coding'],
    'fluid': ['hydraulic', 'flow', 'pressure', 'liquid', 'gas'],
    'mechanical': ['mechanics', 'engineering', 'design', 'cad'],
    'chemical': ['chemistry', 'process', 'reaction', 'synthesis'],
    'simulation': ['modeling', 'cfd', 'fem', 'analysis'],
    'optimization': ['improve', 'enhance', 'efficiency', 'performance']
  };
  
  const expandedKeywords = new Set(keywords);
  keywords.forEach(keyword => {
    if (synonymMap[keyword]) {
      synonymMap[keyword].forEach(syn => expandedKeywords.add(syn));
    }
  });
  
  const filteredJobs = (company.job_postings || []).filter(job => {
    const jobLocation = (job.location || '').toLowerCase();
    const locationMatch = 
      (zipCode && jobLocation.includes(zipCode)) ||
      (cityName && jobLocation.includes(cityName)) ||
      (stateName && jobLocation.includes(stateName)) ||
      jobLocation.includes('remote') ||
      jobLocation.includes('hybrid');
    
    if (!locationMatch) return false;
    
    const jobText = `${job.title || ''} ${job.description || ''}`.toLowerCase();
    const matchCount = Array.from(expandedKeywords).filter(keyword => 
      jobText.includes(keyword)
    ).length;
    
    return matchCount > 0;
  });
  
  const filteredTech = (company.technologies_used || []).filter(tech => {
    const techName = typeof tech === 'string' ? tech : ((tech as any)?.name || (tech as any)?.technology || '');
    const techLower = techName.toLowerCase();
    
    return Array.from(expandedKeywords).some(keyword => 
      techLower.includes(keyword) || keyword.includes(techLower)
    );
  });
  
  const filteredIntent = (company.buying_intent_signals || []).filter(signal => {
    const signalText = JSON.stringify(signal).toLowerCase();
    return Array.from(expandedKeywords).some(keyword => signalText.includes(keyword));
  });
  
  return {
    ...company,
    job_postings: filteredJobs,
    technologies_used: filteredTech,
    buying_intent_signals: filteredIntent,
  };
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

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { project_id, course_id, generation_run_id } = await req.json();

    if (!project_id) {
      throw new Error('project_id is required');
    }

    console.log(`\n🔧 [Worker] Starting generation for project ${project_id}...`);

    // Fetch the project
    const { data: project, error: projectError } = await supabaseClient
      .from('projects')
      .select('*')
      .eq('id', project_id)
      .single();

    if (projectError || !project) {
      throw new Error(`Failed to fetch project: ${projectError?.message}`);
    }

    // Fetch the course
    const { data: course, error: courseError } = await supabaseClient
      .from('course_profiles')
      .select('*')
      .eq('id', course_id)
      .single();

    if (courseError || !course) {
      throw new Error(`Failed to fetch course: ${courseError?.message}`);
    }

    // Fetch the company
    const { data: companyData, error: companyError } = await supabaseClient
      .from('company_profiles')
      .select('*')
      .eq('id', project.company_profile_id)
      .single();

    if (companyError || !companyData) {
      throw new Error(`Failed to fetch company: ${companyError?.message}`);
    }

    // Map company data to CompanyInfo interface
    const company: CompanyInfo = {
      id: companyData.id,
      name: companyData.name,
      sector: companyData.sector || 'Unknown',
      size: companyData.size || companyData.organization_employee_count || 'Unknown',
      needs: companyData.inferred_needs || [],
      description: companyData.recent_news || `${companyData.name} is a ${companyData.sector || 'business'} organization.`,
      website: companyData.website,
      contact_email: companyData.contact_email,
      contact_phone: companyData.contact_phone,
      contact_person: companyData.contact_person,
      contact_title: companyData.contact_title,
      contact_first_name: companyData.contact_first_name,
      contact_last_name: companyData.contact_last_name,
      full_address: companyData.full_address,
      linkedin_profile: companyData.organization_linkedin_url,
      job_postings: companyData.job_postings || [],
      technologies_used: companyData.technologies_used || [],
      funding_stage: companyData.funding_stage,
      buying_intent_signals: companyData.buying_intent_signals || [],
      total_funding_usd: companyData.total_funding_usd,
      organization_employee_count: companyData.organization_employee_count,
      organization_revenue_range: companyData.organization_revenue_range,
      data_completeness_score: companyData.data_completeness_score,
      enrichment_level: companyData.data_enrichment_level,
    };

    const outcomes = course.outcomes as string[];
    const artifacts = course.artifacts as string[];

    console.log(`  🏢 Company: ${company.name}`);
    console.log(`  📚 Course: ${course.title} (${course.weeks} weeks)`);

    // Generate project proposal with retry logic
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
          console.log('  ⚠️ Quality issues detected:', issues);
          if (attempts < maxAttempts) {
            console.log('  🔄 Retrying generation...');
            await delay(2000 * attempts);
            continue;
          }
        }
        
        const validationErrors = validateProjectData(cleaned, company);
        if (validationErrors.length > 0) {
          console.log('  ⚠️ Validation errors:', validationErrors);
          if (attempts < maxAttempts) {
            console.log('  🔄 Retrying generation...');
            await delay(2000 * attempts);
            continue;
          }
        }
        
        proposal = cleaned;
      } catch (error) {
        console.error(`  ❌ Attempt ${attempts} failed:`, error);
        if (attempts < maxAttempts) {
          const backoffDelay = Math.min(3000 * Math.pow(2, attempts - 1), 15000);
          console.log(`  ⏳ Waiting ${backoffDelay}ms before retry...`);
          await delay(backoffDelay);
        } else {
          // CRITICAL: Don't throw - update project status to 'failed'
          await supabaseClient
            .from('projects')
            .update({ 
              status: 'failed',
              description: `Failed to generate project after ${maxAttempts} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`
            })
            .eq('id', project_id);
          
          throw new Error(`Failed to generate proposal after ${maxAttempts} attempts`);
        }
      }
    }

    if (!proposal) {
      throw new Error('Failed to generate valid proposal');
    }

    console.log(`  ✓ Proposal generated: ${proposal.tasks.length} tasks, ${proposal.deliverables.length} deliverables`);

    // Calculate scores
    const scores = await calculateScores(
      proposal.tasks,
      proposal.deliverables,
      outcomes,
      course.weeks,
      proposal.lo_alignment
    );

    console.log(`  📊 Scores: LO=${(scores.lo_score * 100).toFixed(0)}%, Feasibility=${(scores.feasibility_score * 100).toFixed(0)}%, Benefit=${(scores.mutual_benefit_score * 100).toFixed(0)}%`);

    // Generate LO alignment detail
    const loAlignmentDetail = await generateLOAlignmentDetail(
      proposal.tasks,
      proposal.deliverables,
      outcomes,
      proposal.lo_alignment
    );

    // Filter company signals
    const filteredCompany = filterRelevantSignals(
      company,
      course.city_zip,
      artifacts || [],
      outcomes
    );
    
    // Calculate pricing
    const teamSize = 3;
    const budgetResult = calculateApolloEnrichedPricing(
      course.weeks,
      course.hrs_per_week,
      teamSize,
      proposal.tier,
      filteredCompany
    );
    
    console.log(`  💰 Pricing: $${budgetResult.budget.toLocaleString()}`);

    // Generate milestones and forms
    const milestones = generateMilestones(course.weeks, proposal.deliverables);
    const forms = createForms(company, proposal, course);
    
    // Calculate ROI
    const roiAnalysis = calculateApolloEnrichedROI(
      budgetResult.budget,
      proposal.deliverables,
      filteredCompany,
      proposal.tasks
    );
    
    console.log(`  📈 ROI: ${roiAnalysis.roi_multiplier}x`);

    // Update the project with full data
    const { error: updateError } = await supabaseClient
      .from('projects')
      .update({
        title: proposal.title,
        description: proposal.description,
        tasks: proposal.tasks,
        deliverables: proposal.deliverables,
        pricing_usd: budgetResult.budget,
        lo_score: scores.lo_score,
        feasibility_score: scores.feasibility_score,
        mutual_benefit_score: scores.mutual_benefit_score,
        final_score: scores.final_score,
        tier: proposal.tier,
        status: 'ai_shell' // Mark as complete
      })
      .eq('id', project_id);

    if (updateError) {
      throw new Error(`Failed to update project: ${updateError.message}`);
    }

    // Insert project forms
    const { error: formsError } = await supabaseClient
      .from('project_forms')
      .insert({
        project_id: project_id,
        ...forms,
        milestones: milestones,
      });

    if (formsError) {
      console.error('  ⚠️ Forms insert error:', formsError);
    }

    // Insert project metadata
    const metadataInsert: any = {
      project_id: project_id,
      algorithm_version: 'v2.0-intelligent-async',
      companies_considered: [{
        name: company.name,
        sector: company.sector,
        size: company.size,
        data_quality: company.needs?.length > 0 ? 'enriched' : 'basic',
        needs_addressed: company.needs || [],
        reason: 'Selected based on enriched company data with AI-analyzed business needs'
      }],
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

    if (loAlignmentDetail) {
      metadataInsert.lo_alignment_detail = loAlignmentDetail;
      metadataInsert.lo_mapping_tasks = loAlignmentDetail.task_mappings;
      metadataInsert.lo_mapping_deliverables = loAlignmentDetail.deliverable_mappings;
    }
    
    metadataInsert.pricing_breakdown = budgetResult.breakdown;
    metadataInsert.estimated_roi = roiAnalysis;
    metadataInsert.market_alignment_score = calculateMarketAlignmentScore(
      proposal.tasks,
      proposal.deliverables,
      filteredCompany.inferred_needs || filteredCompany.needs || [],
      filteredCompany.job_postings || [],
      filteredCompany.technologies_used || [],
      artifacts || [],
      outcomes
    );
    
    if (filteredCompany.job_postings || filteredCompany.technologies_used || filteredCompany.funding_stage) {
      metadataInsert.market_signals_used = {
        job_postings_matched: filteredCompany.job_postings?.length || 0,
        job_postings_total: company.job_postings?.length || 0,
        job_postings_filtered_out: (company.job_postings?.length || 0) - (filteredCompany.job_postings?.length || 0),
        technologies_aligned: filteredCompany.technologies_used || [],
        technologies_total: company.technologies_used?.length || 0,
        technologies_filtered_out: (company.technologies_used?.length || 0) - (filteredCompany.technologies_used?.length || 0),
        funding_stage: filteredCompany.funding_stage || null,
        hiring_urgency: filteredCompany.job_postings && filteredCompany.job_postings.length > 5 ? 'high' : 'medium',
        needs_identified: company.needs || [],
        location_filter: course.city_zip,
        topic_filters_applied: artifacts || []
      };
    }

    const { error: metadataError } = await supabaseClient
      .from('project_metadata')
      .insert(metadataInsert);
      
    if (metadataError) {
      console.error('  ⚠️ Metadata insert error:', metadataError);
    }

    console.log(`✅ [Worker] Project ${project_id} generation complete`);

    return new Response(
      JSON.stringify({ 
        success: true,
        project_id,
        message: 'Project generation completed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ [Worker] Generation error:', error);
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
