import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { project_id, student_id } = await req.json();

    if (!project_id || !student_id) {
      throw new Error('project_id and student_id are required');
    }

    console.log(`[TEST] Starting Talent Alert test for project ${project_id}, student ${student_id}`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the project to fetch company_profile_id
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('company_profile_id, company_name')
      .eq('id', project_id)
      .single();

    if (projectError || !project) {
      throw new Error(`Failed to fetch project: ${projectError?.message}`);
    }

    // STEP A: Create Mock Data - Insert 2 fake job matches
    console.log('[TEST] Step A: Inserting mock job matches...');
    
    const mockMatches = [
      {
        student_id,
        apollo_job_id: 'mock-job-1',
        apollo_job_title: 'Mock Job 1',
        apollo_company_name: 'Test Company',
        apollo_job_url: 'https://example.com/job1',
        status: 'pending_notification',
        apollo_job_payload: { mock: true }
      },
      {
        student_id,
        apollo_job_id: 'mock-job-2',
        apollo_job_title: 'Mock Job 2',
        apollo_company_name: 'Test Company',
        apollo_job_url: 'https://example.com/job2',
        status: 'pending_notification',
        apollo_job_payload: { mock: true }
      }
    ];

    const { data: insertedMatches, error: insertError } = await supabase
      .from('job_matches')
      .insert(mockMatches)
      .select();

    if (insertError) {
      throw new Error(`Failed to insert mock matches: ${insertError.message}`);
    }

    console.log(`[TEST] Step A Complete: Inserted ${insertedMatches?.length || 0} mock matches`);

    // STEP B: Run The "Talent Alert" Logic (EXACT COPY from job-matcher Task 4.8)
    console.log('[TEST] Step B: Running Talent Alert logic...');

    // === TASK 4.8: "TALENT ALERT" SYSTEM ===
    // We have matches! Now, we must alert the employer.
    
    // 1. Get the Contact Person for this company
    const { data: contactData, error: contactError } = await supabase
      .from('company_profiles')
      .select('contact_email, contact_first_name')
      .eq('id', project.company_profile_id)
      .single();

    // 2. Send the email (using Supabase's built-in email or your preferred service)
    // NOTE: This is a placeholder for the real email sending logic
    let alertSent = false;
    if (!contactError && contactData && contactData.contact_email) {
      console.log(`[TEST] SIMULATING EMAIL to ${contactData.contact_email}`);
      // In a real implementation, we would call:
      // await sendEmail({
      //   to: contactData.contact_email,
      //   subject: "A student with skills you're hiring for just completed a project",
      //   body: `Hi ${contactData.contact_first_name || 'Hiring Manager'}, a student just completed a project...`
      // });

      // 3. Update the status of the matches to 'notified'
      const matchIds = (insertedMatches || []).map(m => m.id);
      await supabase
        .from('job_matches')
        .update({ status: 'notified' })
        .in('id', matchIds);
      
      console.log(`[TEST] Successfully sent 'Talent Alert' and updated ${matchIds.length} matches to 'notified'.`);
      alertSent = true;
    } else {
      console.warn('[TEST] Could not find contact email for this company. Skipping talent alert.');
    }
    // ======================================

    console.log('[TEST] Step B Complete: Talent Alert logic executed');

    // STEP C: Verify - Fetch the updated rows
    console.log('[TEST] Step C: Verifying updated rows...');
    
    const { data: verifiedMatches, error: verifyError } = await supabase
      .from('job_matches')
      .select('*')
      .in('id', (insertedMatches || []).map(m => m.id));

    if (verifyError) {
      throw new Error(`Failed to verify matches: ${verifyError.message}`);
    }

    console.log('[TEST] Step C Complete: Verification done');

    return new Response(
      JSON.stringify({
        success: true,
        test_report: {
          step_a_mock_data_created: insertedMatches?.length || 0,
          step_b_talent_alert_executed: alertSent,
          step_b_contact_email_found: contactData?.contact_email || null,
          step_c_verified_matches: verifiedMatches
        },
        verification_criteria: {
          criterion_1_mock_job_title: verifiedMatches?.[0]?.apollo_job_title === 'Mock Job 1',
          criterion_2_status_notified: verifiedMatches?.every((m: any) => m.status === 'notified')
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[TEST] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
