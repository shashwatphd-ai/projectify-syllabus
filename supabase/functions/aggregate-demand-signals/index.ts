import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Google Cloud API Configuration
const GOOGLE_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
const GOOGLE_NLP_ENDPOINT = "https://language.googleapis.com/v1/documents:classifyText";
const GOOGLE_GEOCODING_ENDPOINT = "https://maps.googleapis.com/maps/api/geocode/json";

interface ProjectWithCourse {
  id: string;
  title: string;
  sector: string;
  tasks: any;
  deliverables: any;
  duration_weeks: number;
  status: string;
  course_profiles: {
    city_zip: string;
    level: string;
    owner_id: string;
  };
}

interface DemandSignal {
  project_category: string;
  industry_sector: string | null;
  required_skills: string[];
  geographic_region: string;
  student_count: number;
  course_count: number;
  institution_count: number;
  earliest_start_date: string | null;
  latest_start_date: string | null;
  typical_duration_weeks: number;
  student_level_distribution: any;
  institution_types: any;
}

/**
 * Derive project category from sector or title
 */
function deriveProjectCategory(sector: string, title: string): string {
  if (sector && sector.trim() !== '') {
    return sector;
  }
  
  // Fallback to extracting from title if no sector
  if (title.toLowerCase().includes('marketing')) return 'Marketing';
  if (title.toLowerCase().includes('software') || title.toLowerCase().includes('development')) return 'Software Development';
  if (title.toLowerCase().includes('data') || title.toLowerCase().includes('analytics')) return 'Data Analytics';
  if (title.toLowerCase().includes('design')) return 'Design';
  if (title.toLowerCase().includes('finance')) return 'Finance';
  
  return 'General Projects';
}

/**
 * Derive standardized geographic region using Google Geocoding API
 */
async function deriveGeographicRegion(cityZip: string): Promise<string> {
  if (!GOOGLE_API_KEY) {
    console.error("Google API key not configured");
    return "Unknown Region";
  }

  if (!cityZip || cityZip.trim() === '') {
    return "Unknown Region";
  }

  try {
    const response = await fetch(
      `${GOOGLE_GEOCODING_ENDPOINT}?address=${encodeURIComponent(cityZip)}&key=${GOOGLE_API_KEY}`
    );

    if (!response.ok) {
      console.error("Google Geocoding API error:", response.status);
      return cityZip; // Fallback to raw input
    }

    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.warn(`Geocoding failed for "${cityZip}": ${data.status}`);
      return cityZip;
    }

    // Extract structured location data
    const result = data.results[0];
    const components = result.address_components;

    let locality = '';
    let adminArea = '';
    let country = '';

    for (const component of components) {
      if (component.types.includes('locality')) {
        locality = component.long_name;
      } else if (component.types.includes('administrative_area_level_1')) {
        adminArea = component.short_name; // e.g., "CA" instead of "California"
      } else if (component.types.includes('country')) {
        country = component.short_name; // e.g., "US" instead of "United States"
      }
    }

    // Build standardized region string
    const parts = [locality, adminArea, country].filter(p => p);
    const region = parts.join(', ');
    
    console.log(`Geocoded "${cityZip}" -> "${region}"`);
    return region || cityZip;
  } catch (error) {
    console.error("Error calling Google Geocoding API:", error);
    return cityZip;
  }
}

/**
 * Extract meaningful skills from actual project tasks and deliverables
 * This function parses real project content to derive concrete skills
 */
