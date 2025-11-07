import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.78.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { project_id, student_id } = await req.json();

    console.log(`[TEST-real-email] Starting test with project_id: ${project_id}, student_id: ${student_id}`);

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // === STEP A: Insert 2 mock job matches ===
    console.log('[TEST-real-email] STEP A: Creating mock job matches...');
    
    const mockMatches = [
      {
        student_id,
        apollo_job_id: `test_real_email_1_${Date.now()}`,
        apollo_job_title: 'Real Email Test Job 1',
        apollo_company_name: 'Microsoft Corporation',
        apollo_job_url: 'https://test.example.com/job1',
        apollo_job_payload: { test: true },
        status: 'pending_notification'
      },
      {
        student_id,
        apollo_job_id: `test_real_email_2_${Date.now()}`,
        apollo_job_title: 'Real Email Test Job 2',
        apollo_company_name: 'Microsoft Corporation',
        apollo_job_url: 'https://test.example.com/job2',
        apollo_job_payload: { test: true },
        status: 'pending_notification'
      }
    ];

    const { data: insertedMatches, error: insertError } = await supabase
      .from('job_matches')
      .insert(mockMatches)
      .select();

    if (insertError) {
      console.error('[TEST-real-email] Error inserting mock matches:', insertError);
      throw insertError;
    }

    console.log(`[TEST-real-email] Successfully inserted ${insertedMatches?.length || 0} mock matches`);

    // === STEP B: Run the "Talent Alert" Logic ===
    console.log('[TEST-real-email] STEP B: Executing Talent Alert logic...');

    // Get the project to find the company_profile_id
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('company_profile_id, company_name')
      .eq('id', project_id)
      .single();

    if (projectError || !project || !project.company_profile_id) {
      console.error('[TEST-real-email] Project lookup error:', projectError);
      throw new Error('Could not find project or project has no associated company');
    }

    console.log(`[TEST-real-email] Found company: ${project.company_name}`);

    // Get the Contact Person for this company
    const { data: contactData, error: contactError } = await supabase
      .from('company_profiles')
      .select('contact_email, contact_first_name')
      .eq('id', project.company_profile_id)
      .single();

    if (contactError || !contactData || !contactData.contact_email) {
      console.error('[TEST-real-email] Contact lookup error:', contactError);
      throw new Error('Could not find contact email for company');
    }

    console.log(`[TEST-real-email] Found contact email: ${contactData.contact_email}`);

    // Send the "Talent Alert" email via Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      console.error('[TEST-real-email] RESEND_API_KEY is not set!');
      throw new Error('RESEND_API_KEY is not configured');
    }

    console.log('[TEST-real-email] Sending real email via Resend API...');

    const subject = "TEST: A student with skills you're hiring for just completed a project";
    const body = `Hi ${contactData.contact_first_name || 'Hiring Manager'},<br/><br/>This is a TEST email from the EduThree platform.<br/><br/>A student just completed a project with skills that match your open job postings.<br/><br/>This is a test of the real email sending functionality.<br/><br/>Best,<br/>The EduThree Team`;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'EduThree Alerts <alerts@eduthree.com>',
        to: contactData.contact_email,
        subject: subject,
        html: body
      })
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error('[TEST-real-email] Resend API error:', errorText);
      throw new Error(`Resend API failed: ${errorText}`);
    }

    const resendData = await resendResponse.json();
    console.log(`[TEST-real-email] ✅ Successfully sent REAL Talent Alert to ${contactData.contact_email}`);
    console.log(`[TEST-real-email] Resend response:`, resendData);

    // Update the status of the matches to 'notified'
    console.log('[TEST-real-email] Updating mock matches to "notified" status...');
    const matchIds = (insertedMatches || []).map(m => m.id);
    const { error: updateError } = await supabase
      .from('job_matches')
      .update({ status: 'notified' })
      .in('id', matchIds);

    if (updateError) {
      console.error('[TEST-real-email] Error updating match status:', updateError);
      throw updateError;
    }

    console.log(`[TEST-real-email] Successfully updated ${matchIds.length} matches to "notified"`);

    // === STEP C: Verify the changes ===
    console.log('[TEST-real-email] STEP C: Verifying updated matches...');
    
    const { data: verifiedMatches, error: verifyError } = await supabase
      .from('job_matches')
      .select('*')
      .in('id', matchIds);

    if (verifyError) {
      console.error('[TEST-real-email] Error verifying matches:', verifyError);
      throw verifyError;
    }

    console.log('[TEST-real-email] Verification complete. All matches have status:', 
      verifiedMatches?.map(m => m.status));

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Real email test completed successfully',
        test_results: {
          matches_created: insertedMatches?.length || 0,
          email_sent_to: contactData.contact_email,
          resend_response: resendData,
          matches_updated: matchIds.length,
          verified_matches: verifiedMatches
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[TEST-real-email] Test failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
