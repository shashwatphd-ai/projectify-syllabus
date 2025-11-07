import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  submission_id: string;
  project_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with the user's token for auth check
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Get the user from the token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('Failed to get user:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin using the has_role function
    const { data: isAdminData, error: roleError } = await supabaseClient
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });

    if (roleError) {
      console.error('Failed to check admin role:', roleError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify admin status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isAdminData) {
      console.error('User is not an admin:', user.id);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin privileges required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { submission_id, project_id }: SyncRequest = await req.json();

    if (!submission_id || !project_id) {
      console.error('Missing required fields:', { submission_id, project_id });
      return new Response(
        JSON.stringify({ error: 'Missing required fields: submission_id and project_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting sync process:', { submission_id, project_id, admin_user_id: user.id });

    // Create service role client for database operations
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    // Step A: Fetch employer submission data
    const { data: submission, error: fetchError } = await supabaseService
      .from('employer_interest_submissions')
      .select('*')
      .eq('id', submission_id)
      .single();

    if (fetchError || !submission) {
      console.error('Failed to fetch submission:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Employer submission not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetched submission:', { 
      id: submission.id, 
      company_name: submission.company_name,
      proposed_title: submission.proposed_project_title 
    });

    // Step B: Update the project with submission data
    const projectUpdates: any = {
      company_name: submission.company_name,
      description: submission.project_description,
      status: 'curated_live',
      needs_review: false, // Mark as reviewed since admin is manually curating
    };

    // Only update title if submission has a proposed title
    if (submission.proposed_project_title) {
      projectUpdates.title = submission.proposed_project_title;
    }

    const { data: updatedProject, error: projectError } = await supabaseService
      .from('projects')
      .update(projectUpdates)
      .eq('id', project_id)
      .select()
      .single();

    if (projectError) {
      console.error('Failed to update project:', projectError);
      return new Response(
        JSON.stringify({ error: 'Failed to update project', details: projectError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Updated project:', { id: updatedProject.id, title: updatedProject.title });

    // Step C: Link the submission to the project
    const { data: updatedSubmission, error: submissionError } = await supabaseService
      .from('employer_interest_submissions')
      .update({ 
        matched_project_id: project_id,
        status: 'matched' // Update status to indicate it's been matched
      })
      .eq('id', submission_id)
      .select()
      .single();

    if (submissionError) {
      console.error('Failed to update submission:', submissionError);
      return new Response(
        JSON.stringify({ error: 'Failed to link submission to project', details: submissionError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully synced submission to project:', {
      submission_id,
      project_id,
      matched_at: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Successfully synced employer lead with AI project shell',
        data: {
          project: updatedProject,
          submission: updatedSubmission
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error in sync-project-match:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
