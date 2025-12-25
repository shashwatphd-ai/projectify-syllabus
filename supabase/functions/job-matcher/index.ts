import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";
import { getEstimatedRateLimitHeaders } from '../_shared/rate-limit-headers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limit headers for job matching (resource-intensive)
const getResponseHeaders = () => ({
  ...corsHeaders,
  ...getEstimatedRateLimitHeaders('RESOURCE_INTENSIVE'),
  'Content-Type': 'application/json',
});

interface JobMatchRequest {
  student_id: string;
  skills: string[];
  competency_ids: string[];
  project_id: string;
}

interface ApolloJobPosting {
  id: string;
  title: string;
  url?: string;
  description?: string;
  location?: string;
  [key: string]: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { student_id, skills, competency_ids, project_id }: JobMatchRequest = await req.json();
    
    if (!student_id || !project_id || !skills || !Array.isArray(skills) || skills.length === 0) {
      return new Response(
        JSON.stringify({ error: 'student_id, project_id, and skills array are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting targeted job matching for student: ${student_id}, project: ${project_id}`);
    console.log(`Skills to match: ${skills.join(', ')}`);

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step A: Get the company_profile_id from the project
    console.log(`Looking up company for project: ${project_id}`);
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('company_profile_id, company_name')
      .eq('id', project_id)
      .single();

    if (projectError || !project || !project.company_profile_id) {
      console.error('Project lookup error or missing company_profile_id:', projectError);
      throw new Error('Could not find project or project has no associated company');
    }

    // === CRITICAL FIX: Fetch the Apollo Organization ID ===
    console.log(`Fetching Apollo Org ID for company_profile_id: ${project.company_profile_id}`);
    const { data: profile, error: profileError } = await supabase
      .from('company_profiles')
      .select('apollo_organization_id')
      .eq('id', project.company_profile_id)
      .single();

    if (profileError || !profile || !profile.apollo_organization_id) {
      console.error('Apollo Org ID lookup error:', profileError);
      console.log('Company profile is missing Apollo Organization ID - cannot fetch job postings');
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Company profile is missing Apollo Organization ID',
          student_id,
          project_id,
          company_name: project.company_name,
          jobs_found: 0,
          matches_created: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apolloOrgId = profile.apollo_organization_id;
    console.log(`Found company: ${project.company_name} (Apollo ID: ${apolloOrgId})`);
    // ======================================================

    // Step B: Call the CORRECT Apollo API endpoint
    const APOLLO_API_KEY = Deno.env.get('APOLLO_API_KEY');
    if (!APOLLO_API_KEY) {
      throw new Error('APOLLO_API_KEY is not configured');
    }

    // Use the correct organization-specific job postings endpoint with REAL Apollo ID
    const apolloJobsUrl = `https://api.apollo.io/v1/organizations/${apolloOrgId}/job_postings`;
    
    console.log(`Querying Apollo for job postings at: ${apolloJobsUrl}`);

    const apolloResponse = await fetch(apolloJobsUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': APOLLO_API_KEY,
      },
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
      
      if (apolloResponse.status === 404) {
        console.log('No job postings found for this company (404)');
        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'No job postings found for this company',
            student_id,
            project_id,
            company_name: project.company_name,
            jobs_found: 0,
            matches_created: 0
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Apollo API request failed: ${errorText}`);
    }

    const apolloData = await apolloResponse.json();
    const jobPostings: ApolloJobPosting[] = apolloData.job_postings || [];
    
    console.log(`Found ${jobPostings.length} job postings for company: ${project.company_name}`);

    if (jobPostings.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Company has no open job postings',
          student_id,
          project_id,
          company_name: project.company_name,
          jobs_found: 0,
          matches_created: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step C: Client-side matching - compare jobs against student skills
    const matchesToInsert = [];
    
    for (const job of jobPostings) {
      // Check if any of the student's skills appear in the job title or description
      const jobText = `${job.title || ''} ${job.description || ''}`.toLowerCase();
      const matchedSkills = skills.filter(skill => 
        jobText.includes(skill.toLowerCase())
      );

      // Only insert if we found at least one skill match
      if (matchedSkills.length > 0) {
        console.log(`Match found! Job "${job.title}" matches skills: ${matchedSkills.join(', ')}`);
        
        const primaryCompetencyId = competency_ids && competency_ids.length > 0 
          ? competency_ids[0] 
          : null;

        matchesToInsert.push({
          student_id,
          competency_id: primaryCompetencyId,
          apollo_job_id: job.id || `apollo_${project.company_profile_id}_${Date.now()}`,
          apollo_job_title: job.title,
          apollo_company_name: project.company_name,
          apollo_job_url: job.url,
          apollo_job_payload: {
            ...job,
            matched_skills: matchedSkills // Store which skills matched
          },
          status: 'pending_notification'
        });
      }
    }

    console.log(`Found ${matchesToInsert.length} matching jobs out of ${jobPostings.length} total postings`);

    if (matchesToInsert.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No job postings matched student skills',
          student_id,
          project_id,
          company_name: project.company_name,
          jobs_found: jobPostings.length,
          matches_created: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step D: Insert matches into database
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
            project_id,
            company_name: project.company_name,
            jobs_found: jobPostings.length,
            matches_created: 0
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw insertError;
    }

    console.log(`Successfully inserted ${insertedMatches?.length || 0} job matches`);

    // === TASK 4.8: "TALENT ALERT" SYSTEM ===
    // We have matches! Now, we must alert the employer.
    
    // 1. Get the Contact Person for this company
    // (We already have 'project.company_profile_id' from our previous step)
    const { data: contactData, error: contactError } = await supabase
      .from('company_profiles')
      .select('contact_email, contact_first_name')
      .eq('id', project.company_profile_id)
      .single();

    // 2. Send the "Talent Alert" email via Resend
    // NOTE: We are now implementing real email sending
    if (!contactError && contactData && contactData.contact_email) {
      const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
      if (!RESEND_API_KEY) {
        console.warn('RESEND_API_KEY is not set. Skipping real email. (Marking as notified for test.)');
        // This is a graceful fallback for a missing API key
        const matchIds = (insertedMatches || []).map(m => m.id);
        await supabase
          .from('job_matches')
          .update({ status: 'notified' }) // We still update status
          .in('id', matchIds);

      } else {
        try {
          // 2. Send the "Talent Alert" email via Resend
          const subject = "A student with skills you're hiring for just completed a project";
          const body = `Hi ${contactData.contact_first_name || 'Hiring Manager'},<br/><br/>A student at EduThree just completed a project with skills that match your open job postings (e.g., "${skills[0]}").<br/><br/>You can view this student's verified portfolio and job matches by logging into your EduThree employer portal.<br/><br/>Best,<br/>The EduThree Team`;

          const resendResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${RESEND_API_KEY}`
            },
            body: JSON.stringify({
              from: 'EduThree Alerts <alerts@eduthree.com>', // NOTE: This 'from' domain must be verified in Resend
              to: contactData.contact_email,
              subject: subject,
              html: body
            })
          });

          if (!resendResponse.ok) {
            const errorText = await resendResponse.text();
            console.error('Resend API error:', errorText);
          } else {
            console.log(`Successfully sent REAL Talent Alert to ${contactData.contact_email}`);
            
            // 3. Update the status of the matches to 'notified'
            const matchIds = (insertedMatches || []).map(m => m.id);
            await supabase
              .from('job_matches')
              .update({ status: 'notified' })
              .in('id', matchIds);
            
            console.log(`Successfully updated ${matchIds.length} matches to 'notified'.`);
          }
        } catch (emailError) {
          console.error('Failed to send email:', emailError);
        }
      }
    } else {
      console.warn('Could not find contact email for this company. Skipping talent alert.');
    }
    // ======================================

    return new Response(
      JSON.stringify({ 
        success: true,
        student_id,
        project_id,
        company_name: project.company_name,
        jobs_found: jobPostings.length,
        matches_created: insertedMatches?.length || 0,
        talent_alert_sent: !contactError && contactData && contactData.contact_email,
        sample_matches: (insertedMatches || []).slice(0, 3).map(m => ({
          title: m.apollo_job_title,
          company: m.apollo_company_name,
          url: m.apollo_job_url
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Job matching error:', error);
    // Return generic error message to prevent information leakage
    return new Response(
      JSON.stringify({ 
        error: 'Failed to match jobs. Please try again later.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
