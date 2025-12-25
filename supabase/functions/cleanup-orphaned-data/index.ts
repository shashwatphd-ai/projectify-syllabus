import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CleanupResult {
  orphaned_projects_cleaned: number;
  orphaned_forms_cleaned: number;
  orphaned_metadata_cleaned: number;
  orphaned_queue_entries_cleaned: number;
  expired_cache_cleaned: number;
  stale_generation_runs_cleaned: number;
  total_cleaned: number;
  errors: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('[cleanup-orphaned-data] Starting cleanup job...');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const result: CleanupResult = {
      orphaned_projects_cleaned: 0,
      orphaned_forms_cleaned: 0,
      orphaned_metadata_cleaned: 0,
      orphaned_queue_entries_cleaned: 0,
      expired_cache_cleaned: 0,
      stale_generation_runs_cleaned: 0,
      total_cleaned: 0,
      errors: [],
    };

    // 1. Clean up orphaned projects (missing forms or metadata)
    console.log('[cleanup] Step 1: Cleaning orphaned projects...');
    try {
      const { data: orphanedProjects, error: orphanError } = await supabase
        .rpc('cleanup_orphaned_projects');
      
      if (orphanError) {
        console.error('[cleanup] Error cleaning orphaned projects:', orphanError);
        result.errors.push(`Orphaned projects: ${orphanError.message}`);
      } else if (orphanedProjects && orphanedProjects.length > 0) {
        result.orphaned_projects_cleaned = orphanedProjects[0].cleaned_count || 0;
        console.log(`[cleanup] Cleaned ${result.orphaned_projects_cleaned} orphaned projects`);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[cleanup] Exception cleaning orphaned projects:', err);
      result.errors.push(`Orphaned projects exception: ${errorMessage}`);
    }

    // 2. Clean up orphaned project_forms (where project doesn't exist)
    console.log('[cleanup] Step 2: Cleaning orphaned project forms...');
    try {
      const { count, error: countError } = await supabase
        .from('project_forms')
        .select('id', { count: 'exact', head: true })
        .is('project_id', null);
      
      if (!countError && count && count > 0) {
        const { error: deleteError } = await supabase
          .from('project_forms')
          .delete()
          .is('project_id', null);
        
        if (!deleteError) {
          result.orphaned_forms_cleaned = count;
          console.log(`[cleanup] Cleaned ${count} orphaned project forms`);
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[cleanup] Exception cleaning orphaned forms:', err);
      result.errors.push(`Orphaned forms exception: ${errorMessage}`);
    }

    // 3. Clean up orphaned project_metadata (where project doesn't exist)
    console.log('[cleanup] Step 3: Cleaning orphaned project metadata...');
    try {
      const { count, error: countError } = await supabase
        .from('project_metadata')
        .select('id', { count: 'exact', head: true })
        .is('project_id', null);
      
      if (!countError && count && count > 0) {
        const { error: deleteError } = await supabase
          .from('project_metadata')
          .delete()
          .is('project_id', null);
        
        if (!deleteError) {
          result.orphaned_metadata_cleaned = count;
          console.log(`[cleanup] Cleaned ${count} orphaned project metadata`);
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[cleanup] Exception cleaning orphaned metadata:', err);
      result.errors.push(`Orphaned metadata exception: ${errorMessage}`);
    }

    // 4. Clean up stale queue entries (failed > 24 hours ago)
    console.log('[cleanup] Step 4: Cleaning stale queue entries...');
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: staleQueue, error: queueError } = await supabase
        .from('project_generation_queue')
        .delete()
        .eq('status', 'failed')
        .lt('last_error_at', twentyFourHoursAgo)
        .select('id');
      
      if (queueError) {
        console.error('[cleanup] Error cleaning stale queue:', queueError);
        result.errors.push(`Stale queue: ${queueError.message}`);
      } else {
        result.orphaned_queue_entries_cleaned = staleQueue?.length || 0;
        console.log(`[cleanup] Cleaned ${result.orphaned_queue_entries_cleaned} stale queue entries`);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[cleanup] Exception cleaning stale queue:', err);
      result.errors.push(`Stale queue exception: ${errorMessage}`);
    }

    // 5. Clean up expired company filter cache
    console.log('[cleanup] Step 5: Cleaning expired cache...');
    try {
      const { error: cacheError } = await supabase.rpc('cleanup_expired_cache');
      
      if (cacheError) {
        console.error('[cleanup] Error cleaning expired cache:', cacheError);
        result.errors.push(`Expired cache: ${cacheError.message}`);
      } else {
        console.log('[cleanup] Cleaned expired cache entries');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[cleanup] Exception cleaning expired cache:', err);
      result.errors.push(`Expired cache exception: ${errorMessage}`);
    }

    // 6. Clean up stale generation runs (in_progress for > 1 hour = likely dead)
    console.log('[cleanup] Step 6: Cleaning stale generation runs...');
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data: staleRuns, error: runsError } = await supabase
        .from('generation_runs')
        .update({ 
          status: 'failed', 
          error_message: 'Automatically marked as failed - stuck in progress for over 1 hour',
          error_category: 'timeout',
          completed_at: new Date().toISOString()
        })
        .eq('status', 'in_progress')
        .lt('started_at', oneHourAgo)
        .select('id');
      
      if (runsError) {
        console.error('[cleanup] Error cleaning stale runs:', runsError);
        result.errors.push(`Stale runs: ${runsError.message}`);
      } else {
        result.stale_generation_runs_cleaned = staleRuns?.length || 0;
        console.log(`[cleanup] Marked ${result.stale_generation_runs_cleaned} stale generation runs as failed`);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[cleanup] Exception cleaning stale runs:', err);
      result.errors.push(`Stale runs exception: ${errorMessage}`);
    }

    // Calculate total
    result.total_cleaned = 
      result.orphaned_projects_cleaned +
      result.orphaned_forms_cleaned +
      result.orphaned_metadata_cleaned +
      result.orphaned_queue_entries_cleaned +
      result.expired_cache_cleaned +
      result.stale_generation_runs_cleaned;

    const duration = Date.now() - startTime;
    console.log(`[cleanup-orphaned-data] Completed in ${duration}ms. Total cleaned: ${result.total_cleaned}`);

    return new Response(
      JSON.stringify({
        success: result.errors.length === 0,
        result,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[cleanup-orphaned-data] Fatal error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
