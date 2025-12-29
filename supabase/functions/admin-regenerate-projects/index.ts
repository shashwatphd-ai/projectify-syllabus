import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { securityHeaders } from '../_shared/cors.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Admin Regenerate Projects - Starting');

    // Step 1: Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ No authorization header provided');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Unauthorized: No authorization header' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Step 2: Create client with user's token (NOT service role)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: authHeader } }
      }
    );

    // Step 3: Verify user identity
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('❌ Invalid token:', userError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Unauthorized: Invalid token' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Step 4: Verify admin role using has_role RPC
    const { data: isAdmin, error: roleError } = await supabaseClient
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });

    if (roleError) {
      console.error('❌ Failed to verify admin status:', roleError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to verify admin status' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!isAdmin) {
      console.warn(`⚠️ Unauthorized access attempt by user ${user.id}`);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Unauthorized: Admin privileges required' 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`✅ Admin authorization verified for user ${user.id}`);

    // Step 5: NOW use service role client for actual operations
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Step A: SELECT all AI shell projects
    console.log('📊 Step A: Fetching all AI shell projects...');
    const { data: projects, error: fetchError } = await supabaseService
      .from('projects')
      .select('id, course_id, generation_run_id')
      .eq('status', 'ai_shell');

    if (fetchError) {
      console.error('❌ Error fetching projects:', fetchError);
      throw new Error(`Failed to fetch projects: ${fetchError.message}`);
    }

    if (!projects || projects.length === 0) {
      console.log('✅ No AI shell projects found to regenerate');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No AI shell projects found to regenerate',
          count: 0
        }), 
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`✅ Found ${projects.length} projects to regenerate`);

    // Step B: UPDATE all projects to pending_generation status
    console.log('🔄 Step B: Updating project statuses to pending_generation...');
    const { error: updateError } = await supabaseService
      .from('projects')
      .update({ status: 'pending_generation' })
      .eq('status', 'ai_shell');

    if (updateError) {
      console.error('❌ Error updating project statuses:', updateError);
      throw new Error(`Failed to update project statuses: ${updateError.message}`);
    }

    console.log(`✅ Updated ${projects.length} projects to pending_generation`);

    // Step C: Invoke run-single-project-generation for each project with proper async handling
    console.log('🚀 Step C: Queueing regeneration workers...');
    const functionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/run-single-project-generation`;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Use Promise.allSettled for proper async handling (no more fire-and-forget)
    const regenerationPromises = projects.map(async (project) => {
      try {
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            project_id: project.id,
            course_id: project.course_id,
            generation_run_id: project.generation_run_id,
          }),
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        console.log(`✅ Queued project ${project.id}`);
        return { id: project.id, success: true };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Failed to queue project ${project.id}: ${errorMsg}`);
        return { id: project.id, success: false, error: errorMsg };
      }
    });

    // Wait for all to complete (with timeout protection)
    const results = await Promise.allSettled(regenerationPromises);
    
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failedCount = projects.length - successCount;

    console.log(`✅ Completed: ${successCount} succeeded, ${failedCount} failed`);

    // Step D: Return detailed response
    return new Response(
      JSON.stringify({
        success: true,
        message: `Re-queued ${successCount}/${projects.length} projects for regeneration.`,
        count: projects.length,
        succeeded: successCount,
        failed: failedCount,
        projects: projects.map(p => p.id),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Admin Regenerate Projects Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
