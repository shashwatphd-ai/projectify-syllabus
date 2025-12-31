import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

import { corsHeaders, securityHeaders } from '../_shared/cors.ts';

/**
 * PHASE 1: Queue Processor
 * 
 * This function processes pending projects in the generation queue.
 * It's designed to be run by pg_cron every minute to process queued projects.
 * 
 * Architecture:
 * 1. Fetch pending queue items (oldest first)
 * 2. For each item, invoke run-single-project-generation
 * 3. Update queue status based on result
 * 4. Handle retries for failed items
 */

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

    console.log('🔄 Starting queue processor...');

    // STEP 1: Fetch pending items (process up to 5 at a time)
    const { data: queueItems, error: fetchError } = await supabaseClient
      .from('project_generation_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(5);

    if (fetchError) {
      console.error('Error fetching queue items:', fetchError);
      throw fetchError;
    }

    if (!queueItems || queueItems.length === 0) {
      console.log('✅ Queue is empty - no items to process');
      return new Response(
        JSON.stringify({ 
          message: 'Queue is empty',
          processed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`📦 Found ${queueItems.length} items to process`);

    // STEP 2: Process each queue item
    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [] as any[]
    };

    for (const item of queueItems) {
      console.log(`\n🔧 Processing project ${item.project_id}...`);
      results.processed++;

      // Mark as processing
      await supabaseClient
        .from('project_generation_queue')
        .update({ 
          status: 'processing',
          started_at: new Date().toISOString(),
          attempts: item.attempts + 1
        })
        .eq('id', item.id);

      try {
        // Invoke the generation function
        console.log(`  → Invoking run-single-project-generation...`);
        const { data, error } = await supabaseClient.functions.invoke(
          'run-single-project-generation',
          {
            body: {
              project_id: item.project_id,
              course_id: item.course_id,
              generation_run_id: item.generation_run_id
            }
          }
        );

        if (error) {
          throw error;
        }

        console.log(`  ✅ Generation completed successfully`);
        
        // Mark as completed
        await supabaseClient
          .from('project_generation_queue')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString(),
            error_message: null
          })
          .eq('id', item.id);

        results.succeeded++;

      } catch (error: any) {
        console.error(`  ❌ Generation failed:`, error);
        
        // Determine if we should retry
        const shouldRetry = item.attempts < item.max_attempts;
        const newStatus = shouldRetry ? 'pending' : 'failed';

        await supabaseClient
          .from('project_generation_queue')
          .update({ 
            status: newStatus,
            error_message: error.message || String(error),
            last_error_at: new Date().toISOString()
          })
          .eq('id', item.id);

        results.failed++;
        results.errors.push({
          project_id: item.project_id,
          error: error.message,
          will_retry: shouldRetry
        });

        console.log(`  → Status: ${newStatus} (attempt ${item.attempts + 1}/${item.max_attempts})`);
      }
    }

    console.log('\n📊 Queue processing summary:');
    console.log(`  - Processed: ${results.processed}`);
    console.log(`  - Succeeded: ${results.succeeded}`);
    console.log(`  - Failed: ${results.failed}`);

    return new Response(
      JSON.stringify(results),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('❌ Queue processor error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to process queue'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});
