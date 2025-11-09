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
 * Extract specific "wow factor" skills directly from project content
 * This function captures exact frameworks, tools, and methodologies without downgrading to generic terms
 */
function extractRequiredSkills(tasks: any, deliverables: any): string[] {
  const skills = new Set<string>();

  try {
    // Patterns to match specific frameworks, tools, and methodologies
    const patterns = [
      // Strategic frameworks
      /PESTEL\s+Analysis/gi,
      /Porter'?s\s+Five\s+Forces/gi,
      /SWOT\s+Analysis/gi,
      /Ansoff\s+Matrix/gi,
      /BCG\s+Matrix/gi,
      /Value\s+Chain\s+Analysis/gi,
      /Blue\s+Ocean\s+Strategy/gi,
      /Balanced\s+Scorecard/gi,
      
      // Business analysis frameworks
      /Competitive\s+Intelligence\s+Matrix/gi,
      /Market\s+Sizing\s+Model/gi,
      /Business\s+Model\s+Canvas/gi,
      /Lean\s+Canvas/gi,
      /Customer\s+Journey\s+Map/gi,
      /Stakeholder\s+Analysis/gi,
      /Gap\s+Analysis/gi,
      /Risk\s+Assessment\s+Matrix/gi,
      
      // Research & data tools
      /Qualtrics/gi,
      /Survey\s+Design/gi,
      /Focus\s+Group\s+Facilitation/gi,
      /A\/B\s+Testing/gi,
      /Statistical\s+Analysis/gi,
      /Regression\s+Analysis/gi,
      /Conjoint\s+Analysis/gi,
      
      // Process & operations
      /BPMN\s+(?:Diagrams?|Modeling)/gi,
      /Process\s+Mapping/gi,
      /Six\s+Sigma/gi,
      /Lean\s+Methodology/gi,
      /Kaizen/gi,
      /5S\s+Methodology/gi,
      
      // Financial frameworks
      /Financial\s+Modeling/gi,
      /DCF\s+Analysis/gi,
      /NPV\s+Calculation/gi,
      /Sensitivity\s+Analysis/gi,
      /Break-?even\s+Analysis/gi,
      /Cost-?Benefit\s+Analysis/gi,
      /ROI\s+Analysis/gi,
      
      // Design & UX
      /Design\s+Thinking/gi,
      /Wireframing/gi,
      /Prototyping/gi,
      /Usability\s+Testing/gi,
      /User\s+Persona\s+Development/gi,
      /Information\s+Architecture/gi,
      
      // Data visualization & reporting
      /KPI\s+Dashboard/gi,
      /Data\s+Visualization/gi,
      /Tableau/gi,
      /Power\s+BI/gi,
      /Excel\s+Modeling/gi,
      
      // Marketing frameworks
      /Marketing\s+Mix/gi,
      /4Ps\s+Framework/gi,
      /Customer\s+Segmentation/gi,
      /Positioning\s+Map/gi,
      /Brand\s+Architecture/gi,
      /Content\s+Strategy/gi,
      /SEO\s+Optimization/gi,
      /Social\s+Media\s+Strategy/gi,
      
      // Project management
      /Gantt\s+Chart/gi,
      /Agile\s+Methodology/gi,
      /Scrum\s+Framework/gi,
      /Kanban/gi,
      /Critical\s+Path\s+Analysis/gi,
      /Stakeholder\s+Mapping/gi,
    ];

    // Combine all text from tasks and deliverables
    const allText: string[] = [];
    
    if (Array.isArray(tasks)) {
      tasks.forEach((task: any) => {
        const taskText = typeof task === 'string' ? task : task?.description || '';
        if (taskText) allText.push(taskText);
      });
    }
    
    if (Array.isArray(deliverables)) {
      deliverables.forEach((deliverable: any) => {
        const deliverableText = typeof deliverable === 'string' ? deliverable : deliverable?.description || '';
        if (deliverableText) allText.push(deliverableText);
      });
    }

    // Extract matches from all text
    const combinedText = allText.join(' ');
    
    patterns.forEach(pattern => {
      const matches = combinedText.match(pattern);
      if (matches) {
        matches.forEach(match => {
          // Normalize spacing and capitalization
          const normalized = match
            .replace(/\s+/g, ' ')
            .trim()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
          skills.add(normalized);
        });
      }
    });

    // Also extract capitalized multi-word terms that look like specific skills/tools
    // (e.g., "Competitive Analysis Matrix", "Customer Retention Strategy")
    const capitalizedTermPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+(?:\s+(?:Analysis|Matrix|Model|Framework|Strategy|Methodology|Technique|Tool|Method|Approach|Diagram|Chart|Map|Canvas|Assessment)))\b/g;
    const capitalizedMatches = combinedText.match(capitalizedTermPattern);
    if (capitalizedMatches) {
      capitalizedMatches.forEach(match => {
        skills.add(match.trim());
      });
    }

    const extractedSkills = Array.from(skills);
    console.log(`Extracted ${extractedSkills.length} specific skills:`, extractedSkills);
    return extractedSkills.slice(0, 30); // Top 30 specific skills
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

  // Group projects by ACTUAL sector and region (no derivation/guessing)
  const signalGroups = new Map<string, ProjectWithCourse[]>();

  for (const project of projects as ProjectWithCourse[]) {
    // Use the actual sector field directly - no guessing/derivation
    const category = project.sector && project.sector.trim() !== '' 
      ? project.sector 
      : 'General Projects';
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
    // Return generic error message to prevent information leakage
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to aggregate demand signals. Please try again later."
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
