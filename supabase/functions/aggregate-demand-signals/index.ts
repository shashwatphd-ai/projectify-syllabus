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
 * Extract required skills from project tasks and deliverables
 */
function extractRequiredSkills(tasks: any, deliverables: any): string[] {
  const skills = new Set<string>();

  try {
    // Extract from tasks
    if (Array.isArray(tasks)) {
      tasks.forEach((task: any) => {
        if (typeof task === 'string') {
          // Extract skill keywords from task descriptions
          const skillKeywords = extractSkillKeywords(task);
          skillKeywords.forEach(skill => skills.add(skill));
        } else if (task?.description) {
          const skillKeywords = extractSkillKeywords(task.description);
          skillKeywords.forEach(skill => skills.add(skill));
        }
      });
    }

    // Extract from deliverables
    if (Array.isArray(deliverables)) {
      deliverables.forEach((deliverable: any) => {
        if (typeof deliverable === 'string') {
          const skillKeywords = extractSkillKeywords(deliverable);
          skillKeywords.forEach(skill => skills.add(skill));
        } else if (deliverable?.description) {
          const skillKeywords = extractSkillKeywords(deliverable.description);
          skillKeywords.forEach(skill => skills.add(skill));
        }
      });
    }

    return Array.from(skills).slice(0, 20); // Limit to top 20 skills
  } catch (error) {
    console.error("Error extracting skills:", error);
    return [];
  }
}

/**
 * Extract skill keywords from text
 */
function extractSkillKeywords(text: string): string[] {
  const skillPatterns = [
    /\b(Python|JavaScript|TypeScript|Java|C\+\+|React|Angular|Vue|Node\.js|SQL|NoSQL|MongoDB|PostgreSQL)\b/gi,
    /\b(HTML|CSS|Tailwind|Bootstrap|Git|Docker|Kubernetes|AWS|Azure|GCP)\b/gi,
    /\b(Machine Learning|AI|Data Analysis|Statistics|Excel|Tableau|Power BI)\b/gi,
    /\b(Project Management|Agile|Scrum|Leadership|Communication|Problem Solving)\b/gi,
    /\b(Marketing|SEO|Content Creation|Social Media|Graphic Design|UX\/UI Design)\b/gi,
    /\b(Testing|QA|CI\/CD|DevOps|Security|Networking|Cloud Computing)\b/gi,
  ];

  const skills = new Set<string>();
  skillPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => skills.add(match));
    }
  });

  return Array.from(skills);
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
