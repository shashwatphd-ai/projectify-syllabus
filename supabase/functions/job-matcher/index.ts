import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JobMatchRequest {
  student_id: string;
  skills: string[];
  competency_ids: string[];
}

interface ApolloJob {
  id: string;
  title: string;
  company_name?: string;
  url?: string;
  description?: string;
  skills?: string[];
  location?: string;
  [key: string]: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { student_id, skills, competency_ids }: JobMatchRequest = await req.json();
    
    if (!student_id || !skills || !Array.isArray(skills) || skills.length === 0) {
      return new Response(
        JSON.stringify({ error: 'student_id and skills array are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting job matching for student: ${student_id}`);
    console.log(`Skills to match: ${skills.join(', ')}`);

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step A: Query Apollo API for jobs matching these skills
    const APOLLO_API_KEY = Deno.env.get('APOLLO_API_KEY');
    if (!APOLLO_API_KEY) {
      throw new Error('APOLLO_API_KEY is not configured');
    }

    // Apollo Jobs API endpoint
    const apolloJobsUrl = 'https://api.apollo.io/v1/jobs/search';
    
    // Build search query from skills
    // We'll search for jobs that mention any of these skills in title or description
    const skillQuery = skills.join(' OR ');
    
    console.log(`Querying Apollo Jobs API with skills: ${skillQuery}`);

    const apolloResponse = await fetch(apolloJobsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': APOLLO_API_KEY,
      },
      body: JSON.stringify({
        q_keywords: skillQuery,
        page: 1,
        per_page: 10, // Limit to top 10 matches to avoid overwhelming students
        // Filter for active job postings
        job_posted_at_min: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // Last 90 days
      }),
    });

    if (!apolloResponse.ok) {
      const errorText = await apolloResponse.text();
      console.error('Apollo API error:', apolloResponse.status, errorText);
      
      if (apolloResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Apollo API rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (apolloResponse.status === 401 || apolloResponse.status === 403) {
        throw new Error('Apollo API authentication failed. Please check API key.');
      }
      
      throw new Error(`Apollo API request failed: ${errorText}`);
    }

    const apolloData = await apolloResponse.json();
    const jobs: ApolloJob[] = apolloData.jobs || [];
    
    console.log(`Found ${jobs.length} matching jobs from Apollo`);

    if (jobs.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No matching jobs found',
          student_id,
          skills,
          jobs_found: 0,
          matches_created: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step B: Insert job matches into database
    const matchesToInsert = [];
    
    for (const job of jobs) {
      // For each job, we'll link it to the first competency_id
      // (In a more sophisticated version, we could analyze which specific skill matched)
      const primaryCompetencyId = competency_ids && competency_ids.length > 0 
        ? competency_ids[0] 
        : null;

      matchesToInsert.push({
        student_id,
        competency_id: primaryCompetencyId,
        apollo_job_id: job.id || `apollo_${Date.now()}_${Math.random()}`,
        apollo_job_title: job.title,
        apollo_company_name: job.company_name || job.organization_name,
        apollo_job_url: job.url || job.application_url,
        apollo_job_payload: job, // Store full job data for rich UI display
        status: 'pending_notification'
      });
    }

    console.log(`Attempting to insert ${matchesToInsert.length} job matches`);

    const { data: insertedMatches, error: insertError } = await supabase
      .from('job_matches')
      .insert(matchesToInsert)
      .select();

    if (insertError) {
      console.error('Job match insert error:', insertError);
      
      // If error is due to duplicate entries, that's ok - return partial success
      if (insertError.code === '23505') {
        console.log('Some job matches already exist for this student - skipping duplicates');
        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'Job matches processed (some duplicates skipped)',
            student_id,
            skills,
            jobs_found: jobs.length,
            matches_created: 0
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw insertError;
    }

    console.log(`Successfully inserted ${insertedMatches?.length || 0} job matches`);

    return new Response(
      JSON.stringify({ 
        success: true,
        student_id,
        skills,
        jobs_found: jobs.length,
        matches_created: insertedMatches?.length || 0,
        sample_jobs: jobs.slice(0, 3).map(j => ({
          title: j.title,
          company: j.company_name,
          url: j.url
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Job matching error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
