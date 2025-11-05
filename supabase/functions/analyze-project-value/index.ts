import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValueAnalysisRequest {
  projectId: string;
  companyProfile: any;
  projectData: any;
  courseProfile: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectId, companyProfile, projectData, courseProfile }: ValueAnalysisRequest = await req.json();
    
    console.log(`📊 Analyzing value for project: ${projectId}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Prepare context for AI analysis
    const analysisContext = {
      company: {
        name: companyProfile.name,
        sector: companyProfile.sector,
        size: companyProfile.organization_employee_count || companyProfile.size,
        funding_stage: companyProfile.funding_stage,
        total_funding: companyProfile.total_funding_usd,
        job_postings: companyProfile.job_postings || [],
        technologies_used: companyProfile.technologies_used || [],
        inferred_needs: companyProfile.inferred_needs || [],
        recent_news: companyProfile.recent_news
      },
      project: {
        title: projectData.title,
        tasks: projectData.tasks,
        deliverables: projectData.deliverables,
        duration_weeks: projectData.duration_weeks,
        team_size: projectData.team_size,
        tier: projectData.tier
      },
      course: {
        title: courseProfile.title,
        level: courseProfile.level,
        outcomes: courseProfile.outcomes,
        artifacts: courseProfile.artifacts
      }
    };

    // AI-Powered Value Analysis using Lovable AI
    const systemPrompt = `You are an expert in academic-industry partnership value analysis. Analyze the provided project data and generate stakeholder-specific value assessments with deep market insights.

Focus on:
1. STUDENT VALUE: Career opportunities, skill development aligned with market demand, portfolio building, networking potential
2. UNIVERSITY VALUE: Partnership quality, student placement potential, research collaboration, institutional reputation
3. INDUSTRY VALUE: Deliverable ROI, talent pipeline access, innovation infusion, cost efficiency
4. SYNERGISTIC VALUE: Knowledge transfer multipliers, long-term partnership potential, innovation ecosystem benefits

Provide specific, data-driven insights based on the actual market signals (job postings, funding, technologies, needs).`;

    const userPrompt = `Analyze this academic-industry partnership project and provide stakeholder-specific value assessments:

COMPANY PROFILE:
- Name: ${analysisContext.company.name}
- Sector: ${analysisContext.company.sector}
- Size: ${analysisContext.company.size}
- Funding: ${analysisContext.company.funding_stage || 'Unknown'} ${analysisContext.company.total_funding ? `($${(analysisContext.company.total_funding / 1000000).toFixed(1)}M total)` : ''}
- Active Job Postings: ${analysisContext.company.job_postings.length} open roles
  ${analysisContext.company.job_postings.slice(0, 3).map((jp: any) => `  • ${jp.title}`).join('\n')}
- Technologies: ${analysisContext.company.technologies_used.slice(0, 8).join(', ')}
- Identified Needs: ${analysisContext.company.inferred_needs.join('; ')}
${analysisContext.company.recent_news ? `- Recent Activity: ${analysisContext.company.recent_news}` : ''}

PROJECT DETAILS:
- Title: ${analysisContext.project.title}
- Duration: ${analysisContext.project.duration_weeks} weeks
- Team: ${analysisContext.project.team_size} students
- Tier: ${analysisContext.project.tier}
- Tasks: ${analysisContext.project.tasks.join('; ')}
- Deliverables: ${analysisContext.project.deliverables.join('; ')}

COURSE CONTEXT:
- Title: ${analysisContext.course.title}
- Level: ${analysisContext.course.level}
- Learning Outcomes: ${analysisContext.course.outcomes.join('; ')}

Return a comprehensive value analysis with specific scores (0-100) and detailed reasoning.`;

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
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'analyze_partnership_value',
            description: 'Analyze academic-industry partnership value for all stakeholders',
            parameters: {
              type: 'object',
              properties: {
                student_value: {
                  type: 'object',
                  properties: {
                    score: { type: 'number', description: 'Overall student value score 0-100' },
                    career_opportunities_score: { type: 'number' },
                    skill_development_score: { type: 'number' },
                    portfolio_value_score: { type: 'number' },
                    networking_score: { type: 'number' },
                    key_benefits: { 
                      type: 'array', 
                      items: { type: 'string' },
                      description: 'Specific benefits for students based on market data'
                    },
                    insights: {
                      type: 'string',
                      description: 'Deep analysis of why this project is valuable for students'
                    }
                  },
                  required: ['score', 'career_opportunities_score', 'skill_development_score', 'portfolio_value_score', 'networking_score', 'key_benefits', 'insights']
                },
                university_value: {
                  type: 'object',
                  properties: {
                    score: { type: 'number', description: 'Overall university value score 0-100' },
                    partnership_quality_score: { type: 'number' },
                    placement_potential_score: { type: 'number' },
                    research_collaboration_score: { type: 'number' },
                    reputation_score: { type: 'number' },
                    key_benefits: { 
                      type: 'array', 
                      items: { type: 'string' }
                    },
                    insights: {
                      type: 'string',
                      description: 'Deep analysis of strategic value for the university'
                    }
                  },
                  required: ['score', 'partnership_quality_score', 'placement_potential_score', 'research_collaboration_score', 'reputation_score', 'key_benefits', 'insights']
                },
                industry_value: {
                  type: 'object',
                  properties: {
                    score: { type: 'number', description: 'Overall industry partner value score 0-100' },
                    deliverable_roi_score: { type: 'number' },
                    talent_pipeline_score: { type: 'number' },
                    innovation_score: { type: 'number' },
                    cost_efficiency_score: { type: 'number' },
                    key_benefits: { 
                      type: 'array', 
                      items: { type: 'string' }
                    },
                    insights: {
                      type: 'string',
                      description: 'Deep analysis of business value for the company'
                    }
                  },
                  required: ['score', 'deliverable_roi_score', 'talent_pipeline_score', 'innovation_score', 'cost_efficiency_score', 'key_benefits', 'insights']
                },
                synergistic_value: {
                  type: 'object',
                  properties: {
                    index: { type: 'number', description: 'Synergistic value index 0-100' },
                    knowledge_transfer_multiplier: { type: 'number' },
                    innovation_potential_score: { type: 'number' },
                    long_term_partnership_score: { type: 'number' },
                    ecosystem_impact_score: { type: 'number' },
                    key_synergies: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Specific ways both parties win together'
                    },
                    insights: {
                      type: 'string',
                      description: 'Analysis of multiplicative value created through collaboration'
                    }
                  },
                  required: ['index', 'knowledge_transfer_multiplier', 'innovation_potential_score', 'long_term_partnership_score', 'ecosystem_impact_score', 'key_synergies', 'insights']
                },
                faculty_recommendations: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Actionable recommendations for faculty to maximize project success'
                },
                risk_factors: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Potential risks or challenges to be aware of'
                },
                opportunity_highlights: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Key opportunities this partnership presents'
                },
                overall_assessment: {
                  type: 'string',
                  description: 'Executive summary of the partnership value proposition'
                }
              },
              required: ['student_value', 'university_value', 'industry_value', 'synergistic_value', 'faculty_recommendations', 'risk_factors', 'opportunity_highlights', 'overall_assessment']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'analyze_partnership_value' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const valueAnalysis = JSON.parse(toolCall.function.arguments);
    console.log('✓ Value analysis completed:', valueAnalysis);

    // Store results in database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: updateError } = await supabase
      .from('project_metadata')
      .update({
        value_analysis: {
          student_value: valueAnalysis.student_value,
          university_value: valueAnalysis.university_value,
          industry_value: valueAnalysis.industry_value,
          synergistic_value: valueAnalysis.synergistic_value,
          generated_at: new Date().toISOString()
        },
        stakeholder_insights: {
          faculty_recommendations: valueAnalysis.faculty_recommendations,
          risk_factors: valueAnalysis.risk_factors,
          opportunity_highlights: valueAnalysis.opportunity_highlights,
          overall_assessment: valueAnalysis.overall_assessment
        },
        partnership_quality_score: valueAnalysis.university_value.partnership_quality_score,
        synergistic_value_index: valueAnalysis.synergistic_value.index
      })
      .eq('project_id', projectId);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis: valueAnalysis
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in analyze-project-value:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