function extractRequiredSkills(tasks: any, deliverables: any): string[] {
  const skills = new Set<string>();

  try {
    // Skill inference mappings based on real project content
    const skillMappings: Record<string, string[]> = {
      // Analysis & Research
      'analysis': ['Data Analysis', 'Research', 'Critical Thinking'],
      'research': ['Market Research', 'Data Collection', 'Analysis'],
      'discovery': ['Discovery', 'Stakeholder Interviews', 'User Research'],
      'market': ['Market Analysis', 'Competitive Analysis', 'Industry Research'],
      'competitive': ['Competitive Intelligence', 'Strategic Analysis'],
      'feasibility': ['Feasibility Analysis', 'Risk Assessment', 'Business Analysis'],
      
      // Strategic & Planning
      'strategy': ['Strategic Planning', 'Business Strategy', 'Strategic Thinking'],
      'plan': ['Project Planning', 'Strategic Planning', 'Roadmap Development'],
      'roadmap': ['Strategic Roadmapping', 'Product Planning', 'Timeline Management'],
      'scope': ['Scope Definition', 'Requirements Gathering', 'Project Management'],
      'charter': ['Project Charter', 'Stakeholder Alignment', 'Goal Setting'],
      
      // Documentation & Reporting
      'report': ['Report Writing', 'Business Writing', 'Documentation'],
      'documentation': ['Technical Documentation', 'Process Documentation', 'Writing'],
      'memo': ['Business Communication', 'Executive Communication', 'Writing'],
      'presentation': ['Presentation Skills', 'Public Speaking', 'PowerPoint/Keynote'],
      'deck': ['Presentation Design', 'Visual Communication', 'Storytelling'],
      'executive': ['Executive Communication', 'C-Suite Presentation', 'Business Acumen'],
      
      // Design & Creative
      'design': ['Design Thinking', 'Visual Design', 'Creative Problem Solving'],
      'prototype': ['Prototyping', 'Rapid Iteration', 'User Testing'],
      'mockup': ['UI/UX Design', 'Wireframing', 'Visual Design'],
      'wireframe': ['UX Design', 'Information Architecture', 'User Flows'],
      'brand': ['Brand Strategy', 'Brand Development', 'Marketing'],
      
      // Development & Technical
      'development': ['Software Development', 'Programming', 'Technical Implementation'],
      'implementation': ['Project Implementation', 'Technical Execution', 'Deployment'],
      'testing': ['Quality Assurance', 'Testing', 'Validation'],
      'integration': ['Systems Integration', 'API Development', 'Technical Integration'],
      'optimization': ['Process Optimization', 'Performance Tuning', 'Efficiency Analysis'],
      
      // Business Operations
      'workflow': ['Process Design', 'Workflow Optimization', 'Operations'],
      'process': ['Process Improvement', 'Operations Management', 'Efficiency'],
      'efficiency': ['Process Optimization', 'Lean Methodology', 'Continuous Improvement'],
      'automation': ['Process Automation', 'Technology Implementation', 'Efficiency'],
      
      // Marketing & Communications
      'marketing': ['Marketing Strategy', 'Digital Marketing', 'Brand Management'],
      'campaign': ['Campaign Management', 'Marketing Execution', 'Analytics'],
      'content': ['Content Strategy', 'Content Creation', 'Copywriting'],
      'social': ['Social Media Marketing', 'Community Management', 'Digital Engagement'],
      'seo': ['SEO', 'Digital Marketing', 'Analytics'],
      
      // Financial & Metrics
      'financial': ['Financial Analysis', 'Budgeting', 'Financial Modeling'],
      'budget': ['Budget Management', 'Financial Planning', 'Cost Analysis'],
      'roi': ['ROI Analysis', 'Financial Metrics', 'Business Case Development'],
      'metrics': ['Metrics & KPIs', 'Data Analytics', 'Performance Measurement'],
      'dashboard': ['Data Visualization', 'Dashboard Design', 'Reporting'],
      
      // Project Management
      'timeline': ['Timeline Management', 'Project Scheduling', 'Planning'],
      'milestone': ['Milestone Planning', 'Project Management', 'Progress Tracking'],
      'stakeholder': ['Stakeholder Management', 'Relationship Building', 'Communication'],
      'coordination': ['Cross-Functional Coordination', 'Team Collaboration', 'Project Management'],
      
      // Collaboration & Soft Skills
      'workshop': ['Workshop Facilitation', 'Group Facilitation', 'Collaboration'],
      'collaboration': ['Team Collaboration', 'Cross-Functional Teamwork', 'Communication'],
      'interview': ['Interviewing', 'Qualitative Research', 'Communication'],
      'synthesis': ['Synthesis', 'Critical Thinking', 'Problem Solving'],
      'recommendations': ['Strategic Recommendations', 'Business Advisory', 'Consulting'],
    };

    // Process tasks
    if (Array.isArray(tasks)) {
      tasks.forEach((task: any) => {
        const taskText = typeof task === 'string' ? task : task?.description || '';
        if (taskText) {
          const taskLower = taskText.toLowerCase();
          
          // Check against skill mappings
          Object.entries(skillMappings).forEach(([keyword, relatedSkills]) => {
            if (taskLower.includes(keyword)) {
              relatedSkills.forEach(skill => skills.add(skill));
            }
          });
        }
      });
    }

    // Process deliverables
    if (Array.isArray(deliverables)) {
      deliverables.forEach((deliverable: any) => {
        const deliverableText = typeof deliverable === 'string' ? deliverable : deliverable?.description || '';
        if (deliverableText) {
          const deliverableLower = deliverableText.toLowerCase();
          
          // Check against skill mappings
          Object.entries(skillMappings).forEach(([keyword, relatedSkills]) => {
            if (deliverableLower.includes(keyword)) {
              relatedSkills.forEach(skill => skills.add(skill));
            }
          });
        }
      });
    }

    const extractedSkills = Array.from(skills);
    console.log(`Extracted ${extractedSkills.length} skills from project content`);
    return extractedSkills.slice(0, 30); // Increased to 30 to capture more real skills
  } catch (error) {
    console.error("Error extracting skills:", error);
    return [];
  }
}

