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
    const { project_id } = await req.json();
    
    if (!project_id) {
      return new Response(
        JSON.stringify({ error: 'project_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Starting competency extraction for project: ${project_id}`);

    // Step A: Fetch project data with course information
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        id,
        title,
        description,
        deliverables,
        tasks,
        sector,
        course_id
      `)
      .eq('id', project_id)
      .eq('status', 'completed')
      .single();

    if (projectError || !project) {
      console.error('Project fetch error:', projectError);
      return new Response(
        JSON.stringify({ 
          error: 'Project not found or not completed',
          details: projectError?.message 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the course to get the owner (student) id
    const { data: course, error: courseError } = await supabase
      .from('course_profiles')
      .select('owner_id')
      .eq('id', project.course_id)
      .single();

    if (courseError || !course) {
      console.error('Course fetch error:', courseError);
      return new Response(
        JSON.stringify({ 
          error: 'Course not found for project',
          details: courseError?.message 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const studentId = course.owner_id;
    console.log(`Processing project for student: ${studentId}`);

    // Step B: Analyze project content with Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build comprehensive project context for AI analysis
    const projectContext = `
Project Title: ${project.title}
Industry Sector: ${project.sector}

Project Description:
${project.description || 'N/A'}

Deliverables:
${JSON.stringify(project.deliverables, null, 2)}

Tasks:
${JSON.stringify(project.tasks, null, 2)}
    `.trim();

    const systemPrompt = `You are a technical skills assessment expert. Your job is to analyze completed student projects and extract specific, verifiable technical and business skills.

Focus on:
- Technical skills (programming languages, tools, frameworks, software)
- Business skills (market research, financial analysis, project management methodologies)
- Data skills (analytics tools, statistical methods, visualization platforms)
- Design skills (design software, prototyping tools, UX methods)

Return 5-7 specific, concrete skills. Use industry-standard terminology (e.g., "Python", "Tableau", "A/B Testing", "SQL", "Agile", "React", "Financial Modeling").

Do NOT include soft skills like "communication" or "teamwork". Only include measurable, verifiable technical competencies.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this completed project and extract the technical skills:\n\n${projectContext}` }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_skills',
              description: 'Extract a list of specific technical and business skills from a project',
              parameters: {
                type: 'object',
                properties: {
                  skills: {
                    type: 'array',
                    items: {
                      type: 'string',
                      description: 'A specific, verifiable technical or business skill'
                    },
                    minItems: 5,
                    maxItems: 7
                  }
                },
                required: ['skills'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_skills' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your Lovable AI workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI analysis failed: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response:', JSON.stringify(aiData, null, 2));

    // Extract skills from tool call response
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'extract_skills') {
      throw new Error('AI did not return skills in expected format');
    }

    const skillsData = JSON.parse(toolCall.function.arguments);
    const extractedSkills: string[] = skillsData.skills;
    
    console.log(`Extracted ${extractedSkills.length} skills:`, extractedSkills);

    // Step C: Insert skills into verified_competencies table
    const competenciesToInsert = extractedSkills.map(skill => ({
      student_id: studentId,
      project_id: project_id,
      skill_name: skill,
      verification_source: 'ai_deliverable_scan',
      employer_rating: null,
      portfolio_evidence_url: null
    }));

    const { data: insertedCompetencies, error: insertError } = await supabase
      .from('verified_competencies')
      .insert(competenciesToInsert)
      .select();

    if (insertError) {
      console.error('Competency insert error:', insertError);
      
      // If error is due to duplicate entries, that's ok - return partial success
      if (insertError.code === '23505') {
        console.log('Some competencies already exist for this project - skipping duplicates');
        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'Competencies processed (some duplicates skipped)',
            project_id,
            skills_extracted: extractedSkills.length
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw insertError;
    }

    console.log(`Successfully inserted ${insertedCompetencies?.length || 0} competencies`);

    // === TASK 4.6: CHAIN THE NEXT FUNCTION ===
    // Now that we have the skills, asynchronously call the job-matcher
    
    // Get the new competency IDs to pass to the matcher
    const competencyIds = (insertedCompetencies || []).map(c => c.id);

    console.log(`Invoking job-matcher for student ${studentId}...`);
    
    // We use 'supabase' (service role) which we already have in this function
    const { error: invokeError } = await supabase.functions.invoke('job-matcher', {
      body: {
        student_id: studentId,
        project_id: project_id,
        skills: extractedSkills,
        competency_ids: competencyIds
      }
    });

    if (invokeError) {
      // CRITICAL: Do NOT fail the whole step.
      // The skills were extracted, that was a success.
      // Log the error but still return a 200.
      console.error('Failed to invoke job-matcher:', invokeError);
    } else {
      console.log('Successfully invoked job-matcher.');
    }
    // ======================================

    return new Response(
      JSON.stringify({ 
        success: true,
        project_id,
        student_id: studentId,
        skills_extracted: extractedSkills.length,
        skills: extractedSkills,
        competencies_created: insertedCompetencies?.length || 0,
        job_matcher_invoked: !invokeError // Add this for our logs
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Competency extraction error:', error);
    // Return generic error message to prevent information leakage
    return new Response(
      JSON.stringify({ 
        error: 'Failed to extract competencies. Please try again later.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
