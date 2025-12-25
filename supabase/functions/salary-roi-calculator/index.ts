import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import { verifyAuth, unauthorizedResponse } from "../_shared/auth-middleware.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Salary ROI Calculator Edge Function (Enhanced with Signal Scores)
 * 
 * Calculates the return on investment for student projects using:
 * - Signal scores (job skills, market intel, department fit, contact quality)
 * - Project skills and learning outcomes
 * - Industry benchmarks and market data
 * 
 * Returns salary projections, skill value, signal-based insights, and career impact metrics.
 */

interface SalaryData {
  occupation: string;
  medianSalary: number;
  percentile25: number;
  percentile75: number;
  percentile90: number;
  growthRate: number;
  totalJobs: number;
}

interface SkillPremium {
  skill: string;
  premiumPercent: number;
  demandScore: number;
  marketValue: string;
}

interface SignalInsights {
  partnershipReadiness: number;      // 0-100 composite from signals
  hiringLikelihood: string;          // High/Medium/Low
  fundingStability: string;          // Recent funding signals
  decisionMakerAccess: string;       // Contact quality description
  overallRecommendation: string;     // Summary for faculty
}

interface ROICalculation {
  currentSalaryEstimate: number;
  projectedSalaryWithSkills: number;
  salaryBoostPercent: number;
  annualValueGain: number;
  fiveYearValueGain: number;
  careerAcceleration: string;
  skillPremiums: SkillPremium[];
  occupationData: SalaryData;
  signalInsights: SignalInsights;    // NEW: Signal-driven insights
  confidence: number;
  calculatedAt: string;
}

// Fallback salary data by industry/occupation
const FALLBACK_SALARY_DATA: Record<string, SalaryData> = {
  'software_engineer': {
    occupation: 'Software Developer',
    medianSalary: 120000,
    percentile25: 90000,
    percentile75: 150000,
    percentile90: 180000,
    growthRate: 22,
    totalJobs: 1800000
  },
  'data_analyst': {
    occupation: 'Data Analyst',
    medianSalary: 85000,
    percentile25: 65000,
    percentile75: 105000,
    percentile90: 130000,
    growthRate: 25,
    totalJobs: 900000
  },
  'business_analyst': {
    occupation: 'Business Analyst',
    medianSalary: 90000,
    percentile25: 70000,
    percentile75: 115000,
    percentile90: 140000,
    growthRate: 14,
    totalJobs: 800000
  },
  'marketing': {
    occupation: 'Marketing Specialist',
    medianSalary: 65000,
    percentile25: 50000,
    percentile75: 85000,
    percentile90: 110000,
    growthRate: 10,
    totalJobs: 600000
  },
  'healthcare': {
    occupation: 'Healthcare Professional',
    medianSalary: 75000,
    percentile25: 55000,
    percentile75: 100000,
    percentile90: 130000,
    growthRate: 15,
    totalJobs: 1200000
  },
  'finance': {
    occupation: 'Financial Analyst',
    medianSalary: 95000,
    percentile25: 70000,
    percentile75: 125000,
    percentile90: 160000,
    growthRate: 9,
    totalJobs: 500000
  },
  'engineering': {
    occupation: 'Engineer',
    medianSalary: 100000,
    percentile25: 75000,
    percentile75: 130000,
    percentile90: 160000,
    growthRate: 7,
    totalJobs: 700000
  },
  'default': {
    occupation: 'Professional',
    medianSalary: 70000,
    percentile25: 50000,
    percentile75: 95000,
    percentile90: 120000,
    growthRate: 8,
    totalJobs: 500000
  }
};

// Skill premium multipliers (percent salary boost)
const SKILL_PREMIUMS: Record<string, number> = {
  // Technical skills
  'python': 8,
  'javascript': 6,
  'typescript': 7,
  'react': 7,
  'machine learning': 15,
  'artificial intelligence': 18,
  'data science': 12,
  'cloud computing': 10,
  'aws': 10,
  'azure': 9,
  'kubernetes': 12,
  'docker': 8,
  'sql': 5,
  'data analysis': 8,
  'cybersecurity': 14,
  'blockchain': 10,
  
  // Business skills
  'project management': 8,
  'agile': 6,
  'scrum': 5,
  'product management': 10,
  'strategic planning': 7,
  'business development': 8,
  'stakeholder management': 6,
  
  // Soft skills
  'leadership': 10,
  'communication': 5,
  'problem solving': 6,
  'critical thinking': 5,
  'teamwork': 4,
  'presentation': 5,
  'negotiation': 7
};

