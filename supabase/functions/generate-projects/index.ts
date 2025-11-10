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

// REMOVED: getApolloEnrichedCompanies (Phase 3b)
// This function is redundant with the clean data contract from discover-companies
// Replaced with direct database query in main serve() function

// REMOVED: All caching and fallback functions (Phase 3b cleanup)
// - getCompaniesFromDB: Removed in Phase 3a
// - generateCacheKey: Orphaned helper, will be rebuilt in Phase 4
// - getCachedFilteredCompanies: Orphaned caching, will be rebuilt in Phase 4
// - saveCachedFilteredCompanies: Orphaned caching, will be rebuilt in Phase 4
// - intelligentCompanyFilter: Removed in Phase 3a
// - searchCompanies: Removed in Phase 3a (no fake data fallback)

// NOTE: generateProjectProposal() extracted to ../_shared/generation-service.ts

// NOTE: calculateLOAlignment() extracted to ../_shared/alignment-service.ts

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

// ============================================================================
// PRICING & ROI CALCULATION (extracted to ../shared/pricing-service.ts)
// ============================================================================

// NEW: Intelligent Signal Filtering - Filter company data once at the source
function filterRelevantSignals(
  company: CompanyInfo,
  cityZip: string,
  courseTopics: string[],
  courseOutcomes: string[]
): CompanyInfo {
  console.log(`\n🔍 Filtering signals for ${company.name}...`);
  
  // Step 1: Parse location from course.city_zip
  const zipMatch = cityZip.match(/\b\d{5}\b/);
  const zipCode = zipMatch ? zipMatch[0] : null;
  const cityName = cityZip.split(',')[0].trim().toLowerCase();
  const stateMatch = cityZip.match(/,\s*([A-Z]{2})/);
  const stateName = stateMatch ? stateMatch[1].toLowerCase() : null;
  
  console.log(`  📍 Course location: City="${cityName}", Zip="${zipCode}", State="${stateName}"`);
  
  // Step 2: Extract intelligent keywords from course data
  const keywords = new Set<string>();
  
  // Extract from topics (e.g., "Fluid Dynamics" -> ["fluid", "dynamics"])
  courseTopics.forEach(topic => {
    topic.toLowerCase().split(/[\s,]+/).forEach(word => {
      if (word.length > 3) keywords.add(word); // Skip short words like "and", "the"
    });
  });
  
  // Extract from outcomes (focus on technical terms)
  courseOutcomes.forEach(outcome => {
    // Extract technical terms (capitalized words, technical phrases)
    const technicalTerms = outcome.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    technicalTerms.forEach(term => {
      term.toLowerCase().split(/\s+/).forEach(word => {
        if (word.length > 3) keywords.add(word);
      });
    });
    
    // Also extract key verbs and nouns
    const words = outcome.toLowerCase().split(/[\s,]+/);
    words.forEach(word => {
      if (word.length > 4 && !['about', 'using', 'their', 'these', 'which', 'where'].includes(word)) {
        keywords.add(word);
      }
    });
  });
  
  // Step 3: Build synonym map for intelligent matching
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
  
  // Expand keywords with synonyms
  const expandedKeywords = new Set(keywords);
  keywords.forEach(keyword => {
    if (synonymMap[keyword]) {
      synonymMap[keyword].forEach(syn => expandedKeywords.add(syn));
    }
  });
  
  console.log(`  🔑 Keywords (${expandedKeywords.size}): ${Array.from(expandedKeywords).slice(0, 10).join(', ')}...`);
  
  // Step 4: Filter job postings by location AND topic relevance
  const originalJobCount = company.job_postings?.length || 0;
  const filteredJobs = (company.job_postings || []).filter(job => {
    // Location filter
    const jobLocation = (job.location || '').toLowerCase();
    const locationMatch = 
      (zipCode && jobLocation.includes(zipCode)) ||
      (cityName && jobLocation.includes(cityName)) ||
      (stateName && jobLocation.includes(stateName)) ||
      jobLocation.includes('remote') || // Keep remote jobs
      jobLocation.includes('hybrid'); // Keep hybrid jobs
    
    if (!locationMatch) return false;
    
    // Topic relevance filter
    const jobText = `${job.title || ''} ${job.description || ''}`.toLowerCase();
    const matchCount = Array.from(expandedKeywords).filter(keyword => 
      jobText.includes(keyword)
    ).length;
    
    const isRelevant = matchCount > 0;
    
    if (isRelevant) {
      console.log(`    ✓ Job: "${job.title}" (${job.location}) - ${matchCount} keyword matches`);
    }
    
    return isRelevant;
  });
  
  console.log(`  📊 Jobs: ${originalJobCount} total → ${filteredJobs.length} relevant (${Math.round(filteredJobs.length / Math.max(originalJobCount, 1) * 100)}% match)`);
  
  // Step 5: Filter technologies by course relevance
  const originalTechCount = company.technologies_used?.length || 0;
  const filteredTech = (company.technologies_used || []).filter(tech => {
    const techName = typeof tech === 'string' ? tech : ((tech as any)?.name || (tech as any)?.technology || '');
    const techLower = techName.toLowerCase();
    
    // Check if technology matches any course keyword
    const matches = Array.from(expandedKeywords).some(keyword => 
      techLower.includes(keyword) || keyword.includes(techLower)
    );
    
    if (matches) {
      console.log(`    ✓ Tech: ${techName}`);
    }
    
    return matches;
  });
  
  console.log(`  💻 Technologies: ${originalTechCount} total → ${filteredTech.length} relevant`);
  
  // Step 6: Filter buying intent signals
  const originalIntentCount = company.buying_intent_signals?.length || 0;
  const filteredIntent = (company.buying_intent_signals || []).filter(signal => {
    const signalText = JSON.stringify(signal).toLowerCase();
    return Array.from(expandedKeywords).some(keyword => signalText.includes(keyword));
  });
  
  console.log(`  🎯 Buying Intent: ${originalIntentCount} total → ${filteredIntent.length} relevant`);
  
  // Step 7: Return filtered company object
  const filteredCompany: CompanyInfo = {
    ...company,
    job_postings: filteredJobs,
    technologies_used: filteredTech,
    buying_intent_signals: filteredIntent,
  };
  
  console.log(`✅ Filtering complete: ${filteredJobs.length} jobs, ${filteredTech.length} technologies, ${filteredIntent.length} signals\n`);
  
  return filteredCompany;
}