/**
 * Main aggregation logic - NOW READS FROM PROJECTS TABLE
 */
async function aggregateDemandSignals(supabaseClient: any) {
  console.log("Starting demand signals aggregation from PROJECTS table...");

  // Fetch all AI-generated and curated projects with course profile data
  const { data: projects, error: projectsError } = await supabaseClient
    .from('projects')
    .select(`
      id,
      title,
      sector,
      tasks,
      deliverables,
      duration_weeks,
      status,
      course_profiles!inner (
        city_zip,
        level,
        owner_id
      )
    `)
    .in('status', ['ai_shell', 'curated_live']);

  if (projectsError) {
    console.error("Failed to fetch projects:", projectsError);
    throw new Error(`Failed to fetch projects: ${projectsError.message}`);
  }

  if (!projects || projects.length === 0) {
    console.log("No projects found to aggregate");
    return { aggregated: 0 };
  }

  console.log(`Found ${projects.length} projects to aggregate`);

  // Group projects by category and region
  const signalGroups = new Map<string, ProjectWithCourse[]>();

  for (const project of projects as ProjectWithCourse[]) {
    const category = deriveProjectCategory(project.sector, project.title);
    const region = await deriveGeographicRegion(project.course_profiles.city_zip);
    const key = `${category}|${region}`;

    if (!signalGroups.has(key)) {
      signalGroups.set(key, []);
    }
    signalGroups.get(key)!.push(project);
  }

  console.log(`Grouped into ${signalGroups.size} demand signals`);

  // Deactivate all existing signals (we're rebuilding fresh)
  const { error: deactivateError } = await supabaseClient
    .from('demand_signals')
    .update({ is_active: false })
    .eq('is_active', true);

  if (deactivateError) {
    console.error("Failed to deactivate old signals:", deactivateError);
  }

  // Create new aggregated signals
  let createdCount = 0;
  
  for (const [key, groupProjects] of signalGroups.entries()) {
    const [category, region] = key.split('|');

    // Aggregate metrics from real projects
    const uniqueOwners = new Set(groupProjects.map(p => p.course_profiles.owner_id));
    const allSkills = groupProjects.flatMap(p => extractRequiredSkills(p.tasks, p.deliverables));
    const uniqueSkills = [...new Set(allSkills)];

    // Calculate level distribution
    const levelCounts: Record<string, number> = {};
    groupProjects.forEach(p => {
      const level = p.course_profiles.level;
      levelCounts[level] = (levelCounts[level] || 0) + 1;
    });

    // Calculate typical duration
    const avgDuration = Math.round(
      groupProjects.reduce((sum, p) => sum + p.duration_weeks, 0) / groupProjects.length
    );

    const signal: DemandSignal = {
      project_category: category,
      industry_sector: category, // Use category as sector
      required_skills: uniqueSkills.slice(0, 20), // Top 20 real skills from projects
      geographic_region: region,
      student_count: groupProjects.length, // Each project represents student demand
      course_count: groupProjects.length,
      institution_count: uniqueOwners.size,
      earliest_start_date: null,
      latest_start_date: null,
      typical_duration_weeks: avgDuration,
      student_level_distribution: levelCounts,
      institution_types: { "Higher Education": uniqueOwners.size },
    };

    const { error: insertError } = await supabaseClient
      .from('demand_signals')
      .insert(signal);

    if (insertError) {
      console.error(`Failed to insert signal for ${key}:`, insertError);
    } else {
      createdCount++;
      console.log(`✅ Created signal: ${category} in ${region} (${signal.course_count} projects, ${uniqueSkills.length} skills)`);
    }
  }

  console.log(`🎉 Aggregation complete. Created ${createdCount} demand signals from ${projects.length} projects.`);
  return { aggregated: createdCount, total_projects: projects.length };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Execute aggregation
    const result = await aggregateDemandSignals(supabaseClient);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Demand signals aggregated successfully",
        ...result
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error in aggregate-demand-signals:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