function detectOccupationCategory(skills: string[], sector: string, title: string): string {
  const lowerSector = sector?.toLowerCase() || '';
  const lowerTitle = title?.toLowerCase() || '';
  const skillsText = skills.join(' ').toLowerCase();
  
  if (skillsText.includes('machine learning') || skillsText.includes('data science') || 
      skillsText.includes('python') || lowerTitle.includes('data')) {
    return 'data_analyst';
  }
  if (skillsText.includes('react') || skillsText.includes('javascript') || 
      skillsText.includes('software') || lowerSector.includes('technology')) {
    return 'software_engineer';
  }
  if (lowerSector.includes('finance') || lowerSector.includes('banking')) {
    return 'finance';
  }
  if (lowerSector.includes('healthcare') || lowerSector.includes('medical')) {
    return 'healthcare';
  }
  if (lowerSector.includes('marketing') || lowerTitle.includes('marketing')) {
    return 'marketing';
  }
  if (skillsText.includes('business') || lowerTitle.includes('business')) {
    return 'business_analyst';
  }
  if (lowerSector.includes('engineer') || lowerTitle.includes('engineer')) {
    return 'engineering';
  }
  
  return 'default';
}

function calculateSkillPremiums(skills: string[]): SkillPremium[] {
  const premiums: SkillPremium[] = [];
  
  for (const skill of skills) {
    const lowerSkill = skill.toLowerCase();
    
    // Check for direct match or partial match
    let premiumPercent = 0;
    
    for (const [key, value] of Object.entries(SKILL_PREMIUMS)) {
      if (lowerSkill.includes(key) || key.includes(lowerSkill)) {
        if (value > premiumPercent) {
          premiumPercent = value;
        }
      }
    }
    
    if (premiumPercent > 0) {
      premiums.push({
        skill: skill,
        premiumPercent,
        demandScore: Math.min(100, premiumPercent * 6 + Math.random() * 20),
        marketValue: premiumPercent >= 10 ? 'High' : premiumPercent >= 6 ? 'Medium' : 'Standard'
      });
    } else {
      // Default premium for unrecognized skills
      premiums.push({
        skill: skill,
        premiumPercent: 3,
        demandScore: 50 + Math.random() * 20,
        marketValue: 'Standard'
      });
    }
  }
  
  // Sort by premium value
  return premiums.sort((a, b) => b.premiumPercent - a.premiumPercent);
}

/**
 * Generate signal-driven insights for faculty decision-making
 */