// NOTE: calculateMarketAlignmentScore() extracted to ../_shared/alignment-service.ts

// NOTE: generateLOAlignmentDetail() extracted to ../_shared/alignment-service.ts

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
    // FORM 1: Project Details
    form1: {
      title: proposal.title,
      industry: company.sector,
      description: proposal.description,
      budget: budget
    },
    
    // FORM 2: Company & Contact Info (APOLLO-ENRICHED DATA - NO PLACEHOLDERS)
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

    const requestBody = await req.json();
    const { courseId, industries, numTeams, generation_run_id } = requestBody;

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
    
    // CRITICAL: Enforce Apollo-First Architecture - generation_run_id is MANDATORY
    const generationRunId = generation_run_id;
    
    if (!generationRunId || typeof generationRunId !== 'string' || generationRunId.length === 0) {
      console.error('❌ MISSING REQUIRED PARAMETER: generation_run_id');
      console.error('   Received value:', generationRunId, 'Type:', typeof generationRunId);
      
      return new Response(
        JSON.stringify({ 
          error: 'Bad Request: generation_run_id is required',
          message: 'Project generation requires a valid generation_run_id from the discovery phase. Please run company discovery first.',
          received: { generationRunId, type: typeof generationRunId }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
    
    console.log('\n🚀 Apollo-First Project Generation (Enforced)');
    console.log('📍 Location:', cityZip);
    console.log('🏢 Industries:', industries);
    console.log('👥 Teams requested:', numTeams);
    console.log('🔗 Generation Run ID:', generationRunId);
    
    // Phase 3b: Direct database query (no intermediate functions)
    console.log('\n✅ Querying company_profiles directly...');
    
    const { data: companyData, error: companyError } = await serviceRoleClient
      .from('company_profiles')
      .select('*')
      .eq('generation_run_id', generationRunId)
      .order('data_completeness_score', { ascending: false })
      .limit(numTeams);
    
    if (companyError) {
      console.error('❌ Database query error:', companyError.message);
      throw new Error('Failed to fetch companies from database');
    }
    
    if (!companyData || companyData.length === 0) {
      console.error('❌ No companies found for generation_run_id:', generationRunId);
      throw new Error('No companies available for this generation run');
    }
    
    console.log(`✅ Retrieved ${companyData.length} companies from database`);
    
    // Map database records to CompanyInfo interface
    const companiesFound: CompanyInfo[] = companyData.map((company: any) => {
      // Derive needs from Apollo enrichment data
      const inferredNeeds = company.inferred_needs || [];
      const derivedNeeds = [];
      
      if (company.job_postings && company.job_postings.length > 0) {
        derivedNeeds.push(`Hiring velocity: ${company.job_postings.length} active openings`);
      }
      if (company.technologies_used && company.technologies_used.length > 0) {
        derivedNeeds.push(`Technology stack: ${company.technologies_used.slice(0, 3).join(', ')}`);
      }
      if (company.funding_stage) {
        derivedNeeds.push(`${company.funding_stage} growth strategy`);
      }
      
      const allNeeds = inferredNeeds.length > 0 ? inferredNeeds : derivedNeeds;
      
      return {
        id: company.id,
        name: company.name,
        sector: company.sector || 'Unknown',
        size: company.size || company.organization_employee_count || 'Unknown',
        needs: allNeeds,
        description: company.recent_news || `${company.name} is a ${company.sector || 'business'} organization.`,
        website: company.website,
        
        // Apollo contact data
        contact_email: company.contact_email,
        contact_phone: company.contact_phone,
        contact_person: company.contact_person,
        contact_title: company.contact_title,
        contact_first_name: company.contact_first_name,
        contact_last_name: company.contact_last_name,
        full_address: company.full_address,
        linkedin_profile: company.organization_linkedin_url,
        
        // Market intelligence
        job_postings: company.job_postings || [],
        technologies_used: company.technologies_used || [],
        funding_stage: company.funding_stage,
        buying_intent_signals: company.buying_intent_signals || [],
        total_funding_usd: company.total_funding_usd,
        organization_employee_count: company.organization_employee_count,
        organization_revenue_range: company.organization_revenue_range,
        
        // Metadata
        data_completeness_score: company.data_completeness_score,
        enrichment_level: company.data_enrichment_level,
        
        // Intelligence from discovery phase
        match_score: company.relevance,
        match_reason: company.reason
      };
    });
    
    console.log('   Company IDs:', companiesFound.map(c => `${c.name}(${c.id})`).join(', '));
    
    if (companiesFound.length > 0) {
      console.log('   Sample contact:', {
        name: companiesFound[0]?.contact_person,
        email: companiesFound[0]?.contact_email,
        phone: companiesFound[0]?.contact_phone
      });
    }

    const projectIds: string[] = [];
    const generationErrors: any[] = [];

    // Generate Full Projects Synchronously
    console.log('\n🚀 Generating full projects synchronously...');
    
    for (let i = 0; i < companiesFound.length; i++) {
      const company = companiesFound[i];
      console.log(`\n📝 Generating project ${i + 1}/${companiesFound.length} for ${company.name}...`);
      
      try {
        // Filter company signals for relevance
        const filteredCompany = filterRelevantSignals(company, cityZip, course.topics || [], outcomes);
        
        // Generate proposal
        console.log('  → Generating AI proposal...');
        const proposal = await generateProjectProposal(
          filteredCompany,
          outcomes,
          artifacts,
          level,
          course.weeks,
          course.hrs_per_week
        );
        
        // Clean and validate
        const { cleaned: cleanedProposal, issues } = cleanAndValidate(proposal);
        if (issues.length > 0) {
          console.log(`  ⚠️ Validation issues: ${issues.join(', ')}`);
        }
        
        // Calculate scores
        console.log('  → Calculating scores...');
        const scores = await calculateScores(
          cleanedProposal.tasks,
          cleanedProposal.deliverables,
          outcomes,
          course.weeks,
          cleanedProposal.lo_alignment
        );
        
        // Calculate market alignment and ROI
        const marketAlignment = await calculateMarketAlignmentScore(
          cleanedProposal.tasks,
          cleanedProposal.deliverables,
          filteredCompany.needs,
          filteredCompany.job_postings || [],
          filteredCompany.technologies_used || [],
          course.topics || [],
          outcomes
        );
        const loAlignmentDetail = await generateLOAlignmentDetail(
          cleanedProposal.tasks,
          cleanedProposal.deliverables,
          outcomes,
          cleanedProposal.lo_alignment
        );
        
        // Calculate pricing first, then ROI
        const pricingResult = calculateApolloEnrichedPricing(
          course.weeks,
          course.hrs_per_week,
          3,
          cleanedProposal.tier,
          filteredCompany
        );
        const roiCalculation = calculateApolloEnrichedROI(
          pricingResult.budget,
          cleanedProposal.deliverables,
          filteredCompany,
          cleanedProposal.tasks
        );
        
        // Generate forms and milestones
        const forms = createForms(filteredCompany, cleanedProposal, course);
        const milestones = generateMilestones(course.weeks, cleanedProposal.deliverables);
        
        // P0-1 FIX: Use atomic transaction to prevent orphaned projects
        // Single RPC call handles all 3 inserts in one transaction
        console.log('  → Creating project atomically...');

        const projectData = {
          course_id: courseId,
          generation_run_id: generationRunId,
          company_profile_id: filteredCompany.id,
          company_name: filteredCompany.name,
          company_logo_url: null,
          status: 'ai_shell',
          title: cleanedProposal.title,
          description: cleanedProposal.description,
          tasks: cleanedProposal.tasks,
          deliverables: cleanedProposal.deliverables,
          tier: cleanedProposal.tier,
          sector: filteredCompany.sector,
          company_size: filteredCompany.size,
          company_needs: filteredCompany.inferred_needs || [],
          lo_alignment: cleanedProposal.lo_alignment,
          lo_score: scores.lo_score,
          feasibility_score: scores.feasibility_score,
          mutual_benefit_score: scores.mutual_benefit_score,
          final_score: scores.final_score,
          skills: cleanedProposal.skills || [],
          majors: cleanedProposal.majors || [],
          website: cleanedProposal.website || filteredCompany.website,
          faculty_feedback: issues.length > 0 ? `Validation issues: ${issues.join(', ')}` : null,
          needs_review: issues.length > 0,
          duration_weeks: course.weeks,
          team_size: 3,
          pricing_usd: pricingResult.budget
        };

        const formsData = {
          form1: forms.form1 || {},
          form2: forms.form2 || {},
          form3: forms.form3 || {},
          form4: forms.form4 || {},
          form5: forms.form5 || {},
          form6: forms.form6 || {},
          milestones: milestones
        };

        const metadataData = {
          market_alignment_score: marketAlignment,
          estimated_roi: {
            roi: roiCalculation.roi,
            studentValueScore: roiCalculation.studentValueScore,
            employerValueScore: roiCalculation.employerValueScore,
            universityValueScore: roiCalculation.universityValueScore
          },
          stakeholder_insights: roiCalculation.stakeholderInsights,
          lo_alignment_detail: loAlignmentDetail,
          pricing_breakdown: roiCalculation.pricingBreakdown,
          algorithm_version: 'v2.0',
          ai_model_version: 'gemini-2.0-flash-exp'
        };

        // Atomic transaction: all 3 inserts succeed or all rollback
        const { data: atomicResult, error: atomicError } = await serviceRoleClient
          .rpc('create_project_atomic', {
            p_project_data: projectData,
            p_forms_data: formsData,
            p_metadata_data: metadataData
          });

        if (atomicError || !atomicResult || atomicResult.length === 0) {
          const errorMsg = atomicError?.message || atomicResult?.[0]?.error_message || 'Unknown error';
          console.error(`  ❌ Atomic project creation failed:`, errorMsg);
          generationErrors.push({
            company: company.name,
            error: `Atomic insert failed: ${errorMsg}`
          });
          continue; // Skip to next company - NO orphaned project created
        }

        const insertedProjectId = atomicResult[0].project_id;

        if (!atomicResult[0].success || !insertedProjectId) {
          console.error(`  ❌ Atomic creation unsuccessful:`, atomicResult[0].error_message);
          generationErrors.push({
            company: company.name,
            error: atomicResult[0].error_message || 'Unknown atomic error'
          });
          continue;
        }

        projectIds.push(insertedProjectId);
        console.log(`  ✅ Project created atomically: ${insertedProjectId}`);
        
        // Add small delay to avoid rate limits
        if (i < companiesFound.length - 1) {
          await delay(500);
        }
        
      } catch (error: any) {
        console.error(`  ❌ Generation failed for ${company.name}:`, error);
        generationErrors.push({ company: company.name, error: error.message });
      }
    }

    // Update generation run
    if (generationRunId) {
      await serviceRoleClient
        .from('generation_runs')
        .update({
          projects_generated: projectIds.length,
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', generationRunId);
      
      console.log(`✅ Updated generation run ${generationRunId} with ${projectIds.length} projects`);
    }

    console.log('\n========================================');
    console.log('✅ PROJECT GENERATION COMPLETE');
    console.log(`   Successful: ${projectIds.length}`);
    console.log(`   Failed: ${generationErrors.length}`);
    console.log('========================================\n');

    return new Response(
      JSON.stringify({ 
        success: true,
        projectIds,
        message: `Successfully generated ${projectIds.length} projects`,
        errors: generationErrors.length > 0 ? generationErrors : undefined,
        using_real_data: companiesFound.some(c => c.id !== undefined),
        generationRunId: generationRunId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Generation error:', error);
    // Return generic error message to prevent information leakage
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate projects. Please check your course configuration and try again.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
