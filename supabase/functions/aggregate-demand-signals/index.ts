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

interface CourseProfile {
  id: string;
  title: string;
  level: string;
  city_zip: string;
  artifacts: any;
  outcomes: any;
  hrs_per_week: number;
  weeks: number;
  owner_id: string;
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
 * Derive project category using Google Cloud Natural Language API
 */
async function deriveProjectCategory(title: string, artifacts: any): Promise<string> {
  if (!GOOGLE_API_KEY) {
    console.error("Google API key not configured");
    return "General Projects";
  }

  try {
    // Combine title and artifacts for richer context
    const artifactText = Array.isArray(artifacts) 
      ? artifacts.join(". ") 
      : (typeof artifacts === 'string' ? artifacts : JSON.stringify(artifacts));
    
    const contentText = `${title}. ${artifactText}`.substring(0, 1000); // Limit to 1000 chars

    const response = await fetch(`${GOOGLE_NLP_ENDPOINT}?key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document: {
          type: 'PLAIN_TEXT',
          content: contentText,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google NLP API error:", response.status, errorText);
      return "General Projects";
    }

    const data = await response.json();
    
    // Google returns categories like "/Business & Industrial/Business Operations"
    // Extract the top-level category
    if (data.categories && data.categories.length > 0) {
      const topCategory = data.categories[0].name;
      // Clean up the category path (e.g., "/Business & Industrial" -> "Business & Industrial")
      const cleaned = topCategory.split('/').filter((c: string) => c)[0];
      console.log(`Category derived: ${cleaned} (confidence: ${data.categories[0].confidence})`);
      return cleaned || "General Projects";
    }

    return "General Projects";
  } catch (error) {
    console.error("Error calling Google NLP API:", error);
    return "General Projects";
  }
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
 * Extract required skills from course outcomes
 */
function extractRequiredSkills(outcomes: any): string[] {
  if (!outcomes) return [];

  try {
    const outcomesArray = Array.isArray(outcomes) ? outcomes : [outcomes];
    const skills = outcomesArray
      .flatMap((outcome: any) => {
        if (typeof outcome === 'string') return [outcome];
        if (outcome?.skill) return [outcome.skill];
        if (outcome?.outcome) return [outcome.outcome];
        return [];
      })
      .filter((skill: string) => skill && skill.length > 0)
      .map((skill: string) => skill.substring(0, 100)); // Limit length

    return [...new Set(skills)]; // Deduplicate
  } catch (error) {
    console.error("Error extracting skills:", error);
    return [];
  }
}

/**
 * Main aggregation logic
 */
async function aggregateDemandSignals(supabaseClient: any) {
  console.log("Starting demand signals aggregation...");

  // Fetch all active course profiles
  const { data: courses, error: coursesError } = await supabaseClient
    .from('course_profiles')
    .select('*');

  if (coursesError) {
    throw new Error(`Failed to fetch courses: ${coursesError.message}`);
  }

  if (!courses || courses.length === 0) {
    console.log("No courses found to aggregate");
    return { aggregated: 0 };
  }

  console.log(`Found ${courses.length} courses to aggregate`);

  // Group courses by similarity (category + region)
  const signalGroups = new Map<string, CourseProfile[]>();

  for (const course of courses) {
    const category = await deriveProjectCategory(course.title, course.artifacts);
    const region = await deriveGeographicRegion(course.city_zip);
    const key = `${category}|${region}`;

    if (!signalGroups.has(key)) {
      signalGroups.set(key, []);
    }
    signalGroups.get(key)!.push(course);
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
  
  for (const [key, groupCourses] of signalGroups.entries()) {
    const [category, region] = key.split('|');

    // Aggregate metrics (privacy-preserving)
    const uniqueOwners = new Set(groupCourses.map(c => c.owner_id));
    const allSkills = groupCourses.flatMap(c => extractRequiredSkills(c.outcomes));
    const uniqueSkills = [...new Set(allSkills)];

    // Calculate level distribution
    const levelCounts: Record<string, number> = {};
    groupCourses.forEach(c => {
      levelCounts[c.level] = (levelCounts[c.level] || 0) + 1;
    });

    // Calculate typical duration
    const avgDuration = Math.round(
      groupCourses.reduce((sum, c) => sum + c.weeks, 0) / groupCourses.length
    );

    const signal: DemandSignal = {
      project_category: category,
      industry_sector: null, // Could derive from category or NLP
      required_skills: uniqueSkills.slice(0, 20), // Top 20 skills
      geographic_region: region,
      student_count: groupCourses.length, // Proxy: 1 course ≈ 1+ students
      course_count: groupCourses.length,
      institution_count: uniqueOwners.size,
      earliest_start_date: null, // Would need course start dates
      latest_start_date: null,
      typical_duration_weeks: avgDuration,
      student_level_distribution: levelCounts,
      institution_types: { "Higher Education": uniqueOwners.size }, // Simplified
    };

    const { error: insertError } = await supabaseClient
      .from('demand_signals')
      .insert(signal);

    if (insertError) {
      console.error(`Failed to insert signal for ${key}:`, insertError);
    } else {
      createdCount++;
      console.log(`Created signal: ${category} in ${region} (${signal.course_count} courses)`);
    }
  }

  console.log(`Aggregation complete. Created ${createdCount} demand signals.`);
  return { aggregated: createdCount };
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