function generateSignalInsights(companyProfile: Record<string, unknown> | null): SignalInsights {
  if (!companyProfile) {
    return {
      partnershipReadiness: 50,
      hiringLikelihood: 'Unknown',
      fundingStability: 'No data available',
      decisionMakerAccess: 'Contact information not verified',
      overallRecommendation: 'Limited company data available - recommend manual verification'
    };
  }
  
  // Extract signal scores from company profile
  const skillMatchScore = (companyProfile.skill_match_score as number) || 0;
  const marketSignalScore = (companyProfile.market_signal_score as number) || 0;
  const departmentFitScore = (companyProfile.department_fit_score as number) || 0;
  const contactQualityScore = (companyProfile.contact_quality_score as number) || 0;
  const compositeScore = (companyProfile.composite_signal_score as number) || 0;
  
  // Calculate partnership readiness from composite or average
  const partnershipReadiness = compositeScore > 0 
    ? compositeScore 
    : Math.round((skillMatchScore + marketSignalScore + departmentFitScore + contactQualityScore) / 4);
  
  // Determine hiring likelihood from skill match + market signals
  let hiringLikelihood: string;
  const hiringScore = (skillMatchScore + marketSignalScore) / 2;
  if (hiringScore >= 60) {
    hiringLikelihood = 'High - Active job postings match course skills';
  } else if (hiringScore >= 40) {
    hiringLikelihood = 'Medium - Some relevant positions available';
  } else if (hiringScore > 0) {
    hiringLikelihood = 'Low - Limited matching opportunities';
  } else {
    hiringLikelihood = 'Unknown - No job data available';
  }
  
  // Determine funding stability from market intel + department fit
  let fundingStability: string;
  const stabilityScore = (marketSignalScore + departmentFitScore) / 2;
  if (stabilityScore >= 60) {
    fundingStability = 'Strong - Recent funding and growing team';
  } else if (stabilityScore >= 40) {
    fundingStability = 'Stable - Established operations';
  } else if (stabilityScore > 0) {
    fundingStability = 'Moderate - Limited growth signals';
  } else {
    fundingStability = 'No funding data available';
  }
  
  // Determine decision-maker access from contact quality
  let decisionMakerAccess: string;
  if (contactQualityScore >= 60) {
    decisionMakerAccess = 'Excellent - Multiple senior contacts identified';
  } else if (contactQualityScore >= 40) {
    decisionMakerAccess = 'Good - Decision-makers available';
  } else if (contactQualityScore > 0) {
    decisionMakerAccess = 'Limited - May require outreach effort';
  } else {
    decisionMakerAccess = 'Unknown - Contact verification needed';
  }
  
  // Generate overall recommendation
  let overallRecommendation: string;
  if (partnershipReadiness >= 70) {
    overallRecommendation = '✅ Highly Recommended - Strong signals across all dimensions';
  } else if (partnershipReadiness >= 50) {
    overallRecommendation = '👍 Recommended - Good partnership potential with some gaps';
  } else if (partnershipReadiness >= 30) {
    overallRecommendation = '⚠️ Proceed with Caution - Limited data or weak signals';
  } else {
    overallRecommendation = '❓ Needs Review - Insufficient data for recommendation';
  }
  
  return {
    partnershipReadiness,
    hiringLikelihood,
    fundingStability,
    decisionMakerAccess,
    overallRecommendation
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify JWT authentication
  const authResult = await verifyAuth(req);
  if (!authResult.authenticated) {
    console.warn('[salary-roi-calculator] Auth failed:', authResult.error);
    return unauthorizedResponse(corsHeaders, authResult.error);
  }
  console.log(`[salary-roi-calculator] Authenticated user: ${authResult.userId}`);

  try {
    const { projectId } = await req.json();
    
    if (!projectId) {
      return new Response(
        JSON.stringify({ error: 'projectId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`\n💰 [Salary ROI Calculator] Starting for project: ${projectId}`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Fetch project with company profile (including signal scores)
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        *,
        company_profiles!projects_company_profile_id_fkey (
          *,
          skill_match_score,
          market_signal_score,
          department_fit_score,
          contact_quality_score,
          composite_signal_score,
          signal_confidence,
          signal_data
        ),
        course_profiles!projects_course_id_fkey (*)
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
    console.log(`   🏢 Company: ${project.company_name} (${project.sector})`);
    
    // Extract company profile for signal insights
    const companyProfile = project.company_profiles as Record<string, unknown> | null;
    
    // Log signal scores if available
    if (companyProfile?.composite_signal_score) {
      console.log(`   📈 Signal scores available:`);
      console.log(`      Skill Match: ${companyProfile.skill_match_score}`);
      console.log(`      Market Intel: ${companyProfile.market_signal_score}`);
      console.log(`      Dept Fit: ${companyProfile.department_fit_score}`);
      console.log(`      Contact Quality: ${companyProfile.contact_quality_score}`);
      console.log(`      Composite: ${companyProfile.composite_signal_score}`);
    }
    
    // Extract skills from project
    const projectSkills: string[] = [];
    if (project.skills) {
      if (Array.isArray(project.skills)) {
        projectSkills.push(...project.skills.map((s: unknown) => 
          typeof s === 'string' ? s : (s as Record<string, string>)?.name || (s as Record<string, string>)?.skill || ''
        ).filter(Boolean));
      }
    }
    
    // Also extract from deliverables
    if (project.deliverables && Array.isArray(project.deliverables)) {
      for (const d of project.deliverables) {
        const text = typeof d === 'string' ? d : (d as Record<string, string>)?.title || (d as Record<string, string>)?.name || '';
        if (text.toLowerCase().includes('python')) projectSkills.push('Python');
        if (text.toLowerCase().includes('data')) projectSkills.push('Data Analysis');
        if (text.toLowerCase().includes('machine learning')) projectSkills.push('Machine Learning');
        if (text.toLowerCase().includes('dashboard')) projectSkills.push('Data Visualization');
        if (text.toLowerCase().includes('api')) projectSkills.push('API Development');
      }
    }
    
    // Deduplicate skills
    const uniqueSkills = [...new Set(projectSkills)].slice(0, 10);
    console.log(`   🎯 Skills identified: ${uniqueSkills.length}`);
    
    // Determine occupation category
    const occupationCategory = detectOccupationCategory(
      uniqueSkills, 
      project.sector || '', 
      project.title || ''
    );
    console.log(`   👔 Occupation category: ${occupationCategory}`);
    
    // Use fallback salary data (Lightcast deprecated)
    const salaryData = FALLBACK_SALARY_DATA[occupationCategory] || FALLBACK_SALARY_DATA['default'];
    console.log(`   📈 Using salary data for: ${salaryData.occupation}`);
    
    // Calculate skill premiums
    const skillPremiums = calculateSkillPremiums(uniqueSkills);
    console.log(`   💎 Skill premiums calculated: ${skillPremiums.length} skills`);
    
    // Generate signal-driven insights for faculty
    const signalInsights = generateSignalInsights(companyProfile);
    console.log(`   🎯 Partnership readiness: ${signalInsights.partnershipReadiness}%`);
    
    // Calculate total salary boost from project skills
    const totalPremiumPercent = skillPremiums.reduce((sum, sp) => sum + sp.premiumPercent, 0);
    // Apply diminishing returns for multiple skills (cap at 35%)
    let effectiveBoost = Math.min(35, totalPremiumPercent * 0.7);
    
    // Boost salary projection if signal scores are strong (partnership likely to lead to job)
    if (signalInsights.partnershipReadiness >= 70) {
      effectiveBoost = Math.min(40, effectiveBoost * 1.15); // 15% boost for strong signals
      console.log(`   ⬆️ Boosted projection due to strong signals`);
    } else if (signalInsights.partnershipReadiness >= 50) {
      effectiveBoost = Math.min(38, effectiveBoost * 1.08); // 8% boost for good signals
    }
    
    // Calculate ROI
    const currentSalaryEstimate = salaryData.percentile25; // Entry-level
    const projectedSalaryWithSkills = Math.round(
      salaryData.medianSalary * (1 + effectiveBoost / 100)
    );
    const annualValueGain = projectedSalaryWithSkills - currentSalaryEstimate;
    const fiveYearValueGain = annualValueGain * 5 + 
      Math.round(annualValueGain * 0.03 * 5 * 2.5); // With 3% annual raises
    
    // Determine career acceleration tier
    let careerAcceleration: string;
    if (effectiveBoost >= 25) {
      careerAcceleration = 'Exceptional - Leapfrog 2-3 years of experience';
    } else if (effectiveBoost >= 15) {
      careerAcceleration = 'Strong - Equivalent to 1-2 years additional experience';
    } else if (effectiveBoost >= 8) {
      careerAcceleration = 'Solid - Meaningful career advantage';
    } else {
      careerAcceleration = 'Foundation - Good starting point for growth';
    }
    
    // Calculate confidence based on data availability
    let confidence = 0.7; // Base confidence
    if (companyProfile?.composite_signal_score) {
      confidence += 0.15; // Boost if we have signal data
    }
    if (salaryData.occupation !== 'Professional') {
      confidence += 0.1; // Boost if we matched a specific occupation
    }
    confidence = Math.min(0.95, confidence);
    
    const roiResult: ROICalculation = {
      currentSalaryEstimate,
      projectedSalaryWithSkills,
      salaryBoostPercent: Math.round(effectiveBoost * 10) / 10,
      annualValueGain,
      fiveYearValueGain,
      careerAcceleration,
      skillPremiums: skillPremiums.slice(0, 6), // Top 6 skills
      occupationData: salaryData,
      signalInsights,
      confidence,
      calculatedAt: new Date().toISOString()
    };
    
    console.log(`   ✅ ROI calculated:`);
    console.log(`      Current estimate: $${currentSalaryEstimate.toLocaleString()}`);
    console.log(`      Projected: $${projectedSalaryWithSkills.toLocaleString()}`);
    console.log(`      Boost: ${effectiveBoost.toFixed(1)}%`);
    console.log(`      5-year gain: $${fiveYearValueGain.toLocaleString()}`);
    console.log(`      Recommendation: ${signalInsights.overallRecommendation}`);
    
    // Store in project_metadata
    const { error: updateError } = await supabase
      .from('project_metadata')
      .upsert({
        project_id: projectId,
        estimated_roi: roiResult
      }, { onConflict: 'project_id' });
    
    if (updateError) {
      console.error('Failed to store ROI data:', updateError);
    } else {
      console.log(`   💾 ROI data stored in project_metadata`);
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        data: roiResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Salary ROI Calculator error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
