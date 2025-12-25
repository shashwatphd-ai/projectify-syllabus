import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RatingRequest {
  student_id: string;
  project_id: string;
  rating: number; // 1-5
  skill_name?: string; // Optional: rate specific skill
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify user is an employer
    const { data: roles, error: rolesError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'employer');

    if (rolesError || !roles || roles.length === 0) {
      throw new Error('Only employers can rate students');
    }

    const { student_id, project_id, rating, skill_name } = await req.json() as RatingRequest;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    if (!student_id || !project_id) {
      throw new Error('student_id and project_id are required');
    }

    console.log(`⭐ Rating student ${student_id} on project ${project_id}: ${rating}/5`);

    // Verify the employer owns the company linked to this project
    const { data: project, error: projectError } = await supabaseClient
      .from('projects')
      .select('id, company_profile_id, company_name')
      .eq('id', project_id)
      .single();

    if (projectError || !project) {
      throw new Error('Project not found');
    }

    // Check employer owns this company
    const { data: company, error: companyError } = await supabaseClient
      .from('company_profiles')
      .select('id, owner_user_id')
      .eq('id', project.company_profile_id)
      .eq('owner_user_id', user.id)
      .single();

    if (companyError || !company) {
      throw new Error('You can only rate students on your own company projects');
    }

    // Use service role for updating competencies
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if student has competencies for this project
    const { data: existingCompetencies, error: compError } = await supabaseAdmin
      .from('verified_competencies')
      .select('id, skill_name')
      .eq('student_id', student_id)
      .eq('project_id', project_id);

    if (compError) {
      console.error('Error fetching competencies:', compError);
      throw compError;
    }

    let updatedCount = 0;

    if (existingCompetencies && existingCompetencies.length > 0) {
      // Update existing competencies with rating
      if (skill_name) {
        // Rate specific skill
        const { error: updateError } = await supabaseAdmin
          .from('verified_competencies')
          .update({ employer_rating: rating })
          .eq('student_id', student_id)
          .eq('project_id', project_id)
          .eq('skill_name', skill_name);

        if (updateError) throw updateError;
        updatedCount = 1;
      } else {
        // Rate all skills from this project
        const { error: updateError } = await supabaseAdmin
          .from('verified_competencies')
          .update({ employer_rating: rating })
          .eq('student_id', student_id)
          .eq('project_id', project_id);

        if (updateError) throw updateError;
        updatedCount = existingCompetencies.length;
      }
    } else {
      // Create a general competency record for this project
      const { error: insertError } = await supabaseAdmin
        .from('verified_competencies')
        .insert({
          student_id,
          project_id,
          skill_name: skill_name || 'Project Completion',
          employer_rating: rating,
          verification_source: `Employer rating from ${project.company_name}`
        });

      if (insertError) throw insertError;
      updatedCount = 1;
    }

    console.log(`✅ Updated ${updatedCount} competency records with rating ${rating}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Rated ${updatedCount} skill(s) with ${rating}/5`,
        rating,
        updated_count: updatedCount
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('❌ Error in rate-student-performance:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: error.message === 'Unauthorized' ? 401 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
