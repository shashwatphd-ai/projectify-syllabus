import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

import { corsHeaders, securityHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Starting technology format migration...');
    
    // No auth required - this is a one-time migration tool
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all companies with technologies_used field
    const { data: companies, error: fetchError } = await supabase
      .from('company_profiles')
      .select('id, name, technologies_used');

    if (fetchError) {
      throw new Error(`Failed to fetch companies: ${fetchError.message}`);
    }

    console.log(`📊 Found ${companies?.length || 0} companies to check`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const company of companies || []) {
      try {
        const techs = company.technologies_used;
        
        // Check if technologies_used exists and is an array with objects
        if (Array.isArray(techs) && 
            techs.length > 0 && 
            typeof techs[0] === 'object' && 
            techs[0] !== null) {
          
          console.log(`🔧 Migrating ${company.name}...`);
          console.log(`   Old format: ${JSON.stringify(techs.slice(0, 2))}...`);
          
          // Normalize: Extract 'name' field from objects
          const cleanTech = techs
            .map((t: any) => {
              if (typeof t === 'string') return t;
              return t.name || t.technology || null;
            })
            .filter(Boolean);
          
          console.log(`   New format: ${JSON.stringify(cleanTech.slice(0, 5))}...`);
          
          // Update the record
          const { error: updateError } = await supabase
            .from('company_profiles')
            .update({ technologies_used: cleanTech })
            .eq('id', company.id);
          
          if (updateError) {
            console.error(`❌ Error updating ${company.name}: ${updateError.message}`);
            errorCount++;
          } else {
            migratedCount++;
          }
        } else {
          // Already in correct format or empty
          skippedCount++;
        }
      } catch (err) {
        console.error(`❌ Error processing ${company.name}:`, err);
        errorCount++;
      }
    }

    const summary = {
      success: true,
      total_companies: companies?.length || 0,
      migrated: migratedCount,
      skipped: skippedCount,
      errors: errorCount,
      message: `Migration complete: ${migratedCount} migrated, ${skippedCount} skipped, ${errorCount} errors`
    };

    console.log('\n✅ Migration Summary:', summary);

    return new Response(
      JSON.stringify(summary),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: error.stack 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
