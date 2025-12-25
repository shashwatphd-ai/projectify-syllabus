import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { corsHeaders, securityHeaders } from '../_shared/cors.ts';
import { 
  isValidUUID, 
  isInRange, 
  sanitizeString,
  createValidationErrorResponse,
  createMissingFieldResponse,
  createInvalidUUIDResponse
} from '../_shared/input-validation.ts';
import { safeParseRequestBody } from '../_shared/json-parser.ts';

interface RatingRequest {
  student_id: string;
  project_id: string;
  rating: number; // 1-5
  skill_name?: string; // Optional: rate specific skill
}

serve(async (req) => {
  const responseHeaders = { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: responseHeaders }
      );
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
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: responseHeaders }
      );
    }

    // Verify user is an employer
    const { data: roles, error: rolesError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'employer');

    if (rolesError || !roles || roles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Only employers can rate students' }),
        { status: 403, headers: responseHeaders }
      );
    }

    // Parse request body safely
    const parseResult = await safeParseRequestBody<RatingRequest>(req);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: parseResult.error }),
        { status: 400, headers: responseHeaders }
      );
    }

    const { student_id, project_id, rating, skill_name } = parseResult.data;

    // Validate UUID fields
    if (!student_id) {
      return createMissingFieldResponse('student_id');
    }
    if (!isValidUUID(student_id)) {
      return createInvalidUUIDResponse('student_id');
    }

    if (!project_id) {
      return createMissingFieldResponse('project_id');
    }
    if (!isValidUUID(project_id)) {
      return createInvalidUUIDResponse('project_id');
    }

    // Validate rating is within range
    if (rating === undefined || rating === null) {
      return createMissingFieldResponse('rating');
    }
    if (!isInRange(rating, 1, 5)) {
      return createValidationErrorResponse([{
        field: 'rating',
        message: 'Rating must be between 1 and 5',
        code: 'OUT_OF_RANGE'
      }]);
    }

    // Sanitize optional skill_name
    const sanitizedSkillName = skill_name ? sanitizeString(skill_name, 255) : undefined;

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
      if (sanitizedSkillName) {
        // Rate specific skill
        const { error: updateError } = await supabaseAdmin
          .from('verified_competencies')
          .update({ employer_rating: rating })
          .eq('student_id', student_id)
          .eq('project_id', project_id)
          .eq('skill_name', sanitizedSkillName);

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
          skill_name: sanitizedSkillName || 'Project Completion',
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
