import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Salary ROI Calculator Edge Function
 * 
 * Calculates the return on investment for student projects using:
 * - Lightcast salary data for occupations
 * - Project skills and learning outcomes
 * - Industry benchmarks and market data
 * 
 * Returns salary projections, skill value, and career impact metrics.
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

interface ROICalculation {
  currentSalaryEstimate: number;
  projectedSalaryWithSkills: number;
  salaryBoostPercent: number;
  annualValueGain: number;
  fiveYearValueGain: number;
  careerAcceleration: string;
  skillPremiums: SkillPremium[];
  occupationData: SalaryData;
  confidence: number;
  calculatedAt: string;
}

// Fallback salary data by industry/occupation (when Lightcast unavailable)
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
    let matchedSkill = '';
    
    for (const [key, value] of Object.entries(SKILL_PREMIUMS)) {
      if (lowerSkill.includes(key) || key.includes(lowerSkill)) {
        if (value > premiumPercent) {
          premiumPercent = value;
          matchedSkill = key;
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

async function fetchLightcastSalaryData(occupation: string): Promise<SalaryData | null> {
  const apiKey = Deno.env.get('LIGHTCAST_API_KEY');
  
  if (!apiKey) {
    console.log('⚠️ LIGHTCAST_API_KEY not configured - using fallback data');
    return null;
  }
  
  try {
    // Lightcast Career Coach API for salary data
    const response = await fetch('https://emsiservices.com/titles/versions/latest/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: occupation,
        limit: 1
      })
    });
    
    if (!response.ok) {
      console.error(`Lightcast API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      const titleData = data.data[0];
      
      // Fetch salary data for this title
      const salaryResponse = await fetch(
        `https://emsiservices.com/titles/versions/latest/titles/${titleData.id}/salary`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          }
        }
      );
      
      if (salaryResponse.ok) {
        const salaryData = await salaryResponse.json();
        
        return {
          occupation: titleData.name,
          medianSalary: salaryData.data?.median || 70000,
          percentile25: salaryData.data?.percentile25 || 50000,
          percentile75: salaryData.data?.percentile75 || 95000,
          percentile90: salaryData.data?.percentile90 || 120000,
          growthRate: salaryData.data?.projectedGrowth || 8,
          totalJobs: salaryData.data?.totalJobs || 100000
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Lightcast API error:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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
    
    // Fetch project with company profile
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        *,
        company_profiles!projects_company_profile_id_fkey (*),
        course_profiles!projects_course_id_fkey (*)
      `)
      .eq('id', projectId)
      .single();
    
    if (projectError || !project) {
      console.error('Project fetch error:', projectError);
      return new Response(
        JSON.stringify({ error: 'Project not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`   📊 Project: ${project.title}`);
    console.log(`   🏢 Company: ${project.company_name} (${project.sector})`);
    
    // Extract skills from project
    const projectSkills: string[] = [];
    if (project.skills) {
      if (Array.isArray(project.skills)) {
        projectSkills.push(...project.skills.map((s: any) => typeof s === 'string' ? s : s.name || s.skill));
      }
    }
    
    // Also extract from deliverables
    if (project.deliverables && Array.isArray(project.deliverables)) {
      for (const d of project.deliverables) {
        const text = typeof d === 'string' ? d : d.title || d.name || '';
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
    
    // Try Lightcast first, fall back to static data
    let salaryData = await fetchLightcastSalaryData(occupationCategory);
    
    if (!salaryData) {
      salaryData = FALLBACK_SALARY_DATA[occupationCategory] || FALLBACK_SALARY_DATA['default'];
      console.log(`   📈 Using fallback salary data for: ${salaryData.occupation}`);
    } else {
      console.log(`   📈 Lightcast salary data retrieved for: ${salaryData.occupation}`);
    }
    
    // Calculate skill premiums
    const skillPremiums = calculateSkillPremiums(uniqueSkills);
    console.log(`   💎 Skill premiums calculated: ${skillPremiums.length} skills`);
    
    // Calculate total salary boost from project skills
    const totalPremiumPercent = skillPremiums.reduce((sum, sp) => sum + sp.premiumPercent, 0);
    // Apply diminishing returns for multiple skills (cap at 35%)
    const effectiveBoost = Math.min(35, totalPremiumPercent * 0.7);
    
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
    
    const roiResult: ROICalculation = {
      currentSalaryEstimate,
      projectedSalaryWithSkills,
      salaryBoostPercent: Math.round(effectiveBoost * 10) / 10,
      annualValueGain,
      fiveYearValueGain,
      careerAcceleration,
      skillPremiums: skillPremiums.slice(0, 6), // Top 6 skills
      occupationData: salaryData,
      confidence: salaryData.occupation === 'Professional' ? 0.6 : 0.85,
      calculatedAt: new Date().toISOString()
    };
    
    console.log(`   ✅ ROI calculated:`);
    console.log(`      Current estimate: $${currentSalaryEstimate.toLocaleString()}`);
    console.log(`      Projected: $${projectedSalaryWithSkills.toLocaleString()}`);
    console.log(`      Boost: ${effectiveBoost}%`);
    console.log(`      5-year gain: $${fiveYearValueGain.toLocaleString()}`);
    
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
