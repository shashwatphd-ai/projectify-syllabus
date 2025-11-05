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
    const systemPrompt = `You are an elite academic-industry partnership strategist with expertise in market validation and value synthesis. 

YOUR CORE MISSION:
1. Cross-validate company challenges against ALL data sources (job postings, technologies, funding, news, inferred needs)
2. Synthesize evidence into crisp, validated insights
3. Present data-driven value narratives for each stakeholder
4. Provide visual-first metrics (scores represent real-world impact, not abstract ratings)

VALIDATION FRAMEWORK:
- Job postings → hiring priorities & skill gaps
- Technologies → technical capabilities & modernization needs
- Funding + stage → growth trajectory & investment areas
- Recent news → strategic pivots & market positioning
- Inferred needs → operational challenges & opportunities

OUTPUT STYLE:
- Be crisp, evidence-backed, and visual-ready
- Each insight must trace back to specific data points
- Scores reflect measurable real-world value (career prospects, hiring likelihood, ROI potential)
- Use marketing-subtle language that's tech-driven and professional`;

    const userPrompt = `SYNTHESIZE & VALIDATE the true partnership value by cross-referencing ALL available data:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 COMPANY INTELLIGENCE SYNTHESIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Organization: ${analysisContext.company.name}
Sector: ${analysisContext.company.sector}
Scale: ${analysisContext.company.size} | ${analysisContext.company.funding_stage || 'Private'} ${analysisContext.company.total_funding ? `($${(analysisContext.company.total_funding / 1000000).toFixed(1)}M raised)` : ''}

MARKET SIGNALS (Cross-validate these):
└─ Active Hiring (${analysisContext.company.job_postings.length} roles):
${analysisContext.company.job_postings.slice(0, 5).map((jp: any) => `   • ${jp.title}${jp.department ? ` (${jp.department})` : ''}`).join('\n')}

└─ Tech Stack (${analysisContext.company.technologies_used.length} technologies):
   ${analysisContext.company.technologies_used.slice(0, 10).join(', ')}

└─ Validated Challenges:
   ${analysisContext.company.inferred_needs.map((need: string) => `• ${need}`).join('\n   ')}

${analysisContext.company.recent_news ? `└─ Recent Context:\n   ${analysisContext.company.recent_news}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎓 PROJECT-COURSE ALIGNMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project: ${analysisContext.project.title}
Scope: ${analysisContext.project.duration_weeks} weeks | ${analysisContext.project.team_size} students | ${analysisContext.project.tier} tier

Deliverables:
${analysisContext.project.deliverables.map((d: string) => `  • ${d}`).join('\n')}

Course Context: ${analysisContext.course.title} (${analysisContext.course.level})
Learning Outcomes: ${analysisContext.course.outcomes.join(' | ')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ANALYSIS REQUIREMENTS:
1. VALIDATE: Does this project address the company's ACTUAL challenges (based on hiring + tech + needs)?
2. QUANTIFY: Scores must reflect real-world outcomes (e.g., "80 career score" = high hiring likelihood based on job postings)
3. SYNTHESIZE: Combine all data points into crisp, evidence-backed narratives
4. VISUAL-READY: All text should be concise enough to display in visual dashboards

Return comprehensive analysis with validated insights.`;

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
                    score: { type: 'number', description: 'Overall student value score 0-100 based on real career outcomes' },
                    career_opportunities_score: { type: 'number', description: 'Based on company hiring signals & job market alignment' },
                    skill_development_score: { type: 'number', description: 'Based on tech stack relevance & industry demand' },
                    portfolio_value_score: { type: 'number', description: 'Based on deliverable quality & market visibility' },
                    networking_score: { type: 'number', description: 'Based on company growth stage & industry connections' },
                    key_benefits: { 
                      type: 'array', 
                      items: { type: 'string' },
                      description: 'Exactly 3 benefits. Each MUST be max 8 words. Evidence-based from job postings/tech stack.',
                      minItems: 3,
                      maxItems: 3
                    },
                    insights: {
                      type: 'string',
                      description: 'Single powerful insight (max 20 words) connecting project to validated career outcomes',
                      maxLength: 120
                    }
                  },
                  required: ['score', 'career_opportunities_score', 'skill_development_score', 'portfolio_value_score', 'networking_score', 'key_benefits', 'insights']
                },
                university_value: {
                  type: 'object',
                  properties: {
                    score: { type: 'number', description: 'Overall university value score 0-100' },
                    partnership_quality_score: { type: 'number', description: 'Based on company credibility & growth trajectory' },
                    placement_potential_score: { type: 'number', description: 'Based on active hiring & job posting alignment' },
                    research_collaboration_score: { type: 'number', description: 'Based on company tech sophistication & innovation needs' },
                    reputation_score: { type: 'number', description: 'Based on company profile & industry standing' },
                    key_benefits: { 
                      type: 'array', 
                      items: { type: 'string' },
                      description: 'Exactly 3 benefits. Each MUST be max 8 words. Focus on institutional strategic value.',
                      minItems: 3,
                      maxItems: 3
                    },
                    insights: {
                      type: 'string',
                      description: 'Single powerful insight (max 20 words) on institutional strategic value',
                      maxLength: 120
                    }
                  },
                  required: ['score', 'partnership_quality_score', 'placement_potential_score', 'research_collaboration_score', 'reputation_score', 'key_benefits', 'insights']
                },
                industry_value: {
                  type: 'object',
                  properties: {
                    score: { type: 'number', description: 'Overall industry partner value score 0-100' },
                    deliverable_roi_score: { type: 'number', description: 'Based on deliverable-need alignment & project scope' },
                    talent_pipeline_score: { type: 'number', description: 'Based on skill alignment with job postings' },
                    innovation_score: { type: 'number', description: 'Based on fresh perspectives on validated challenges' },
                    cost_efficiency_score: { type: 'number', description: 'Based on deliverable value vs. typical consulting costs' },
                    key_benefits: { 
                      type: 'array', 
                      items: { type: 'string' },
                      description: 'Exactly 3 benefits. Each MUST be max 8 words. Quantify business impact where possible.',
                      minItems: 3,
                      maxItems: 3
                    },
                    insights: {
                      type: 'string',
                      description: 'Single powerful insight (max 20 words) on validated business value',
                      maxLength: 120
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
                problem_validation: {
                  type: 'object',
                  properties: {
                    validated_challenges: {
                      type: 'array',
                      items: { type: 'string' },
                      description: '2-3 specific company challenges this project addresses (verified via data)',
                      maxItems: 3
                    },
                    evidence_trail: {
                      type: 'string',
                      description: 'Concise citation (max 30 words) of data points validating the challenges',
                      maxLength: 180
                    },
                    alignment_score: {
                      type: 'number',
                      description: 'How well project deliverables match validated company needs (0-100)'
                    }
                  },
                  required: ['validated_challenges', 'evidence_trail', 'alignment_score']
                },
                faculty_recommendations: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '3-4 crisp action items (max 15 words each)',
                  maxItems: 4
                },
                risk_factors: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '2-3 key risks (max 12 words each)',
                  maxItems: 3
                },
                opportunity_highlights: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '3-4 standout opportunities (max 12 words each)',
                  maxItems: 4
                },
                overall_assessment: {
                  type: 'string',
                  description: 'Executive summary (max 35 words) of the partnership value',
                  maxLength: 210
                }
              },
              required: ['student_value', 'university_value', 'industry_value', 'synergistic_value', 'problem_validation', 'faculty_recommendations', 'risk_factors', 'opportunity_highlights', 'overall_assessment']
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
          problem_validation: valueAnalysis.problem_validation,
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
